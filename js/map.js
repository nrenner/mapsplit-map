// TODO split osm-pbf-leaflet into separate projects
//require('osm-pbf-leaflet');
require('../node_modules/osm-pbf-leaflet/lib/OSMReader.js');
require('../node_modules/osm-pbf-leaflet/lib/leaflet-osm.js');
require('leaflet-tilelayer-vector');
require('../lib/leaflet-plugins/Permalink.js');
require('../lib/leaflet-plugins/Permalink.Layer.js');
require('../lib/Leaflet.zoomslider/src/L.Control.Zoomslider.js');
require('./L.Control.Zoomslider-patch.js');
require('../lib/Leaflet.zoomdisplay/leaflet.zoomdisplay.js');
require('./Control.Progress');
// TODO revisit (replaced with app.updateZoomHint)
//require('./Control.ZoomInfo.js');
require('./PbfWorker.js');
require('./Path._updatePathViewport.js');

// extract MapCSS parser from Overpass Turbo, originally from iD
// http://www.openstreetmap.org/user/tyr_asd/diary/19043
//require('../bower_components/overpass-ide/js/jsmapcss/styleparser.js');
window.styleparser = {};
require('../bower_components/overpass-ide/js/jsmapcss/Condition.js');
require('../bower_components/overpass-ide/js/jsmapcss/Rule.js');
require('../bower_components/overpass-ide/js/jsmapcss/RuleChain.js');
require('../bower_components/overpass-ide/js/jsmapcss/Style.js');
require('../bower_components/overpass-ide/js/jsmapcss/StyleChooser.js');
require('../bower_components/overpass-ide/js/jsmapcss/StyleList.js');
require('../bower_components/overpass-ide/js/jsmapcss/RuleSet.js');
require('./MapCSS.js');
var styleURLs = require('../mapcss/styles.js');

var popup = require('./popup.js');
var miniMap = require('./minimap.js');
    
var map;
var baseLayer;
var emptyBaseLayer;
var vectorTileLayer;
var tileDebugLayer;
var layerControl;
var visibility = 'visible';
var baseLayerActive = null;
var landuse = true;
// Vector layer of the currently open popup, null if none.
var activePopupLayer = null;
var mapCSSParser;
var mapcss;

/**
 * Changes the visibility for all features (supporting hover only)
 * 
 * @param {string} 'visible' | 'hidden'
 */
var updateVisibility = function(aVisibility) {
    var container = map.getRenderer(vectorTileLayer)._container;

    visibility = aVisibility;
    if (visibility === 'hidden') {
        activateBaseLayer();
    } else {
        restoreBaseLayer();
    }
    
    if (L.Path.CANVAS) {
        container.style.visibility = aVisibility;
    } else {
        // does not work as expected in Chrome (v26): 
        // when svg root is hidden, setting visible on child has no effect
        //map._pathRoot.setAttribute('visibility', visibility);
        var children = container.childNodes;
        for (var i = 0; i < children.length; i++) {
            setPathVisibility(children[i], aVisibility);
        }
    }
};

var activateBaseLayer = function() {
    baseLayerActive = map.hasLayer(baseLayer);
    if (!baseLayerActive) {
        map.addLayer(baseLayer);
        map.removeLayer(emptyBaseLayer);
    }
};

var restoreBaseLayer = function() {
    if (baseLayerActive !== null && !baseLayerActive) {
        map.removeLayer(baseLayer);
        map.addLayer(emptyBaseLayer);
    }
};

var setPathVisibility = function(pathEle, aVisibility) {
    if (pathEle) {
        pathEle.setAttribute('visibility', aVisibility);
    }
};

var showLanduse = function(aLanduse) {
    landuse = aLanduse;
    vectorTileLayer.redraw();
};

var loadStyle = function(name) {
    var url = styleURLs[name];
    if (!url) {
        return null;
    }
    return L.MapCSS.load(url); 
};

var applyStyle = function(aMapcss) {
    mapcss = aMapcss;
    mapCSSParser.parse(mapcss);
    vectorTileLayer.redraw();
};

function init() {

    map = L.map('map', {
        minZoom: 5,
        maxZoom: 19,
        // disable keyboard, L.Map.Keyboard._onMouseDown slow (?)
        keyboard: false,
        // disable force/kinetic dragging, not recognizable with many vectors, sometimes too fast
        inertia: false,
        // ignored by MiniMap > reset setView in minimap.js
        //reset: true,
        //animate: false
        // TODO workaround: map and MiniMap cannot share singleton root container 
        // (L.SVG.instance in Map.getRenderer in Renderer.js)
        renderer: L.svg({
            // enlarge vector clip bounds, restricted by tile bounds, 
            // see Path._updatePathViewport.js
            padding: 1
        })
    });
    map.setView([52.4859, -1.88935], 16);
    //map.addControl(new L.Control.ZoomInfo());

    emptyBaseLayer = L.layerGroup();
    baseLayer = new L.OSM.Mapnik({ 
        attribution: 'map &copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
    });

    function resetStyle(layer, highlight) {
        var style = layer.feature.__style;
        if (style) {
            delete layer.feature.__style;
        } else {
            // re-call style handler to eventually modify the style of the clicked feature
            style = vectorOptions.style(layer.feature, highlight);
        }
        L.extend(style, {
            pointerEvents: 'painted'
        });
        if (typeof layer.eachLayer !== "function") {
            if (typeof layer.setStyle === "function")
                layer.setStyle(style); // other objects (pois, ways)
        } else
            layer.eachLayer(function(l) {l.setStyle(style);}); // for multipolygons!
    }

    var bindHover = function(feature, layer) {
        layer.on('mouseover', function(evt) {
            resetStyle(layer, true);
            setPathVisibility(this._path, 'visible');

            // lazy label binding for better performance
            // (registering less events + creating less objects on tile load)
            var popupContent = popup.getFeatureInfoHtml(this.feature);
            if (!this._label) {
                this.bindLabel(popupContent);
                this._showLabel(evt);
            }
        }, layer);
        layer.on('mouseout', function(evt) {
            // TODO resetStyle for L.OSM.DataLayer? (has styles instead of style)
            //layer.resetStyle(evt.target);

            // already selected for popup?
            if (!(activePopupLayer && L.stamp(layer) === L.stamp(activePopupLayer))) {
               resetStyle(layer, false);
            }
            setPathVisibility(this._path, visibility);
        }, layer);
    };

    var bindPopup = function(feature, layer) {
        layer.on('click', function(evt) {
            // lazy popup binding for better performance
            // (registering less events + creating less objects on tile load)
            var popupContent = popup.getFeatureInfoHtml(this.feature);
            this.bindPopup(popupContent, {offset:new L.Point(0,0)});
            this._openPopup(evt);
        }, layer);
    };

    map.on("popupopen popupclose",function(e) {
        if (typeof e.popup._source !== "undefined") {
            var layer = e.popup._source;
            var highlight = e.type === "popupopen";
            activePopupLayer = highlight ? layer : null;
            resetStyle(layer, highlight);
        }
    });

    function mockOsmtogeojsonFeature(feature) {
        // TODO hack for MapCSS because of difference in osmtogeojson and leaflet-osm derived features
        if (!feature.properties) {
            feature.properties = feature;
            feature.properties.relations = [];
            var geometryType = null;
            if (feature.type === 'node') {
                geometryType = 'Point';
            } else {
                geometryType = feature.area ? 'Polygon' : 'LineString';
            }
            feature.geometry = { type: geometryType };
        }
    }

    // true keeps feature, false discards
    var filter = function(feature) {
        mockOsmtogeojsonFeature(feature);

        var style = vectorOptions.style(feature);
        // pass style to resetStyle (onEachFeature)
        feature.__style = style;

        var tags = feature.tags,
            noTags = Object.keys(tags).length === 0;

        return style !== null
            && (landuse || !(feature.area && (tags.landuse || tags.natural || tags.leisure)));
    };

    var vectorOptions = {
        // styles + pointToLayer options set later by MapCSS
        filter: filter,
        onEachFeature: function(feature, layer) {
            bindHover(feature, layer);
            bindPopup(feature, layer);
            layer.on('add', function(evt) {
                setPathVisibility(evt.target._path, visibility);
            });
            
            // TODO style/setStyle should be called in addData, but leaflet-osm
            // passes option.styles property to constructor
            resetStyle(layer);
        }
    };
                         
    mapCSSParser = new L.MapCSS(map, {
        // no default style to filter out non-matching features, see filter function
        defaultStyle: ""
    });
    mapcss = loadStyle('default');
    mapCSSParser.parse(mapcss);
    mapCSSParser.extendWithStyleOptions(vectorOptions);

    var tileOptions = {
        // remove tiles outside viewport
        unloadInvisibleTiles: true,
        // no tile loading while panning, too slow with large vector tiles
        updateWhenIdle: true,
        // unique feature key function, for filtering duplicate features contained in multiple tiles
        unique: function(feature) {
            return feature.type.substr(0,1) + feature.id; 
        },
        // factory function for creating the actual vector layer, default is L.geoJson
        // PBF parsing done in worker, use default layer here to avoid dependency in main bundle
        //layerFactory: L.osmPbf
        layerFactory: function(data, options) {
            return new L.OSM.DataLayer(data, options);
        },
        ajax: L.Request.binaryGet,
        // web worker
        workerFactory: L.pbfWorker,
        //workerFactory: L.noWorker,
        // fixed zoom level 13 for Mapsplit tiles (resize all other levels)
        serverZooms: [13],
        minZoom: 13,
        maxZoom: 19,
        attribution: 'data &copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors, '
            + 'licensed under <a href="http://opendatacommons.org/licenses/odbl/">ODbL</a>'
    };
    
    vectorTileLayer = new L.TileLayer.Vector.Unclipped("tiles/{x}_{y}.pbf", tileOptions, vectorOptions);
    /*
    vectorTileLayer.on('loading', function() {
        console.time('load');
        timer.reset();
    });
    vectorTileLayer.on('load', function() {
        console.timeEnd('load');
        timer.report();
        //var tilesKeys = Object.keys(vectorTileLayer._tiles);
        //console.log('_tiles (' + tilesKeys.length + '): ' + tilesKeys);
    });
    map.on('moveend', function() {
        console.log('----- moveend -----');
    });
    */

    // hack for Path_updatePathViewport.js
    map._vectorTileLayer = vectorTileLayer;

    map.addControl(new L.Control.Progress(vectorTileLayer, {div: 'progress-container'}));
    map.addLayer(vectorTileLayer);

    var progressLayer = new L.TileLayer.Progress(vectorTileLayer).addTo(map);
    var debugLayer = new L.TileLayer.Debug(vectorTileLayer);

    layerControl = L.control.layers({
        'OSM Mapnik': baseLayer,
        'no base layer': emptyBaseLayer
    }, {
        'Vector Tiles': vectorTileLayer,
        'Loading Tiles': progressLayer,
        'Debug': debugLayer
    }).addTo(map);
    baseLayer.addTo(map);

    map.addControl(new L.Control.Permalink({
        text: 'Permalink',
        layers: layerControl
    }));

    // MiniMap (overview map)
    miniMap.init(map);
    
    /*
    // debug layer, from: 
    // http://blog.mathieu-leplatre.info/leaflet-tiles-in-lambert-93-projection-2154.html
    tileDebugLayer = L.tileLayer.canvas();
    tileDebugLayer.drawTile = function(canvas, tilePoint, zoom) {
        var ctx = canvas.getContext('2d');
        ctx.strokeStyle = ctx.fillStyle = "red";
        ctx.rect(0,0, 256,256);
        ctx.stroke();
        ctx.fillText('' + tilePoint.x + '_' + tilePoint.y,5,10);
    };
    map.addLayer(tileDebugLayer);
    */
}

init();

exports.updateVisibility = updateVisibility;
exports.showLanduse = showLanduse;
exports.map = map;
exports.activateBaseLayer = activateBaseLayer;
exports.restoreBaseLayer = restoreBaseLayer;
exports.loadStyle = loadStyle;
exports.applyStyle = applyStyle;
exports.mapcss = mapcss;
