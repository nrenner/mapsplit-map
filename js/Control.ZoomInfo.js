// TODO position: relative but on top OR absolute but width of text? 
//      OR better not as control, see Leaflet.draw tooltip?  
L.Control.ZoomInfo = L.Control.extend({
    options: {
        position: 'topleft',
        text: 'Zoom in to 13 for vector tiles',
        limit: 13
    },

    onAdd: function (map) {
        this._map = map;
        this._oldZoom = map.getZoom();
        //leaflet-control-zoom-hint
        this._container = L.DomUtil.create('div', 'zoomhint leaflet-bar hidden');
        this._container.innerHTML = this.options.text;
        this.update();
        map.on('zoomend', this.onZoomend, this);
        return this._container;
    },

    onRemove: function (map) {
        map.off('zoomend', this.onZoomend, this);
    },

    onZoomend: function (e) {
        this.update();
    },

    update: function () {
        var zoom = this._map.getZoom(),
            limit = this.options.limit;
        if (zoom >= limit && this._oldZoom < limit) {
            this._container.classList.add('hidden');
//            mm.restoreBaseLayer();
        } else if (zoom < 13 && this._oldZoom >= limit) {
            this._container.classList.remove('hidden');
//            mm.activateBaseLayer();
        }
        this._oldZoom = zoom;        
    }
});
