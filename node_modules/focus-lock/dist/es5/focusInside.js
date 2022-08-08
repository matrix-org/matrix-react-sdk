"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.focusInside = void 0;
var DOMutils_1 = require("./utils/DOMutils");
var all_affected_1 = require("./utils/all-affected");
var array_1 = require("./utils/array");
var getActiveElement_1 = require("./utils/getActiveElement");
var focusInFrame = function (frame) { return frame === document.activeElement; };
var focusInsideIframe = function (topNode) {
    return Boolean((0, array_1.toArray)(topNode.querySelectorAll('iframe')).some(function (node) { return focusInFrame(node); }));
};
/**
 * @returns {Boolean} true, if the current focus is inside given node or nodes
 */
var focusInside = function (topNode) {
    var activeElement = document && (0, getActiveElement_1.getActiveElement)();
    if (!activeElement || (activeElement.dataset && activeElement.dataset.focusGuard)) {
        return false;
    }
    return (0, all_affected_1.getAllAffectedNodes)(topNode).some(function (node) { return (0, DOMutils_1.contains)(node, activeElement) || focusInsideIframe(node); });
};
exports.focusInside = focusInside;
