/*
Copyright 2019 The Matrix.org Foundation C.I.C.

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

import React, { Component, ComponentClass, createContext, forwardRef, Ref } from "react";
import { MatrixClient } from "matrix-js-sdk/src/client";

const MatrixClientContext = createContext<MatrixClient>(undefined);
MatrixClientContext.displayName = "MatrixClientContext";
export default MatrixClientContext;

export type WithMatrixClientHOCProps<P extends object> = {
    mxClient: MatrixClient;
} & P;

export const withMatrixClientHOC = <ComposedComponentProps extends {}>(
    ComposedComponent: ComponentClass<ComposedComponentProps>,
) => {
  type ComposedComponentInstance = InstanceType<typeof ComposedComponent>;

  type WrapperComponentProps = ComposedComponentProps;

  type WrapperComponentPropsWithForwardedRef = WrapperComponentProps & {
      forwardedRef: Ref<ComposedComponentInstance>;
  };

  class WrapperComponent extends Component<
  WrapperComponentPropsWithForwardedRef,
  {}
  > {
      static contextType = MatrixClientContext;
      context!: React.ContextType<typeof MatrixClientContext>;

      render() {
          const {
              forwardedRef,
              ...composedComponentProps
          } = this.props;

          return (
              <ComposedComponent
                  ref={forwardedRef}
                  // We need a cast because:
                  // https://github.com/DefinitelyTyped/DefinitelyTyped/issues/32355
                  // https://github.com/Microsoft/TypeScript/issues/28938#issuecomment-450636046
                  {...composedComponentProps as ComposedComponentProps}
                  mxClient={this.context}
              />
          );
      }
  }

  return forwardRef<ComposedComponentInstance, WrapperComponentProps>(
      (props, ref) => <WrapperComponent forwardedRef={ref} {...props} />,
  );
};
