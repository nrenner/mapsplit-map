/**
 * Side panel Controls
 */

require('./optimize.js');
var mm = require('./map.js');

var map = mm.map,
    oldZoom = null,
    oldLanduse = true,
    styles = {
        'custom': ''
    };

function updateVisibility(evt) {
    var ele = evt.target || evt.srcElement;
    mm.updateVisibility(ele.value);
}

function handleLanduse(evt) {
    var ele = evt.target || evt.srcElement;
    mm.showLanduse(ele.checked);
    oldLanduse = ele.checked;
}

function handleStyle(evt) {
    var name = this.value,
        mapcss = "";
    if (!styles[name]) {
        styles[name] = mm.loadStyle(name);
    }
    mapcss = styles[name];
    updateMapCSS(mapcss, name !== 'custom');
    mm.applyStyle(mapcss);
}

function handleApply(evt) {
    var mapcss = document.getElementById('mapcss').value;
    styles['custom'] = mapcss;
    mm.applyStyle(mapcss);
}

function updateMapCSS(mapcss, disabled) {
    var mapcssEle = document.getElementById('mapcss');
    mapcssEle.value = mapcss;
    mapcssEle.disabled = disabled;
    document.getElementById('apply').disabled = disabled;
}

function updateLanduse() {
    var zoom = map.getZoom(),
        ele = document.getElementById('landuse');

    if (zoom >= 17 && (!oldZoom || oldZoom < 17) && ele.checked) {
        ele.checked = false;
        mm.showLanduse(false);
    } else if (zoom < 17 && (!oldZoom || oldZoom >= 17) && !ele.checked && oldLanduse) {
        ele.checked = true;
        mm.showLanduse(true);
    }
}

function updateZoomHint() {
    var zoom = map.getZoom(),
        ele = document.getElementById('zoomhint');

    if (zoom >= 13 && (!oldZoom || oldZoom < 13)) {
        ele.classList.add('hidden');
        mm.restoreBaseLayer();
    } else if (zoom < 13 && (!oldZoom || oldZoom >= 13)) {
        ele.classList.remove('hidden');
        mm.activateBaseLayer();
    }
}

function init() {
    var radios = document.getElementsByName('visibility');
    for (var i = 0; i < radios.length; i++) {
        radios[i].onclick = updateVisibility;
    }
    
    document.getElementById('landuse').onclick = handleLanduse;

    document.getElementById('style').onchange = handleStyle;
    document.getElementById('apply').onclick = handleApply;
    updateMapCSS(mm.mapcss, true);

    mm.map.on('zoomstart', function() {
        oldZoom = map.getZoom();
    }, this);

    mm.map.on('zoomend', updateZoomHint, this);
    updateZoomHint();

    mm.map.on('zoomend', updateLanduse, this);
    updateLanduse();
}

init();
