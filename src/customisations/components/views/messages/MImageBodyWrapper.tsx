/*
Copyright 2022 The Matrix.org Foundation C.I.C.

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

import React from 'react';

import { IBodyProps } from "../../../../components/views/messages/IBodyProps";
import { default as OriginalMImageBody } from "../../../../components/views/messages/MImageBody";

/**
 * This component wraps MImageBody so that it can be customised with access to the original.
 */
export default class MImageBodyWrapper extends React.Component<IBodyProps> {
    render(): React.ReactNode {
        return <OriginalMImageBody {...this.props} />;
    }
}
