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

import { test as base } from "@playwright/test";
import _ from "lodash";

import { Credentials, HomeserverInstance, StartHomeserverOpts } from "./plugins/utils/homeserver";
import { Synapse } from "./plugins/synapse";

const CONFIG_JSON: Record<string, any> = {
    // This is deliberately quite a minimal config.json, so that we can test that the default settings
    // actually work.
    //
    // The only thing that we really *need* (otherwise Element refuses to load) is a default homeserver.
    // We point that to a guaranteed-invalid domain.
    default_server_config: {
        "m.homeserver": {
            base_url: "https://server.invalid",
        },
    },

    // the location tests want a map style url.
    map_style_url: "https://api.maptiler.com/maps/streets/style.json?key=fU3vlMsMn4Jb6dnEIFsx",
};

export const test = base.extend<{
    config: typeof CONFIG_JSON;
    startHomeserverOpts: StartHomeserverOpts | string;
    homeserver: HomeserverInstance;
    user: Credentials & {
        displayName: string;
    };
}>({
    config: CONFIG_JSON,
    page: async ({ context, page, config }, use) => {
        await context.route(`http://localhost:8080/config.json*`, async (route) => {
            await route.fulfill({ json: config });
        });
        await use(page);
    },

    startHomeserverOpts: "default",
    homeserver: async ({ request, startHomeserverOpts: opts }, use) => {
        if (typeof opts === "string") {
            opts = { template: opts };
        }

        const server = new Synapse(request);
        await use(await server.start(opts));
        await server.stop();
    },

    user: async ({ page, homeserver }, use) => {
        const names = ["Alice", "Bob", "Charlie", "Daniel", "Eve", "Frank", "Grace", "Hannah", "Isaac", "Judy"];
        const username = _.uniqueId("user_");
        const password = _.uniqueId("password_");
        const displayName = _.sample(names)!;

        const credentials = await homeserver.registerUser(username, password, displayName);
        console.log(`Registered test user ${username} with displayname ${displayName}`);

        await page.goto("/");
        await page.evaluate(
            ({ baseUrl, credentials }) => {
                // Seed the localStorage with the required credentials
                window.localStorage.setItem("mx_hs_url", baseUrl);
                window.localStorage.setItem("mx_user_id", credentials.userId);
                window.localStorage.setItem("mx_access_token", credentials.accessToken);
                window.localStorage.setItem("mx_device_id", credentials.deviceId);
                window.localStorage.setItem("mx_is_guest", "false");
                window.localStorage.setItem("mx_has_pickle_key", "false");
                window.localStorage.setItem("mx_has_access_token", "true");

                // Ensure the language is set to a consistent value
                window.localStorage.setItem("mx_local_settings", '{"language":"en"}');
            },
            { baseUrl: homeserver.config.baseUrl, credentials },
        );
        await page.addInitScript(() => {
            // reset notification permissions, so we have predictable behaviour of notifications toast
            Object.assign(window.Notification, { permission: "default" });
        });
        await page.reload(); // We have to reload to have the app read the credentials we injected

        await page.waitForSelector(".mx_MatrixChat", { timeout: 30000 });

        await use({
            ...credentials,
            displayName,
        });
    },
});

test.use({});

export { expect } from "@playwright/test";
