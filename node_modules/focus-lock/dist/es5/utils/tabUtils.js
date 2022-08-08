"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getParentAutofocusables = exports.getFocusables = void 0;
var constants_1 = require("../constants");
var array_1 = require("./array");
var tabbables_1 = require("./tabbables");
var queryTabbables = tabbables_1.tabbables.join(',');
var queryGuardTabbables = "".concat(queryTabbables, ", [data-focus-guard]");
var getFocusablesWithShadowDom = function (parent, withGuards) {
    var _a;
    return (0, array_1.toArray)(((_a = parent.shadowRoot) === null || _a === void 0 ? void 0 : _a.children) || parent.children).reduce(function (acc, child) {
        return acc.concat(child.matches(withGuards ? queryGuardTabbables : queryTabbables) ? [child] : [], getFocusablesWithShadowDom(child));
    }, []);
};
var getFocusables = function (parents, withGuards) {
    return parents.reduce(function (acc, parent) {
        return acc.concat(
        // add all tabbables inside and within shadow DOMs in DOM order
        getFocusablesWithShadowDom(parent, withGuards), 
        // add if node is tabbable itself
        parent.parentNode
            ? (0, array_1.toArray)(parent.parentNode.querySelectorAll(queryTabbables)).filter(function (node) { return node === parent; })
            : []);
    }, []);
};
exports.getFocusables = getFocusables;
/**
 * return a list of focusable nodes within an area marked as "auto-focusable"
 * @param parent
 */
var getParentAutofocusables = function (parent) {
    var parentFocus = parent.querySelectorAll("[".concat(constants_1.FOCUS_AUTO, "]"));
    return (0, array_1.toArray)(parentFocus)
        .map(function (node) { return (0, exports.getFocusables)([node]); })
        .reduce(function (acc, nodes) { return acc.concat(nodes); }, []);
};
exports.getParentAutofocusables = getParentAutofocusables;
