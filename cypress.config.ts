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

import { defineConfig } from "cypress";

import registerPlugins from "./cypress/plugins";

export default defineConfig({
    videoUploadOnPasses: false,
    projectId: "ppvnzg",
    experimentalInteractiveRunEvents: true,
    experimentalMemoryManagement: true,
    defaultCommandTimeout: 10000,
    chromeWebSecurity: false,
    e2e: {
        setupNodeEvents(on, config) {
            return registerPlugins(on, config);
        },
        baseUrl: "http://localhost:8080",
        specPattern: "cypress/e2e/**/*.spec.{js,jsx,ts,tsx}",
    },
    env: {
        // Docker tag to use for `ghcr.io/matrix-org/sliding-sync` image.
        SLIDING_SYNC_PROXY_TAG: "v0.99.3",
        HOMESERVER: "synapse",
    },
    retries: {
        runMode: 4,
        openMode: 0,
    },

    // disable logging of HTTP requests made to the Cypress server. They are noisy and not very helpful.
    // @ts-ignore https://github.com/cypress-io/cypress/issues/26284
    morgan: false,

    // Create XML result files
    reporter: "cypress-multi-reporters",
    reporterOptions: {
        configFile: "cypress-ci-reporter-config.json",
    },
});
