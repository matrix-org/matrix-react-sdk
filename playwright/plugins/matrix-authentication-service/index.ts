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

import path from "node:path";
import os from "node:os";
import * as fse from "fs-extra";
import { BrowserContext } from "@playwright/test";

import { getFreePort } from "../utils/port";
import { Docker } from "../docker";
import { PG_PASSWORD, WithPostgres } from "../postgres";
import { HomeserverInstance } from "../homeserver";
import { Instance as MailhogInstance } from "../mailhog";

// Docker tag to use for `ghcr.io/matrix-org/matrix-authentication-service` image.
const TAG = "0.8.0";

export interface ProxyInstance {
    containerId: string;
    postgresId: string;
    port: number;
}

async function cfgDirFromTemplate(opts: {
    postgresHost: string;
    synapseUrl: string;
    masPort: string;
    smtpPort: string;
}): Promise<{
    configDir: string;
}> {
    const configPath = path.join(__dirname, "config.yaml");
    const tempDir = await fse.mkdtemp(path.join(os.tmpdir(), "react-sdk-mas-"));

    const outputHomeserver = path.join(tempDir, "config.yaml");
    console.log(`Gen ${configPath} -> ${outputHomeserver}`);
    let config = await fse.readFile(configPath, "utf8");
    config = config.replace(/{{MAS_PORT}}/g, opts.masPort);
    config = config.replace(/{{POSTGRES_HOST}}/g, opts.postgresHost);
    config = config.replace(/{{POSTGRES_PASSWORD}}/g, PG_PASSWORD);
    config = config.replace(/%{{SMTP_PORT}}/g, opts.smtpPort);
    config = config.replace(/{{SYNAPSE_URL}}/g, opts.synapseUrl);
    config = config.replace(/{{HOST_DOCKER_INTERNAL}}/g, await Docker.hostnameOfHost());

    await fse.writeFile(outputHomeserver, config);

    // Allow anyone to read, write and execute in the temp directory
    // so that the DIND setup that we use to update the playwright screenshots work without any issues.
    await fse.chmod(tempDir, 0o757);

    return {
        configDir: tempDir,
    };
}

export class MatrixAuthenticationService extends WithPostgres {
    private readonly masDocker = new Docker();
    private instance: ProxyInstance;
    private port: number;

    constructor(private context: BrowserContext) {
        super();
    }

    async prepare(): Promise<{ port: number }> {
        this.port = await getFreePort();
        return { port: this.port };
    }

    async start(homeserver: HomeserverInstance, mailhog: MailhogInstance): Promise<ProxyInstance> {
        console.log(new Date(), "Starting mas...");

        const port = this.port;
        const { postgresId, postgresIp } = await this.startPostgres("mas");
        const { configDir } = await cfgDirFromTemplate({
            masPort: port.toString(),
            postgresHost: postgresIp,
            synapseUrl: homeserver.config.dockerUrl,
            smtpPort: mailhog.smtpPort.toString(),
        });

        const image = "ghcr.io/matrix-org/matrix-authentication-service:" + TAG;
        const containerName = "react-sdk-playwright-mas";

        console.log(new Date(), "migrating mas database...", TAG);
        await this.masDocker.run({
            image,
            containerName,
            params: ["-v", `${configDir}:/config`],
            cmd: ["database", "migrate", "--config", "/config/config.yaml"],
        });

        console.log(new Date(), "syncing mas config...", TAG);
        await this.masDocker.run({
            image,
            containerName,
            params: ["-v", `${configDir}:/config`],
            cmd: ["config", "sync", "--config", "/config/config.yaml"],
        });

        console.log(new Date(), "starting mas container...", TAG);
        const containerId = await this.masDocker.run({
            image,
            containerName,
            params: ["-p", `${port}:8080/tcp`, "-v", `${configDir}:/config`],
            cmd: ["server", "--config", "/config/config.yaml"],
        });
        console.log(new Date(), "started!");

        // Set up redirects
        const baseUrl = `http://localhost:${port}`;
        for (const path of [
            "**/_matrix/client/*/login",
            "**/_matrix/client/*/login/**",
            "**/_matrix/client/*/logout",
            "**/_matrix/client/*/refresh",
        ]) {
            await this.context.route(path, async (route) => {
                await route.continue({
                    url: new URL(route.request().url().split("/").slice(3).join("/"), baseUrl).href,
                });
            });
        }

        this.instance = { containerId, postgresId, port };
        return this.instance;
    }

    async stop(): Promise<void> {
        await this.postgresDocker.stop();
        await this.masDocker.stop();
        console.log(new Date(), "Stopped mas.");
    }
}
