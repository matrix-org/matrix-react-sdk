import { FOCUS_ALLOW } from './constants';
import { contains } from './utils/DOMutils';
import { toArray } from './utils/array';
import { getActiveElement } from './utils/getActiveElement';
/**
 * focus is hidden FROM the focus-lock
 * ie contained inside a node focus-lock shall ignore
 * @returns {boolean} focus is currently is in "allow" area
 */
export const focusIsHidden = () => {
    const activeElement = document && getActiveElement();
    if (!activeElement) {
        return false;
    }
    // this does not support setting FOCUS_ALLOW within shadow dom
    return toArray(document.querySelectorAll(`[${FOCUS_ALLOW}]`)).some((node) => contains(node, activeElement));
};
