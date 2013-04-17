require('osm-pbf-openlayers');
require('./SVGVisibility.js');
var popup = require('./popup.js');
    
var lat=47.722302000;
var lon=9.385398000;
var zoom=13;
var map;
var vector;
var renderers = ["SVGVisibility"]; // SVGVisibility Canvas SVG

/**
 * Changes the visibility for all features (supporting hover only)
 * 
 * @param {string} 'visible' | 'hidden'
 */
var updateVisibility = function(visibility) {
    // requires SVGVisibility
    if (vector.renderer.setVisibility) {
        vector.renderer.setVisibility(visibility);
    } else {
        console.warn('Could not set visibility for renderer ' + vector.renderer.CLASS_NAME);
    }
};

function init() {
    var options = {
        controls: [],
        projection: "EPSG:900913",
        displayProjection: "EPSG:4326",
        /* turn off animated zooming, slow on my old machine */
        zoomMethod: null
    };

    map = new OpenLayers.Map('map', options);

    map.addControl(new OpenLayers.Control.Attribution());
    map.addControl(new OpenLayers.Control.Permalink());
    //map.addControl(new OpenLayers.Control.LayerSwitcher());
    map.addControl(new OpenLayers.Control.Navigation(
        {dragPanOptions: {enableKinetic: false}}
    ));
    map.addControl(new OpenLayers.Control.PanZoomBar());

    map.addLayer(new OpenLayers.Layer.OSM(null, null, {
        //opacity: 0.5,
        transitionEffect: null
    }));

    // transparent layer (~ no base layer)
    //map.addLayer(new OpenLayers.Layer("Leer", {isBaseLayer: true}));

    var defaultStyle = new OpenLayers.Style({
        strokeColor: "blue",
        strokeWidth: 2,
        strokeOpacity: 0.5,
        pointRadius: 8,
        fillColor: "blue",
        fillOpacity: 0.2,
        visibility: 'inherit'
    });
    var myStyles = new OpenLayers.StyleMap({
        "default": defaultStyle, 
        "select": new OpenLayers.Style({
            strokeColor: "red",
            strokeWidth: 2,
            strokeOpacity: 0.8,
            pointRadius: 8,
            fillColor: "red",
            fillOpacity: 0.2,
            visibility: 'visible'
        })
    });

   var grid = new OpenLayers.Strategy.Grid();
   grid.buffer = 0;
   vector = new OpenLayers.Layer.Vector("tiles", {
        // setting layer projection does not work with Grid.js (wrong x/y calculation)
        //projection: map.displayProjection,
        strategies: [grid],
        protocol: new OpenLayers.Protocol.HTTP({
            // 13 / 4309 / 2857 = 4309_2857.pbf
            url: "tiles/${x}_${y}.pbf",
            format: new OpenLayers.Format.PBF({internalProjection: map.getProjectionObject()})
        }),
        visibility: true,
        styleMap: myStyles,
        renderers: renderers
    });
    
    vector.events.register("loadend", vector,
      function() {
        console.log('loadend');
     }
    );
   map.addLayer(vector);
   
   map.addControl(popup.createControl(vector));

   if (!map.getCenter()) {
       map.setCenter(
           new OpenLayers.LonLat(lon, lat).transform(
               new OpenLayers.Projection("EPSG:4326"),
               map.getProjectionObject()
           ), zoom
       );                
   }
}

init();

exports.updateVisibility = updateVisibility;
