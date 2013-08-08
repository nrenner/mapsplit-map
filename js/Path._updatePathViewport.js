// set path clip-bounds to outer tile bounds if smaller than CLIP_PADDING bounds
// replaces include from L.Path
L.Map.include({
    _updatePathViewport: function () {

        // L.Path orig
        var p = L.Path.CLIP_PADDING,
            size = this.getSize(),
            panePos = L.DomUtil.getPosition(this._mapPane),
            min = panePos.multiplyBy(-1)._subtract(size.multiplyBy(p)._round()),
            max = min.add(size.multiplyBy(1 + p * 2)._round()),
            bounds = new L.Bounds(min, max);

        if (this._vectorTileLayer) {
            // derived from L.TileLayer._update
            var viewBounds = this.getPixelBounds(),
                // hack: _vectorTileLayer set by application on map init
                tileSize = this._vectorTileLayer.options.tileSize,
                tileSizePoint = L.point(tileSize, tileSize),
                // absolute tile corners in pixel from origin
                tilePixelMin = viewBounds.min.divideBy(tileSize)._floor().multiplyBy(tileSize),
                tilePixelMax = viewBounds.max.divideBy(tileSize)._floor().multiplyBy(tileSize)._add(tileSizePoint),
                // tile bounds offset from map viewport 
                tileOffsetMin = tilePixelMin.subtract(viewBounds.min),
                tileOffsetMax = tilePixelMax.subtract(viewBounds.max),
                // enlarge relative viewport by tile offsets
                tileMin = panePos.multiplyBy(-1).add(tileOffsetMin),
                tileMax = panePos.multiplyBy(-1).add(size).add(tileOffsetMax),
                // smallest bounds from both (i.e. if tile offset > CLIP_PADDING use CLIP_PADDING else tile offset)
                smallestMin = L.point(Math.max(tileMin.x, min.x), Math.max(tileMin.y, min.y)),
                smallestMax = L.point(Math.min(tileMax.x, max.x), Math.min(tileMax.y, max.y)),
                bounds = L.bounds(smallestMin, smallestMax);
        }
        
        this._pathViewport = bounds;
    }
});