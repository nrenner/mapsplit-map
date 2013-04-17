/*
 * Customization wrapper for FeaturePopups Control
 */

var getFeatureInfoHtml = function(feature) {
    var tags = feature.attributes;
    var infoHtml = "<table>";
    var typeId = feature.fid.split('.');
    var link = '<a href="http://www.openstreetmap.org/browse/' + typeId[0] + '/' + typeId[1] + '" target="_blank">' + typeId[1] + '</a>';
    infoHtml += "<div class='entity_title'>" + typeId[0] + " " + link + "</div>";
    for (var key in tags) {
       infoHtml += "<tr><td>" + key + "</td><td>" + tags[key] + "</td></tr>";
    }
    infoHtml += "</table>";
    return infoHtml;
};

var createControl = function(layer) {
    var fpControl = new OpenLayers.Control.FeaturePopups({
        popupSingleOptions: {
            popupClass: OpenLayers.Popup.Anchored,
            panMapIfOutOfView: false
        },
        popupHoverOptions: {
            followCursor: false
        },
        selectOptions: {
            clickout: true
        }
    });

    // allow map panning while feature hovered or selected
    fpControl.controls.hover.handlers.feature.stopDown = false;
    fpControl.controls.select.handlers.feature.stopDown = false;

    fpControl.addLayer(layer, {
        templates: {
            hover: getFeatureInfoHtml,
            single: getFeatureInfoHtml
        }
    });
    
    return fpControl;
};

module.exports.createControl = createControl;
