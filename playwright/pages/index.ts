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
import { Page } from "playwright-core";
import { uniqueId } from "lodash";

import { ElementLabsPage } from "./labs";
import { ElementClientPage } from "./client";
import { BotCreator } from "./bot";
import { HomeserverInstance, UserCredentials } from "../plugins/utils/homeserver";

export class ElementAppPage {
    constructor(private page: Page) {}

    public labs = new ElementLabsPage(this.page);
    public client = new ElementClientPage(this.page);
    public bot = new BotCreator(this.page);

    async initTestUser(
        homeserver: HomeserverInstance,
        displayName: string,
        prelaunchFn?: () => void,
        userIdPrefix = "user_",
    ): Promise<UserCredentials> {
        const username = uniqueId(userIdPrefix);
        const password = uniqueId("password_");
        await homeserver.registerUser(username, password, displayName);
        const response = await homeserver.loginUser(username, password);
        await this.page.evaluate(async () => {
            // Seed the localStorage with the required credentials
            window.localStorage.setItem("mx_hs_url", homeserver.config.baseUrl);
            window.localStorage.setItem("mx_user_id", response.userId);
            window.localStorage.setItem("mx_access_token", response.accessToken);
            window.localStorage.setItem("mx_device_id", response.deviceId);
            window.localStorage.setItem("mx_is_guest", "false");
            window.localStorage.setItem("mx_has_pickle_key", "false");
            window.localStorage.setItem("mx_has_access_token", "true");
            // Ensure the language is set to a consistent value
            window.localStorage.setItem("mx_local_settings", '{"language":"en"}');
        });
        prelaunchFn?.();
        await this.page.context().clearPermissions();
        await this.page.goto("/");
        await this.page.locator(".mx_MatrixChat").waitFor({ timeout: 30000 });
        return {
            password,
            username,
            accessToken: response.accessToken,
            userId: response.userId,
            deviceId: response.deviceId,
            homeServer: response.homeServer,
        };
    }
}
