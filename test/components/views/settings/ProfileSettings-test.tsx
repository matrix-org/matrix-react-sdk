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

import React from "react";
import { render, screen } from "@testing-library/react";
import { MatrixClient } from "matrix-js-sdk/src/matrix";

import ProfileSettings from "../../../../src/components/views/settings/ProfileSettings";
import { stubClient } from "../../../test-utils";
import { ToastContext, ToastRack } from "../../../../src/contexts/ToastContext";

interface MockedAvatarSettingProps {
    removeAvatar: () => void;
}

let removeAvatarFn: () => void;

jest.mock(
    "../../../../src/components/views/settings/AvatarSetting",
    () =>
        (({ removeAvatar }) => {
            removeAvatarFn = removeAvatar;
            return <div>Mocked AvatarSetting</div>;
        }) as React.FC<MockedAvatarSettingProps>,
);
jest.mock("@vector-im/compound-web", () => ({ EditInPlace: () => "mocked editinplace" }));

describe("ProfileSettings", () => {
    let client: MatrixClient;
    let toastRack: Partial<ToastRack>;

    beforeEach(() => {
        client = stubClient();
        toastRack = {
            displayToast: jest.fn().mockReturnValue(jest.fn()),
        };
    });

    it("removes avatar", async () => {
        render(
            <ToastContext.Provider value={toastRack}>
                <ProfileSettings />
            </ToastContext.Provider>,
        );

        expect(await screen.findByText("Mocked AvatarSetting")).toBeInTheDocument();
        expect(removeAvatarFn).toBeDefined();

        removeAvatarFn();

        expect(client.setAvatarUrl).toHaveBeenCalledWith("");
    });
});
