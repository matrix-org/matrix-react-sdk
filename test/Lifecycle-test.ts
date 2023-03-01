/*
Copyright 2023 Mikhail Aheichyk
Copyright 2023 Nordeck IT + Consulting GmbH.

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

import { AccountAuthInfo } from "@matrix-org/react-sdk-module-api/lib/types/AccountAuthInfo";
import { logger } from "matrix-js-sdk/src/logger";

import defaultDispatcher from "../src/dispatcher/dispatcher";
import { OverwriteLoginPayload } from "../src/dispatcher/payloads/OverwriteLoginPayload";
import { Action } from "../src/dispatcher/actions";
import { setLoggedIn } from "../src/Lifecycle";
import { stubClient } from "./test-utils";
import { ActionPayload } from "../src/dispatcher/payloads";

jest.mock("../src/utils/createMatrixClient", () => ({
    __esModule: true,
    default: jest.fn().mockReturnValue({
        clearStores: jest.fn(),
    }),
}));

describe("Lifecycle", () => {
    stubClient();

    jest.spyOn(logger, "error").mockReturnValue(undefined);
    jest.spyOn(logger, "warn").mockReturnValue(undefined);
    jest.spyOn(logger, "log").mockImplementation(undefined);

    it("should call 'overwrite_login' callback and receive 'on_logged_in'", async () => {
        // promise to wait 'on_logged_in'
        const loggedInPromise = new Promise((resolve, reject) => {
            defaultDispatcher.register((payload: ActionPayload) => {
                if (payload.action === Action.OnLoggedIn) {
                    resolve(undefined);
                }
            });
        });

        // dispatch 'overwrite_login'
        const accountInfo = {} as unknown as AccountAuthInfo;
        defaultDispatcher.dispatch<OverwriteLoginPayload>(
            {
                action: Action.OverwriteLogin,
                credentials: {
                    ...accountInfo,
                    guest: false,
                },
            },
            true,
        );

        await expect(loggedInPromise).resolves.toBeUndefined();
    });

    it("should setLoggedIn", async () => {
        // promise to wait 'on_logging_in'
        const loggingInPromise = new Promise((resolve, reject) => {
            defaultDispatcher.register((payload: ActionPayload) => {
                if (payload.action === "on_logging_in") {
                    resolve(undefined);
                }
            });
        });

        await setLoggedIn({
            accessToken: "some_token",
            homeserverUrl: "https://example.com",
            userId: "@some_user_id",
        });

        await expect(loggingInPromise).resolves.toBeUndefined();
    });
});
