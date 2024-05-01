/*
Copyright 2021 The Matrix.org Foundation C.I.C.

Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

    http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.
*/

import React, { ComponentClass, createContext, forwardRef, useContext } from "react";
import { MatrixClient } from "matrix-js-sdk/src/matrix";

// This context is available to components under LoggedInView,
// the context must not be used by components outside a MatrixClientContext tree.
// This assertion allows us to make the type not nullable.
const MatrixClientContext = createContext<MatrixClient>(null as any);
MatrixClientContext.displayName = "MatrixClientContext";
export default MatrixClientContext;

export interface MatrixClientProps {
    mxClient: MatrixClient;
}

export function useMatrixClientContext(): MatrixClient {
    return useContext(MatrixClientContext);
}

/**
 * A higher order component that injects the MatrixClient into props.mxClient of the wrapped component.
 * Preferred over using `static contextType` as the types for this are quite broken in React 17.
 * Inherently no different to wrapping in MatrixClientContext.Consumer but saves a lot of boilerplate.
 * @param ComposedComponent the ComponentClass you wish to wrap in the HOC
 * @returns a new component that takes the same props as the original component, but with an additional mxClient prop
 */
export const withMatrixClientHOC = <ComposedComponentProps extends {}>(
    ComposedComponent: ComponentClass<ComposedComponentProps>,
): ((
    props: Omit<ComposedComponentProps, "mxClient"> & React.RefAttributes<InstanceType<typeof ComposedComponent>>,
) => React.ReactElement | null) => {
    type ComposedComponentInstance = InstanceType<typeof ComposedComponent>;

    return forwardRef<ComposedComponentInstance, Omit<ComposedComponentProps, "mxClient">>((props, ref) => {
        const client = useContext(MatrixClientContext);

        // @ts-ignore
        return <ComposedComponent ref={ref} {...props} mxClient={client} />;
    });
};
