/*
Copyright 2023 The Matrix.org Foundation C.I.C.

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

import { render } from "@testing-library/react";
import React from "react";
import { MatrixClient } from "matrix-js-sdk/src/matrix";

import AppearanceUserSettingsTab from "../../../../../../src/components/views/settings/tabs/user/AppearanceUserSettingsTab";
import { withClientContextRenderOptions, stubClient } from "../../../../../test-utils";

describe("AppearanceUserSettingsTab", () => {
    let client: MatrixClient;

    beforeEach(() => {
        client = stubClient();
    });

    it("should render", () => {
        const { asFragment } = render(<AppearanceUserSettingsTab />, withClientContextRenderOptions(client));
        expect(asFragment()).toMatchSnapshot();
    });
});
