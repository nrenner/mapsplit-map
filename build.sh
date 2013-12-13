#!/bin/sh

OSM_PBF=./node_modules/osm-pbf-leaflet/node_modules/osm-pbf

browserify . -o bundle.js $@
browserify -r $OSM_PBF -t $OSM_PBF/browser/transforms.js -e ./js/worker.js -o bundle-worker.js $@
