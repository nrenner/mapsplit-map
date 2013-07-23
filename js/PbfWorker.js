require('osm-pbf-leaflet');

L.PbfWorker = L.AbstractWorker.extend({
    options: {
        maxWorkers: 2
    },
    
    initialize: function () {
        this._queue = [];
        this._numActive = 0;    
    },

    process: function(tile, callback) {
        this._queue.push({tile: tile, callback: callback});
        this._next();
    },

    _next: function() {
        var args;
        if (this._numActive < this.options.maxWorkers && this._queue.length > 0) {
            this._numActive++;
            args = this._queue.shift();
            this._process(args.tile, args.callback);
        }
    },

    _process: function(tile, callback) {
        var worker, parsed;
        if (typeof Worker === "function") {
            worker = new Worker('js/worker.js?' + Date.now());
            tile._worker = worker;
            worker.addEventListener('message', L.bind(function(e) {
                parsed = JSON.parse(e.data.parsed);
                e.data.parsed = null;

                if (tile._worker) {
                    tile._worker = null;
                    tile.parsed = parsed;
                    tile.datum = null;

                    callback(tile);
                } else {
                    // tile has been unloaded, don't continue with adding
                }

                parsed = null;
                this._numActive--;
                this._next();
            },this), false);
            // tile.datum invalid after call (is transferred to worker) 
            worker.postMessage(tile.datum, [tile.datum]);
        } else {
            callback(tile);
        }
    },
    
    abort: function(tile) {
        if (tile._worker) {
            tile._worker.terminate();
            tile._worker = null;
            this._numActive--;
        } else {
            this._remove(tile);
        }
    },

    clear: function() {
        this._queue = [];
    },

    _remove: function(tile) {
        var key = tile.key, 
            args;
        for (var i = 0, len = this._queue.length; i < len; i++) {
            args = this._queue[i];
            if (args.tile.key === key) {
                this._queue.splice(i, 1);
                break;
            }
        }
    }
});

L.pbfWorker = function () {
    return new L.PbfWorker();
};
