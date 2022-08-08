const getNestedShadowActiveElement = (shadowRoot) => shadowRoot.activeElement
    ? shadowRoot.activeElement.shadowRoot
        ? getNestedShadowActiveElement(shadowRoot.activeElement.shadowRoot)
        : shadowRoot.activeElement
    : undefined;
/**
 * returns active element from document or from nested shadowdoms
 */
export const getActiveElement = () => {
    return (document.activeElement
        ? document.activeElement.shadowRoot
            ? getNestedShadowActiveElement(document.activeElement.shadowRoot)
            : document.activeElement
        : undefined); // eslint-disable-next-line @typescript-eslint/no-explicit-any
};
