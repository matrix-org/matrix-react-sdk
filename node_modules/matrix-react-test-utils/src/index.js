import ReactTestUtils from 'react-dom/test-utils';

/**
 * Helper for waitForRendered(DOM)?Component*
 *
 * `findComponent` should be a callback which returns a list of components which
 * match the condition.
 *
 * @param {Number?} attempts
 * @param {Function} findComponent
 *
 * @return {Promise} a (native) promise that resolves once the component
 *     appears, or rejects if it doesn't appear after a nominal number of
 *     animation frames.
 */
function _waitForRenderedComponent(attempts, findComponent) {
    if (attempts === undefined) {
        // make two attempts by default (one before waiting, and one after)
        attempts = 2;
    }

    const result = findComponent();
    if (result.length > 0) {
        return Promise.resolve(result[0]);
    }

    attempts = attempts-1;

    if (attempts == 0) {
        return Promise.reject(new Error(
            "Gave up waiting for component",
        ));
    }

    // wait 10ms, then try again
    return new Promise((resolve, reject) => {
        setTimeout(resolve, 10);
    }).then(() => {
        return _waitForRenderedComponent(attempts, findComponent);
    });
}

const MatrixReactTestUtils = {
    /**
     * Waits a small number of animation frames for a component to appear
     * in the DOM. Like findRenderedDOMComponentWithTag(), but allows
     * for the element to appear a short time later, eg. if a promise needs
     * to resolve first.
     *
     * @return {Promise<ReactDOMComponent>} a (native) promise that resolves once
     *     the component appears, or rejects if it doesn't appear after a
     *     nominal number of animation frames.
     */
    waitForRenderedDOMComponentWithTag: function(tree, tag, attempts) {
        return _waitForRenderedComponent(attempts, () => {
            return ReactTestUtils.scryRenderedDOMComponentsWithTag(tree, tag);
        });
    },

    /**
     * Waits a small number of animation frames for a component to appear
     * in the DOM. Like findRenderedComponentWithType(), but allows
     * for the element to appear a short time later, eg. if a promise needs
     * to resolve first.
     *
     * @return {Promise<ReactComponent>} a (native) promise that resolves once
     *     the component appears, or rejects if it doesn't appear after a
     *     nominal number of animation frames.
     */
    waitForRenderedComponentWithType: function (tree, componentType, attempts) {
        return _waitForRenderedComponent(attempts, () => {
            return ReactTestUtils.scryRenderedComponentsWithType(tree, componentType);
        });
    },
};

export default MatrixReactTestUtils;
