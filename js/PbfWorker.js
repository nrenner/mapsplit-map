var workerPath = 'bundle-worker.js';

L.PbfWorker = L.AbstractWorker.extend({
    options: {
        maxWorkers: 2
    },
    
    count: 0,
    
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
        //console.log('workers: ' + this._numActive + ' (' + this._queue.length + ')');
        if (this._numActive < this.options.maxWorkers && this._queue.length > 0) {
            this._numActive++;
            args = this._queue.shift();
            this._process(args.tile, args.callback);
        }
    },
            
    _process: function(tile, callback) {
        var worker;
        if (typeof Worker === "function") {
            worker = new Worker(workerPath);
            tile._worker = worker;
            tile._workerNum = ++this.count;

            worker.addEventListener('message', L.bind(function(e) {
                var parsed = null;

                if (e.data.event) {
                    if (e.data.event === "tileresponse") {
                        tile._workerRequesting = false;
                    }
                    this._log(tile, 'event ' + e.data.event + ' (delay ' + (Date.now() - e.data.time) + 'ms)');
                } else if (e.data.log) {
                    this._log(tile, 'debug ' + e.data.log + ' (delay ' + (Date.now() - e.data.time) + 'ms)');
                } else if (e.data.aborted) {
                    this._log(tile, 'aborted', true);
                    this._numActive--;
                    this._next();
                } else {
                    this._log(tile, 'end' + (tile._aborting ? ' aborting' : ''));
                    if (!e.data.err && !tile._aborting) {
                        parsed = JSON.parse(e.data.parsed);
                        e.data.parsed = null;
                    }

                    if (tile._worker && !tile._aborting) {
                        tile._worker = null;
                        tile.parsed = parsed;
                        tile.datum = null;

                        callback(e.data.err, tile);
                    } else {
                        // tile has been unloaded, don't continue with adding
                        this._log(tile, 'aborted tile', true);
                    }

                    parsed = null;
                    this._numActive--;
                    this._next();
                }
            }, this), false);

            if (tile.datum) {
                // tile.datum invalid after call (is transferred to worker) 
                worker.postMessage({ buffer: tile.datum, mapcss: tile.mapcss, mapZoom: tile.mapZoom }, [tile.datum]);
            } else {
                this._log(tile, 'url');
                tile._workerRequesting = true;
                worker.postMessage({ url: tile.url, mapcss: tile.mapcss, mapZoom: tile.mapZoom });
            }
        } else {
            callback(null, tile);
        }
    },
    
    abort: function(tile) {
        if (tile._worker) {
            if (tile._workerRequesting) {
                this._log(tile, 'aborting', true);
                tile._aborting = true;
                tile._worker.postMessage({ abort: true });
            } else {
                tile._worker.terminate();
                this._log(tile, 'terminated', true);
                tile._worker = null;
                this._numActive--;
            }
        } else {
            this._remove(tile);
            //console.log('worker   ' + ' ' + tile.key + ': ' + 'remove from queue');
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
    },
    
    _log: function(tile, msg, error) {
        /*
        var s = 'worker ' + tile._workerNum + ' ' + tile.key + ': ' + msg;
        error ? console.error(s) : console.log(s);
        */
    }
});

L.pbfWorker = function () {
    return new L.PbfWorker();
};
