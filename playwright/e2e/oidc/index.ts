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

import { test as base, expect } from "../../element-web-test";
import { MatrixAuthenticationService } from "../../plugins/matrix-authentication-service";

export const test = base.extend<{
    mas: MatrixAuthenticationService;
}>({
    mas: async ({ context }, use) => {
        const mas = new MatrixAuthenticationService(context);
        await use(mas);
    },
    startHomeserverOpts: async ({ mas }, use) => {
        const { port: masPort } = await mas.prepare();
        await use({
            template: "mas-oidc",
            variables: {
                MAS_PORT: masPort,
            },
        });
    },
    homeserver: async ({ mailhog, homeserver, mas }, use) => {
        await mas.start(homeserver, mailhog.instance);
        await use(homeserver);
        await mas.stop();
    },
    config: ({ homeserver }, use) =>
        use({
            default_server_config: {
                "m.homeserver": {
                    base_url: homeserver.config.baseUrl,
                },
            },
        }),
});

export { expect };
