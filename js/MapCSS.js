/**
 * 
 * 
 * Original code taken from Overpass Turbo
 * https://github.com/tyrasd/overpass-ide/blob/3e573b19e13f3caa65d33997a535660c687a32c7/js/overpass.js#L167-L354
 * Copyright (c) 2012 Martin Raifer, MIT License
 */
L.MapCSS = L.Class.extend({
	options: {
		defaultStyle: ""
      +"node, way, relation {color:black; fill-color:black; opacity:1; fill-opacity: 1; width:10;} \n"
      // point features
      +"node {color:#03f; width:2; opacity:0.7; fill-color:#fc0; fill-opacity:0.3;} \n"
      // line features
      +"line {color:#03f; width:5; opacity:0.6;} \n"
      // polygon features
      +"area {color:#03f; width:2; opacity:0.7; fill-color:#fc0; fill-opacity:0.3;} \n"
      // style modifications
      // objects in relations
      +"relation node, relation way, relation {color:#d0f;} \n"
      // tainted objects
      +"way:tainted, relation:tainted {dashes:5,8;} \n"
      // placeholder points
      +"way:placeholder, relation:placeholder {fill-color:red;} \n"
      // highlighted features
      +"node:active, way:active, relation:active {color:#f50; fill-color:#f50;} \n"
	},

	initialize: function (map, options) {
    this._map = map;
		L.setOptions(this, options);

    this.addSymbolStyle();
	},

  addSymbolStyle: function() {
    /* own MapCSS-extension:
     * added symbol-* properties
     * TODO: implement symbol-shape = marker|square?|shield?|...
     */
    if (styleparser.PointStyle.prototype.properties['symbol_shape'] === undefined) {
      styleparser.PointStyle.prototype.properties.push('symbol_shape','symbol_size','symbol_stroke_width','symbol_stroke_color','symbol_stroke_opacity','symbol_fill_color','symbol_fill_opacity');
      styleparser.PointStyle.prototype.symbol_shape = "";
      styleparser.PointStyle.prototype.symbol_size = NaN;
      styleparser.PointStyle.prototype.symbol_stroke_width = NaN;
      styleparser.PointStyle.prototype.symbol_stroke_color = null;
      styleparser.PointStyle.prototype.symbol_stroke_opacity = NaN;
      styleparser.PointStyle.prototype.symbol_fill_color = null;
      styleparser.PointStyle.prototype.symbol_fill_opacity = NaN;
    }
  },

  validate: function(user_mapcss) {
    // test user supplied mapcss stylesheet
    try {
      var dummy_mapcss = new styleparser.RuleSet();
      dummy_mapcss.parseCSS(user_mapcss);
      try {
        dummy_mapcss.getStyles({
          isSubject:function() {return true;},
          getParentObjects: function() {return [];},
        }, [], 18);
      } catch(e) {
        throw new Error("MapCSS runtime error.");
      }
    } catch(e) {
      user_mapcss = "";
      // @nrenner
      //fire("onStyleError", "<p>"+e.message+"</p>");
      return e;
    }
    return null;
  },

  parse: function(user_mapcss) {
    this.mapcss = new styleparser.RuleSet();
    this.mapcss.parseCSS(this.options.defaultStyle
      // user supplied mapcss
      +user_mapcss
    );
  },

  extendWithStyleOptions: function (options) {
    return L.extend(options || {}, {
        style: L.bind(this.style, this),
        pointToLayer: L.bind(this.pointToLayer, this)
    });
  },

  get_feature_style: function(feature, highlight) {
    function hasInterestingTags(props) {
      // this checks if the node has any tags other than "created_by"
      return props && 
             props.tags && 
             (function(o){for(var k in o) if(k!="created_by"&&k!="source") return true; return false;})(props.tags);
    }

    var tags = L.extend(
      feature.properties && feature.properties.tainted ? {":tainted": true} : {},
      feature.is_placeholder ? {":placeholder": true} : {},
      hasInterestingTags(feature.properties) ? {":tagged":true} : {":untagged": true},
      highlight ? {":active": true} : {},
      feature.properties.tags
    );

    var s = this.mapcss.getStyles(
      L.MapCSS.entity(feature), 
      tags,
      // @nrenner
      this._map ? this._map.getZoom() : 18
    );

    // @nrenner set by StyleCooser.updateStyles
    s.drawn = tags[':drawn'] && tags[':drawn'] === 'yes';

    return s;
  },

  style: function(feature, highlight) {
    var stl = {};
    var s = this.get_feature_style(feature, highlight);

    // @nrenner better way?
    // return indication when no rules/styles matched, e.g. to be able to filter out feature
    if (!s.drawn) {
      return null;
    }

    // apply mapcss styles
    function get_property(styles, properties) {
      for (var i=properties.length-1; i>=0; i--)
        if (styles[properties[i]] !== undefined) return styles[properties[i]];
      return undefined;
    }
    switch (feature.geometry.type) {
      case "Point":
        var styles = L.extend({},s.shapeStyles["default"],s.pointStyles["default"]);
        var p = get_property(styles, ["color","symbol_stroke_color"]);
        if (p !== undefined) stl.color       = p;
        var p = get_property(styles, ["opacity","symbol_stroke_opacity"]);
        if (p !== undefined) stl.opacity     = p;
        var p = get_property(styles, ["width","symbol_stroke_width"]);
        if (p !== undefined) stl.weight      = p;
        var p = get_property(styles, ["fill_color", "symbol_fill_color"]);
        if (p !== undefined) stl.fillColor   = p;
        var p = get_property(styles, ["fill_opacity", "symbol_fill_opacity"]);
        if (p !== undefined) stl.fillOpacity = p;
        var p = get_property(styles, ["dashes"]);
        if (p !== undefined) stl.dashArray   = p.join(",");

        // @nrenner pointToLayer not called in leaflet-osm
        var p = get_property(styles, ["radius","symbol_size"]);
        if (p !== undefined) stl.radius      = p;        

        break;
      case "LineString":
        var styles = s.shapeStyles["default"];
        var p = get_property(styles, ["color"]);
        if (p !== undefined) stl.color       = p;
        var p = get_property(styles, ["opacity"]);
        if (p !== undefined) stl.opacity     = p;
        var p = get_property(styles, ["width"]);
        if (p !== undefined) stl.weight      = p;
        var p = get_property(styles, ["dashes"]);
        if (p !== undefined) stl.dashArray   = p.join(",");
      break;
      case "Polygon":
      case "MultiPolygon":
        var styles = s.shapeStyles["default"];
        var p = get_property(styles, ["color","casing_color"]);
        if (p !== undefined) stl.color       = p;
        var p = get_property(styles, ["opacity","casing_opacity"]);
        if (p !== undefined) stl.opacity     = p;
        var p = get_property(styles, ["width","casing_width"]);
        if (p !== undefined) stl.weight      = p;
        var p = get_property(styles, ["fill_color"]);
        if (p !== undefined) stl.fillColor   = p;
        var p = get_property(styles, ["fill_opacity"]);
        if (p !== undefined) stl.fillOpacity = p;
        var p = get_property(styles, ["dashes"]);
        if (p !== undefined) stl.dashArray   = p.join(",");
      break;
    }
    // todo: more style properties? linecap, linejoin?
    // return style object
    return stl;
  },

  pointToLayer: function (feature, latlng) {
    // todo: labels!
    var s = this.get_feature_style(feature);
    var stl = s.pointStyles && s.pointStyles["default"] ? s.pointStyles["default"] : {};
    if (stl["icon_image"]) {
      // return image marker
      var iconUrl = stl["icon_image"].match(/^url\(['"](.*)['"]\)$/)[1];
      var iconSize;
      if (stl["icon_width"]) iconSize=[stl["icon_width"],stl["icon_width"]];
      if (stl["icon_height"] && iconSize) iconSize[1] = stl["icon_height"];
      var icon = new L.Icon({
        iconUrl: iconUrl,
        iconSize: iconSize,
        // todo: anchor, shadow?, ...
      });
      return new L.Marker(latlng, {icon: icon});
    } else if (stl["symbol_shape"]=="circle" || true /*if nothing else is specified*/) {
      // return circle marker
// @nrenner TODO moved to style (Leaflet default is 10), further test and then remove? Move all styling to style?
//      var r = stl["symbol_size"] || 9; 
      return new L.CircleMarker(latlng/*, {
        radius: r,
      }*/);
    }
  }
});

L.extend(L.MapCSS, {
  entity: function (feature) {
    return {
      isSubject: function(subject) {
        switch (subject) {
          case "node":     return feature.properties.type == "node" || feature.geometry.type == "Point";
          case "area":     return feature.geometry.type == "Polygon" || feature.geometry.type == "MultiPolygon";
          case "line":     return feature.geometry.type == "LineString";
          case "way":      return feature.properties.type == "way";
          case "relation": return feature.properties.type == "relation";
        }
        return false;
      },

      getParentObjects: function() {
        if (feature.properties.relations.length == 0)
          return [];
        else
          return feature.properties.relations.map(function(rel) {
            return {
              tags: rel.reltags,
              isSubject: function(subject) {
                return subject=="relation" || 
                       (subject=="area" && rel.reltags.type=="multipolyon");
              },
              getParentObjects: function() {return [];},
            }
          });
      } 
    };
  },

  load: function (url) {
    var xhr = new XMLHttpRequest();
    xhr.open('GET', url, false);
    xhr.send();
    return xhr.responseText;
  }
});
