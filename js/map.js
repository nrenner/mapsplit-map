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
//require('./Control.ZoomInfo.js');
require('./PbfWorker.js');
require('./Path._updatePathViewport.js');

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

/**
 * Changes the visibility for all features (supporting hover only)
 * 
 * @param {string} 'visible' | 'hidden'
 */
var updateVisibility = function(aVisibility) {
    visibility = aVisibility;
    if (visibility === 'hidden') {
        activateBaseLayer();
    } else {
        restoreBaseLayer();
    }
    
    if (L.Path.CANVAS) {
        map._pathRoot.style.visibility = aVisibility;
    } else {
        // does not work as expected in Chrome (v26): 
        // when svg root is hidden, setting visible on child has no effect
        //map._pathRoot.setAttribute('visibility', visibility);
        var children = map._pathRoot.childNodes;
        for (var i = 0; i < children.length; i++) {
            setPathVisibility(children[i], aVisibility);
        }
        map._pathRoot.setAttribute('pointer-events', 'painted');
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

function init() {

    // enlarge vector clip bounds, restricted by tile bounds, 
    // see Path._updatePathViewport.js
    L.Path.CLIP_PADDING = 1;
    
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
    });
    map.setView([52.4859, -1.88935], 16);
    //map.addControl(new L.Control.ZoomInfo());

    emptyBaseLayer = L.layerGroup();
    baseLayer = new L.OSM.Mapnik({ 
        attribution: 'map &copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
    });

    var colors = {
        // Leaflet colors (http://leafletjs.com/examples/geojson.html)
        polygon: '#b0de5c',
        line: '#0033ff',
        point: '#ff7800',
        hover: 'red'
    };

    var pointStyle = {
        radius: 4,
        fillColor: colors.point,
        color: "#000",
        weight: 1,
        opacity: 1,
        fillOpacity: 0.8
    };
    var lineStyle = {
        weight: 4,
        opacity: 0.7,
        color: colors.line
    };
    var polygonStyle = {
        weight: 2,
        color: "#999",
        opacity: 1,
        fillColor: colors.polygon,
        fillOpacity: 0.5
    };
    var styles = {
        node: pointStyle,
        way: lineStyle,
        area: polygonStyle
    };

    var getHoverStyle = function(layer) {
        return {
            weight: layer.options.weight + 1,
            color: colors.hover,
            fillColor: colors.hover
        };
    };
    var bindHover = function(feature, layer) {
        layer.on('mouseover', function(evt) {
            if (!this.defaultOptions) {
                this.defaultOptions = this.options;
            }
            this.setStyle(getHoverStyle(this));
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
            L.Util.extend(this.options, this.defaultOptions);
            this.setStyle(this.options);
            setPathVisibility(this._path, 'inherit');
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

    function allKeys(tags, start) {
        for (key in tags) {
            if (!(start === key.substr(0, start.length))) {
                return false;
            }
        }
        return true;
    }
    
    // true keeps feature, false discards
    var filter = function(feature) {
        var tags = feature.tags,
            noTags = Object.keys(tags).length === 0;
        return (map.getZoom() >= 17 
            || !(noTags || tags.building || allKeys(tags, 'building') || allKeys(tags, 'roof:') 
                || allKeys(tags, 'addr:') || tags.natural === 'tree' || tags.highway === 'street_lamp'
                || tags.barrier === 'fence' || tags['building:demolished'] === 'yes'))
            && (map.getZoom() >= 15 || !(feature.type === 'node') || tags.place)
            && (landuse || !(feature.area && (tags.landuse || tags.natural || tags.leisure)));
    };

    var vectorOptions = {
        filter: filter,
        styles: styles,
        onEachFeature: function(feature, layer) {
            bindHover(feature, layer);
            bindPopup(feature, layer);
            layer.on('add', function(evt) {
                setPathVisibility(evt.target._container, visibility);
            });
        }
    };

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
