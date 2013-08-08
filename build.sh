#!/bin/sh
browserify . -t ./node_modules/osm-pbf/browser/transforms.js -o bundle.js $@
