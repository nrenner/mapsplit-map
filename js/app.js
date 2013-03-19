/**
 * Side panel Controls
 */
var app = (function() {

    function updateVisibility(e) {
        var ele = e.target || e.srcElement;
        mm.updateVisibility(ele.value);
    }

    function init() {
        var radios = document.getElementsByName('visibility');
        for (var i = 0; i < radios.length; i++) {
            radios[i].onclick = updateVisibility;
        }
    }

    init();
})();
