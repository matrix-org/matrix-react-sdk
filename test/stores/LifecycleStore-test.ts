/*
Copyright 2024 The Matrix.org Foundation C.I.C.

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

import { mocked } from "jest-mock";
import { SyncState } from "matrix-js-sdk/src/matrix";

import { MatrixClientPeg } from "../../src/MatrixClientPeg";
import ToastStore from "../../src/stores/ToastStore";
import { stubClient } from "../test-utils";
import LifecycleStore from "../../src/stores/LifecycleStore";

describe("LifecycleStore", () => {
    stubClient();
    const client = MatrixClientPeg.safeGet();

    it("should show a toast if the matrix server version is unsupported", async () => {
        const toastSpy = jest.spyOn(ToastStore.sharedInstance(), "addOrReplaceToast");
        mocked(client).isVersionSupported.mockImplementation(async (version) => version == "r0.6.0");

        (LifecycleStore as any).onDispatch({
            action: "MatrixActions.sync",
            state: SyncState.Syncing,
            prevState: SyncState.Prepared,
        });

        await new Promise(setImmediate);

        expect(toastSpy).toHaveBeenCalledWith(
            expect.objectContaining({
                title: "Your server is unsupported",
            }),
        );
    });
});
