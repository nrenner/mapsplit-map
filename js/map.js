require('osm-pbf-leaflet');
require('leaflet-tilelayer-vector');
require('../lib/Permalink.js');
require('../lib/Leaflet.zoomslider/src/L.Control.Zoomslider.js');
require('../lib/Leaflet.zoomdisplay/leaflet.zoomdisplay.js');
var popup = require('./popup.js');
    
var map;
var baseLayer;
var vectorTileLayer;
var tileDebugLayer;
var visibility = 'visible';

/**
 * Changes the visibility for all features (supporting hover only)
 * 
 * @param {string} 'visible' | 'hidden'
 */
var updateVisibility = function(aVisibility) {
    visibility = aVisibility;
    if (map._pathRoot) {
        if (visibility === 'hidden') {
            map.addLayer(baseLayer, true);
            baseLayer.bringToBack();
            //map.removeLayer(tileDebugLayer);
        } else {
            map.removeLayer(baseLayer);
            //map.addLayer(tileDebugLayer);
        }
        
        // does not work as expected in Chrome (v26): 
        // when svg root is hidden, setting visible on child has no effect
        //map._pathRoot.setAttribute('visibility', visibility);
        var children = map._pathRoot.childNodes;
        for (var i = 0; i < children.length; i++) {
            children[i].setAttribute('visibility', aVisibility);
        }
        map._pathRoot.setAttribute('pointer-events', 'painted');
    } else {
        console.warn('Could not set visibility');
    }
};

function init() {

    map = L.map('map');
    map.setView([47.7223, 9.3854], 14);
    map.addControl(new L.Control.Permalink({text: 'Permalink'}));

    baseLayer = new L.OSM.Mapnik();

    var pointStyle = {
        radius: 4,
        fillColor: "#ff7800",
        color: "#000",
        weight: 1,
        opacity: 1,
        fillOpacity: 0.8
    };
    var lineStyle = {
        weight: 4,
        opacity: 0.7
    };
    var polygonStyle = {
        weight: 2,
        color: "#999",
        opacity: 1,
        fillColor: "#B0DE5C",
        fillOpacity: 0.5
    };
    var styles = {
        node: pointStyle,
        way: lineStyle,
        area: polygonStyle
    };

    var hoverStyle = {
        color: 'red',
        fillColor: 'red' /*,
        visibility: 'visible' */
    };
    var bindHover = function(feature, layer) {
        layer.on('mouseover', function() {
            layer.defaultOptions = layer.options; 
            layer.setStyle(hoverStyle);
            layer._path.setAttribute('visibility', 'visible');
        });
        layer.on('mouseout', function(evt) {
            // TODO resetStyle for L.OSM.DataLayer? (has styles instead of style)
            //layer.resetStyle(evt.target);
            L.Util.extend(layer.options, layer.defaultOptions);
            layer._updateStyle();
            layer._path.setAttribute('visibility', 'inherit');
        });
    };

    var bindPopup = function(feature, layer) {
            // TODO create content on-demand, not for all features in advance?
            var popupContent = popup.getFeatureInfoHtml(feature);
            layer.bindPopup(popupContent, {offset:new L.Point(0,0)});
            layer.bindLabel(popupContent);
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
        return map.getZoom() >= 17 
            || !(noTags || tags.building || allKeys(tags, 'building') || allKeys(tags, 'roof:') 
                || allKeys(tags, 'addr:') || tags.natural === 'tree' || tags.highway === 'street_lamp');   
    };

    var vectorOptions = {
        filter: filter,
        styles: styles,
        onEachFeature: function(feature, layer) {
            bindHover(feature, layer);
            bindPopup(feature, layer);
            layer.on('add', function(evt) {
                evt.target._container.setAttribute('visibility', visibility);
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
        layerFactory: L.osmPbf,
        // fixed zoom level 13 for Mapsplit tiles (resize all other levels)
        serverZooms: [13],
        minZoom: 13
    };
    
    var vectorTileLayer = new L.TileLayer.Vector.Unclipped("tiles/{x}_{y}.pbf", tileOptions, vectorOptions);
    /*
    vectorTileLayer.on('load', function() {
        //console.log('===== loaded ======');
        var tilesKeys = Object.keys(vectorTileLayer._tiles);
        console.log('_tiles (' + tilesKeys.length + '): ' + tilesKeys);
    });
    map.on('moveend', function() {
        console.log('----- moveend -----');
    });
    */
    map.addLayer(vectorTileLayer);
    
    new L.TileLayer.Progress(vectorTileLayer).addTo(map);

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
