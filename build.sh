#!/bin/sh
browserify . -t ./node_modules/osm-pbf/browser/transforms.js -o bundle.js $@
browserify -e ./js/worker.js -t ./node_modules/osm-pbf/browser/transforms.js -o bundle-worker.js $@
