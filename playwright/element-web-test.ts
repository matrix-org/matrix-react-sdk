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

import { ElementAppPage } from "./pages/ElementAppPage";

const CONFIG_JSON = {
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

export const test = base.extend({
    page: async ({ context, page }, use) => {
        await context.route(`http://localhost:8080/config.json*`, async (route) => {
            await route.fulfill({ json: CONFIG_JSON });
        });

        await use(page);
    },
    app: async ({ page, request }, use) => {
        await use(new ElementAppPage(page, request));
    },
});

export { expect } from "@playwright/test";
