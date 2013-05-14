require('osm-pbf-leaflet');
require('leaflet-tilelayer-vector');
var popup = require('./popup.js');
    
var map;
var vectorTileLayer;

/**
 * Changes the visibility for all features (supporting hover only)
 * 
 * @param {string} 'visible' | 'hidden'
 */
var updateVisibility = function(visibility) {
    if (map._pathRoot) {
        // does not work as expected in Chrome (v26): 
        // when svg root is hidden, setting visible on child has no effect
        //map._pathRoot.setAttribute('visibility', visibility);
        var children = map._pathRoot.childNodes;
        for (var i = 0; i < children.length; i++) {
            children[i].setAttribute('visibility', visibility);
        }
        map._pathRoot.setAttribute('pointer-events', 'painted');
    } else {
        console.warn('Could not set visibility');
    }
};

function init() {

    map = L.map('map');
    map.setView([47.7223, 9.3854], 13);

    new L.OSM.Mapnik().addTo(map);

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
    };

    var filter = function(feature) {
        return !feature.tags.building;
    };

    var vectorOptions = {
        filter: filter,
        styles: styles,
        onEachFeature: function(feature, layer) {
            bindHover(feature, layer);
            bindPopup(feature, layer);
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
        layerFactory: L.osmPbf
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

    // debug layer, from: 
    // http://blog.mathieu-leplatre.info/leaflet-tiles-in-lambert-93-projection-2154.html
    var tileDebugLayer = L.tileLayer.canvas();
    tileDebugLayer.drawTile = function(canvas, tilePoint, zoom) {
        var ctx = canvas.getContext('2d');
        ctx.strokeStyle = ctx.fillStyle = "red";
        ctx.rect(0,0, 256,256);
        ctx.stroke();
        ctx.fillText('(' + tilePoint.x + ', ' + tilePoint.y + ')',5,10);
    };
    map.addLayer(tileDebugLayer);
}

init();

exports.updateVisibility = updateVisibility;
