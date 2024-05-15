/*
 *
 * Copyright 2024 The Matrix.org Foundation C.I.C.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 * /
 */

import React from "react";
import { render } from "@testing-library/react";
import { AuthType } from "matrix-js-sdk/src/interactive-auth";

import { EmailIdentityAuthEntry } from "../../../../src/components/views/auth/InteractiveAuthEntryComponents";
import { createTestClient } from "../../../test-utils";

describe("<EmailIdentityAuthEntry/>", () => {
    const renderIdentityAuth = () => {
        const matrixClient = createTestClient();

        return render(
            <EmailIdentityAuthEntry
                matrixClient={matrixClient}
                loginType={AuthType.Email}
                onPhaseChange={jest.fn()}
                submitAuthDict={jest.fn()}
                fail={jest.fn()}
                clientSecret="my secret"
                showContinue={true}
                inputs={{ emailAddress: "alice@example.xyz" }}
            />,
        );
    };

    test("should render", () => {
        const { container } = renderIdentityAuth();
        expect(container).toMatchSnapshot();
    });
});
