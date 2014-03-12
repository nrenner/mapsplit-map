
L.Control.Permalink.prototype._onadd_layer = function(e) {
		//console.info("onAdd::layer", e);
    /*
		this._map.on('layeradd', this._update_layer, this);
		this._map.on('layerremove', this._update_layer, this);
    */
    this._map.on('baselayerchange', this._update_layer, this);
    this._update_layer();
	};