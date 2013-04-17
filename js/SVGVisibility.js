/**
 * Enables SVG renderer to set visibility both for all (setVisibility method) and single features.
 * Adds the visibility symbolizer property to vector feature styling:
 * 
 * visibility - {String} Hidden features can still receive events (in contrast to display=none). 
 *    Default is "visible". [visible | hidden | collapse | inherit]
 */
OpenLayers.Renderer.SVGVisibility = OpenLayers.Class(OpenLayers.Renderer.SVG, {

    initialize: function(options) {
        OpenLayers.Renderer.SVG.prototype.initialize.apply(this, [options]);
    },

    setStyle: function(node, style, options) {
        var node = OpenLayers.Renderer.SVG.prototype.setStyle.apply(this, [node, style, options]);
        if (style.visibility) {
            node.style.visibility = style.visibility;
        }
        return node;
    },
    
    /**
     * Changes the visibility for all features (with hit detection still active when hidden)
     * 
     * @param {string} 'visible' | 'hidden'
     */
    setVisibility: function(visibility) {
        // Sets the visibility of the SVG vectorRoot (OL group name) element 
        // (root doesn't work, Layer.Vector.moveTo overwrites visibility). When hidden allows
        // fast interactivity over a base map with only hovered/selected feature rendered.
        //
        // see http://www.w3.org/TR/SVG/painting.html#VisibilityControl
        // see http://www.w3.org/TR/SVG/interact.html#PointerEventsProperty
        this.vectorRoot.style.visibility = visibility;
        this.vectorRoot.style.pointerEvents = 'painted';
    },

    CLASS_NAME: "OpenLayers.Renderer.SVGVisibility" 
});     
