call browserify . -t ./node_modules/osm-pbf/browser/transforms.js -o bundle.js %*
call browserify -e ./js/worker.js -t ./node_modules/osm-pbf/browser/transforms.js -o bundle-worker.js %*
