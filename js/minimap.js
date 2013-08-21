// MiniMap animation slow (Chrome profile)?  
// reset animation include, MiniMap ignores animation options
L.Map.include({
    setView: function (center, zoom) {
        this._resetView(L.latLng(center), this._limitZoom(zoom));
        return this;
    }
});

// patch to avoid resetting main map on MiniMap add (_mainMapMoving=false initially)
// (addTo > _miniMap.setView > 'moveend' > _onMiniMapMoved > _mainMap.setView)
L.Control.MyMiniMap = L.Control.MiniMap.extend({
    onAdd: function (map) {
        L.Control.MiniMap.prototype.onAdd.call(this, map);
        this._mainMapMoving = true;
        return this._container;
    }
});

// MiniMap (overview map)
function init(map) {
    L.Map.mergeOptions({
        zoomsliderControl: false,
        zoomDisplayControl: false
    });
    var osmMini = new L.OSM.Mapnik({
        opacity: 0.7
    });
    var miniMap = new L.Control.MyMiniMap(osmMini, { 
        toggleDisplay: false,
        //zoomLevelOffset: -5,
        width: 164,
        height: 164
    }).addTo(map);
    miniMap._container.parentNode.removeChild(miniMap._container);
    document.getElementById('minimap').appendChild(miniMap._container);

    // tiles/bounds.js to display data extract bbox
    if (bounds) {
        var boundsGroup = L.featureGroup(window.bounds);
        boundsGroup.setStyle({
            weight: 2,
            dashArray: '10, 5',
            color: 'black',
            opacity: 1,
            fill: false
        });
        miniMap._miniMap.addLayer(boundsGroup);
    }
}

module.exports.init = init;
