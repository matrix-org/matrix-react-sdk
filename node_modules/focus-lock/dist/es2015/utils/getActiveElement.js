var getNestedShadowActiveElement = function (shadowRoot) {
    return shadowRoot.activeElement
        ? shadowRoot.activeElement.shadowRoot
            ? getNestedShadowActiveElement(shadowRoot.activeElement.shadowRoot)
            : shadowRoot.activeElement
        : undefined;
};
/**
 * returns active element from document or from nested shadowdoms
 */
export var getActiveElement = function () {
    return (document.activeElement
        ? document.activeElement.shadowRoot
            ? getNestedShadowActiveElement(document.activeElement.shadowRoot)
            : document.activeElement
        : undefined); // eslint-disable-next-line @typescript-eslint/no-explicit-any
};
