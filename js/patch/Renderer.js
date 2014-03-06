// set path clip-bounds to outer tile bounds if smaller than padding bounds
// replaces L.Renderer._update

L.Renderer.include({
    _update: function () {

        // L.Renderer orig
        // update pixel bounds of renderer container (for positioning/sizing/clipping later)
        var p = this.options.padding,
            size = this._map.getSize(),
            min = this._map.containerPointToLayerPoint(size.multiplyBy(-p)).round(),
            max = min.add(size.multiplyBy(1 + p * 2)).round(),
            bounds = new L.Bounds(min, max);

        if (this.options.getTileSize && this.options.getTileSize()) {
            // first part derived from L.GridLayer._update
            var viewBounds = this._map.getPixelBounds(),
                tileSize = this.options.getTileSize(),
                // tile coordinates range for the current view
                tileBounds = L.bounds(
                    viewBounds.min.divideBy(tileSize).floor(),
                    viewBounds.max.divideBy(tileSize).floor()),
                tileSizePoint = L.point(tileSize, tileSize),
                // absolute tile corners in pixel from origin
                tilePixelMin = tileBounds.min.multiplyBy(tileSize),
                tilePixelMax = tileBounds.max.multiplyBy(tileSize)._add(tileSizePoint),
                // tile bounds offset from map viewport 
                tileOffsetMin = tilePixelMin.subtract(viewBounds.min),
                tileOffsetMax = tilePixelMax.subtract(viewBounds.max),
                // enlarge relative viewport by tile offsets
                tileMin = this._map._getMapPanePos().multiplyBy(-1).add(tileOffsetMin),
                tileMax = this._map._getMapPanePos().multiplyBy(-1).add(size).add(tileOffsetMax),
                // smallest bounds from both (i.e. if tile offset > padding use padding else tile offset)
                smallestMin = L.point(Math.max(tileMin.x, min.x), Math.max(tileMin.y, min.y)),
                smallestMax = L.point(Math.min(tileMax.x, max.x), Math.min(tileMax.y, max.y)),
                bounds = L.bounds(smallestMin, smallestMax);
        }

        this._bounds = bounds;
    }
});

/* debugging
L.Bounds.prototype.toString = function() {
    return 'Bounds(' + this.min + ', ' + this.max + ')';
};
*/
