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

/// <reference types="cypress" />

import PluginEvents = Cypress.PluginEvents;
import PluginConfigOptions = Cypress.PluginConfigOptions;
import { dockerRun, dockerStop } from "../docker";
import { getFreePort } from "../utils/port";
import { SynapseInstance } from "../synapsedocker";

// A cypress plugins to add command to start & stop https://github.com/matrix-org/sliding-sync

interface ProxyInstance {
    containerId: string;
    postgresId: string;
    port: number;
}

const POSTGRES_PASSWORD = "p4S5w0rD";

async function proxyStart(synapse: SynapseInstance): Promise<ProxyInstance> {
    console.log("Starting sliding sync proxy...");

    const postgresId = await dockerRun({
        image: "postgres",
        containerName: "react-sdk-cypress-sliding-sync-postgres",
        params: [
            "-e", `POSTGRES_PASSWORD=${POSTGRES_PASSWORD}`,
        ],
    });

    const port = await getFreePort();
    const containerId = await dockerRun({
        image: "ghcr.io/matrix-org/sliding-sync-proxy",
        containerName: "react-sdk-cypress-sliding-sync-proxy",
        params: [
            "--rm",
            "-p", `${port}:8008/tcp`,
            "--network", postgresId,
            "-e", `SYNCV3_SERVER=${synapse.baseUrl}`,
            "-e", `SYNCV3_DB="user=postgres dbname=postgres password=${POSTGRES_PASSWORD} ` +
                `host=react-sdk-cypress-sliding-sync-postgres sslmode=disable"`,
        ],
    });

    return { containerId, postgresId, port };
}

async function proxyStop(instance: ProxyInstance): Promise<void> {
    await dockerStop({
        containerId: instance.containerId,
    });
    await dockerStop({
        containerId: instance.postgresId,
    });

    console.log("Stopped sliding sync proxy.");
    // cypress deliberately fails if you return 'undefined', so
    // return null to signal all is well, and we've handled the task.
    return null;
}

/**
 * @type {Cypress.PluginConfig}
 */
export function slidingSyncProxyDocker(on: PluginEvents, config: PluginConfigOptions) {
    on("task", {
        proxyStart,
        proxyStop,
    });
}
