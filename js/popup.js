
var getFeatureInfoHtml = function(feature) {
    var infoHtml = "<table>";
    var link = '<a href="http://www.openstreetmap.org/browse/' + feature.type + '/' + feature.id + '" target="_blank">' + feature.id + '</a>';
    infoHtml += "<div class='entity_title'>" + feature.type + " " + link + "</div>";
    for (var key in feature.tags) {
       infoHtml += "<tr><td>" + key + "</td><td>" + feature.tags[key] + "</td></tr>";
    }
    infoHtml += "</table>";
    return infoHtml;
};

module.exports.getFeatureInfoHtml = getFeatureInfoHtml;
