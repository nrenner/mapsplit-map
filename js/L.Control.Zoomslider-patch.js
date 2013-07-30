// zoom slider hack to distinguish non-vector levels (in grey)

L.Control.Zoomslider.prototype.options.stepHeight = 9;
L.Control.Zoomslider.prototype.options.knobHeight = 7;

var _createUIOrig = L.Control.Zoomslider.prototype._createUI;
L.Control.Zoomslider.prototype._createUI = function () {
    var ui = _createUIOrig.apply(this, arguments);
    L.DomUtil.create('div', this.options.styleNS + '-body-overlay', ui.body);
    return ui;
};