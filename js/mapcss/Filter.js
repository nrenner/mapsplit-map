styleparser.Util = function() {};

styleparser.Util.extend = function(destination, source) {
    for (var property in source) {
      if (source.hasOwnProperty(property)) {
        destination[property] = source[property];
      }
    }
    return destination;
};


styleparser.Filter = function() {};

styleparser.Filter.prototype = {
    
    init: function(zoom) {
      this.zoom = zoom;
    },

    parse: function(user_mapcss) {
      this.mapcss = new styleparser.RuleSet();
      this.mapcss.parseCSS(user_mapcss);
    },

    filter: function(feature) {
      function hasInterestingTags(tags) {
        // this checks if the node has any tags other than "created_by"
        return tags && 
               (function(o){for(var k in o) if(k!="created_by"&&k!="source") return true; return false;})(tags);
      }

      var tags = styleparser.Util.extend(
        hasInterestingTags(feature.tags) ? {":tagged":true} : {":untagged": true},
        feature.tags
      );
 
      var filtered = this.mapcss.filter(
        styleparser.Filter.entity(feature),
        tags,
        this.zoom || 18
      );

      return filtered;
    }
};

// specific implentation for osm-pbf-leaflet (which is derived from leaflet-osm)
styleparser.Filter.entity = function (feature) {
    return {
      isSubject: function(subject) {
        switch (subject) {
          case "node":
          case "way":
          case "relation": return feature.type === subject;
          case "area":     return feature.area;
          case "line":     return feature.type === "way" && !feature.area;
        }
        return false;
      },

      getParentObjects: function() {
        // TODO relations not supported yet
        return [];
      } 
    };
};


// checks if feature will be rendered or not (derived from RuleSet.getStyles)
styleparser.RuleSet.prototype.filter = function(entity, tags, zoom) {
    for (var i in this.choosers) {
        if (this.choosers[i].filter(entity, tags, zoom)) {
            return true;
        }
    }
    return false;
};

// checks if this chooser will render the feature (derived from StyleChooser.updateStyles)
styleparser.StyleChooser.prototype.filter = function(entity, tags, zoom) {
		// Are any of the ruleChains fulfilled?
		for (var i in this.ruleChains) {
			var c=this.ruleChains[i];
			if (c.test(-1, entity, tags, zoom)) {
				for (var j in this.styles) {
					var r=this.styles[j];
          // TODO call "r.runEvals(tags);"? But after r.drawn() in StyleChooser.
					if (r.drawn()) { 
              return true;
          }
				}
			}
		}
    return false;
};
