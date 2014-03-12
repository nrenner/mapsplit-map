// disable interaction for canvas because of redrawing artefacts

L.Canvas.prototype._initContainer = function () {
		var container = this._container = document.createElement('canvas');
/*
		L.DomEvent
			.on(container, 'mousemove', this._onMouseMove, this)
			.on(container, 'click dblclick mousedown mouseup contextmenu', this._onClick, this);
*/
		this._ctx = container.getContext('2d');
	};
