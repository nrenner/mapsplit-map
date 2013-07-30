/**
 * Side panel Controls
 */

require('./optimize.js');
var mm = require('./map.js');

var map = mm.map,
    oldZoom = map.getZoom();

function updateVisibility(e) {
    var ele = e.target || e.srcElement;
    mm.updateVisibility(ele.value);
}

function onZoomend() {
    var zoom = map.getZoom(),
        ele = document.getElementById('zoomhint');

    if (zoom >= 13 && oldZoom < 13) {
        ele.classList.add('hidden');
        mm.restoreBaseLayer();
    } else if (zoom < 13 && oldZoom >= 13) {
        ele.classList.remove('hidden');
        mm.activateBaseLayer();
    }
    oldZoom = zoom;
}

function init() {
    var radios = document.getElementsByName('visibility');
    for (var i = 0; i < radios.length; i++) {
        radios[i].onclick = updateVisibility;
    }

    mm.map.on('zoomend', onZoomend, this);
}

init();
