set OSM_PBF=./node_modules/osm-pbf-leaflet/node_modules/osm-pbf

call browserify . -o bundle.js %*
call browserify -r %OSM_PBF% -e ./js/worker.js -t %OSM_PBF%/browser/transforms.js -o bundle-worker.js %*
