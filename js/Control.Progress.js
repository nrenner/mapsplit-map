/**
 * Tile loading progress bar
 */
L.Control.Progress = L.Control.extend({
    options: {
        position: 'topleft',
        text: 'Loading',
        // id of element to add this control to, instead of corner (optional)
        div: null
    },

    initialize: function (tileLayer, options) {
        L.setOptions(this, options);
        
        this._layer = tileLayer;
    },

    addTo: function (map) {
        L.Control.prototype.addTo.apply(this, arguments);

        if (this.options.div) {
            this._container.parentNode.removeChild(this._container);
            L.DomUtil.get(this.options.div).appendChild(this._container);
        }

        return this;
    },
    
    onAdd: function (map) {
        var container, text;

        this._map = map;

        container = L.DomUtil.create('div', 'progress leaflet-bar hidden');

        text = L.DomUtil.create('span', 'progress-text');
        text.innerHTML = this.options.text;
        container.appendChild(text);

        this._bar = L.DomUtil.create('progress', 'progress-bar');
        container.appendChild(this._bar);
        
        this._layer.on('loading', this._onLoading, this);
        this._layer.on('load', this._onLoad, this);
        this._layer.on('tileload', this._onTileLoad, this);
        this._layer.on('tileloadstart', this._onTileLoading, this);
        this._layer.on('tileerror', this._onTileLoad, this);
        this._layer.on('tileabort', this._onTileLoad, this);

        return container;
    },

    onRemove: function (map) {
        this._layer.off('loading', this._onLoading, this);
        this._layer.off('load', this._onLoad, this);
        this._layer.off('tileload', this._onTileLoad, this);
        this._layer.off('tileloadstart', this._onTileLoading, this);
        this._layer.off('tileerror', this._onTileLoad, this);
        this._layer.off('tileabort', this._onTileLoad, this);
    },

    _onLoading: function () {
        this._bar.max = 0.1; // must be greater than zero, so adjust later
        this._bar.value = 0;
        L.DomUtil.removeClass(this._container, 'hidden');
    },
    
    _onLoad: function () {
        window.setTimeout(L.bind(function() {
            L.DomUtil.addClass(this._container, 'hidden');
        }, this), 200);
    },
    
    _onTileLoading: function (evt) {
        // max can't be initialized with 0, so adjust once to match number of tiles
        if (this._bar.max === 0.1) {
            this._bar.max = 1;
        } else {
            this._bar.max++;
        }
    },

    _onTileLoad: function (evt) {
        this._bar.value++;
    }
});
