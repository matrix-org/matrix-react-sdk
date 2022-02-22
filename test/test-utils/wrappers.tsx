import React, { RefCallback } from "react";
import { MatrixClient } from "matrix-js-sdk";

import { MatrixClientPeg as peg } from '../../src/MatrixClientPeg';
import MatrixClientContext from "../../src/contexts/MatrixClientContext";

export function wrapInMatrixClientContext(WrappedComponent) {
    class Wrapper extends React.Component<{ wrappedRef?: RefCallback }> {
        _matrixClient: MatrixClient;
        constructor(props) {
            super(props);

            this._matrixClient = peg.get();
        }

        render() {
            return <MatrixClientContext.Provider value={this._matrixClient}>
                <WrappedComponent ref={this.props.wrappedRef} {...this.props} />
            </MatrixClientContext.Provider>;
        }
    }
    return Wrapper;
}
