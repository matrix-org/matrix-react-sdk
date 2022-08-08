import { FOCUS_AUTO } from '../constants';
import { toArray } from './array';
import { tabbables } from './tabbables';
var queryTabbables = tabbables.join(',');
var queryGuardTabbables = "".concat(queryTabbables, ", [data-focus-guard]");
var getFocusablesWithShadowDom = function (parent, withGuards) {
    var _a;
    return toArray(((_a = parent.shadowRoot) === null || _a === void 0 ? void 0 : _a.children) || parent.children).reduce(function (acc, child) {
        return acc.concat(child.matches(withGuards ? queryGuardTabbables : queryTabbables) ? [child] : [], getFocusablesWithShadowDom(child));
    }, []);
};
export var getFocusables = function (parents, withGuards) {
    return parents.reduce(function (acc, parent) {
        return acc.concat(
        // add all tabbables inside and within shadow DOMs in DOM order
        getFocusablesWithShadowDom(parent, withGuards), 
        // add if node is tabbable itself
        parent.parentNode
            ? toArray(parent.parentNode.querySelectorAll(queryTabbables)).filter(function (node) { return node === parent; })
            : []);
    }, []);
};
/**
 * return a list of focusable nodes within an area marked as "auto-focusable"
 * @param parent
 */
export var getParentAutofocusables = function (parent) {
    var parentFocus = parent.querySelectorAll("[".concat(FOCUS_AUTO, "]"));
    return toArray(parentFocus)
        .map(function (node) { return getFocusables([node]); })
        .reduce(function (acc, nodes) { return acc.concat(nodes); }, []);
};
