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

/// <reference types="cypress" />

import * as path from "path";
import * as os from "os";
import * as crypto from "crypto";
import * as fse from "fs-extra";

import PluginEvents = Cypress.PluginEvents;
import PluginConfigOptions = Cypress.PluginConfigOptions;
import { getFreePort } from "../utils/port";
import { dockerExec, dockerLogs, dockerRun, dockerStop } from "../docker";

// A cypress plugins to add command to start & stop dendrites in
// docker with preset templates.

interface DendriteConfig {
    configDir: string;
    registrationSecret: string;
    // Dendrite must be configured with its public_baseurl so we have to allocate a port & url at this stage
    baseUrl: string;
    port: number;
}

export interface DendriteInstance extends DendriteConfig {
    dendriteId: string;
}

const dendrites = new Map<string, DendriteInstance>();

function randB64Bytes(numBytes: number): string {
    return crypto.randomBytes(numBytes).toString("base64").replace(/=*$/, "");
}

async function cfgDirFromTemplate(template: string): Promise<DendriteConfig> {
    template = "default"
    const templateDir = path.join(__dirname, "templates", template);
    const configFile = "dendrite.yaml";

    const stats = await fse.stat(templateDir);
    if (!stats?.isDirectory) {
        throw new Error(`No such template: ${template}`);
    }
    const tempDir = await fse.mkdtemp(path.join(os.tmpdir(), "react-sdk-dendritedocker-"));

    // copy the contents of the template dir, omitting homeserver.yaml as we'll template that
    console.log(`Copy ${templateDir} -> ${tempDir}`);
    await fse.copy(templateDir, tempDir, { filter: (f) => path.basename(f) !== configFile });

    const registrationSecret = randB64Bytes(16);

    const port = await getFreePort();
    const baseUrl = `http://localhost:${port}`;

    // now copy homeserver.yaml, applying substitutions
    console.log(`Gen ${path.join(templateDir, configFile)}`);
    let hsYaml = await fse.readFile(path.join(templateDir, configFile), "utf8");
    hsYaml = hsYaml.replace(/{{REGISTRATION_SECRET}}/g, registrationSecret);
    await fse.writeFile(path.join(tempDir, configFile), hsYaml);

    await dockerRun({
        image: "matrixdotorg/dendrite-monolith:main",
        params: ["--rm", "--entrypoint=", "-v", `${tempDir}:/mnt`],
        containerName: `react-sdk-cypress-dendrite-keygen`,
        cmd: ["/usr/bin/generate-keys", "-private-key", "/mnt/matrix_key.pem"],
    });

    return {
        port,
        baseUrl,
        configDir: tempDir,
        registrationSecret,
    };
}

// TODO (devon): this is the unique per homeserver 
// Start a dendrite instance: the template must be the name of
// one of the templates in the cypress/plugins/dendritedocker/templates
// directory
async function dendriteStart(template: string): Promise<DendriteInstance> {
    const denCfg = await cfgDirFromTemplate(template);

    console.log(`Starting dendrite with config dir ${denCfg.configDir}...`);

    const dendriteId = await dockerRun({
        image: "matrixdotorg/dendrite-monolith:main",
        params: ["--rm", "-v", `${denCfg.configDir}:/etc/dendrite`, "-p", `${denCfg.port}:8008/tcp`],
        containerName: `react-sdk-cypress-dendrite`,
        cmd: ["run"],
    });

    console.log(`Started dendrite with id ${dendriteId} on port ${denCfg.port}.`);

    // Await Dendrite healthcheck
    await dockerExec({
        containerId: dendriteId,
        params: [
            "curl",
            "--connect-timeout",
            "30",
            "--retry",
            "30",
            "--retry-delay",
            "1",
            "--retry-all-errors",
            "--silent",
            "http://localhost:8008/_matrix/client/versions",
        ],
    });

    const dendrite: DendriteInstance = { dendriteId, ...denCfg };
    dendrites.set(dendriteId, dendrite);
    return dendrite;
}

// TODO (devon): this is the same for all homeservers 
async function dendriteStop(id: string): Promise<void> {
    const denCfg = dendrites.get(id);

    if (!denCfg) throw new Error("Unknown dendrite ID");

    const dendriteLogsPath = path.join("cypress", "dendritelogs", id);
    await fse.ensureDir(dendriteLogsPath);

    await dockerLogs({
        containerId: id,
        stdoutFile: path.join(dendriteLogsPath, "stdout.log"),
        stderrFile: path.join(dendriteLogsPath, "stderr.log"),
    });

    await dockerStop({
        containerId: id,
    });

    await fse.remove(denCfg.configDir);

    dendrites.delete(id);

    console.log(`Stopped dendrite id ${id}.`);
    // cypress deliberately fails if you return 'undefined', so
    // return null to signal all is well, and we've handled the task.
    return null;
}

// TODO (devon): this is the same for all homeservers 
/**
 * @type {Cypress.PluginConfig}
 */
export function dendriteDocker(on: PluginEvents, config: PluginConfigOptions) {
    on("task", {
        dendriteStart,
        dendriteStop,
    });

    on("after:spec", async (spec) => {
        // Cleans up any remaining dendrite instances after a spec run
        // This is on the theory that we should avoid re-using dendrite
        // instances between spec runs: they should be cheap enough to
        // start that we can have a separate one for each spec run or even
        // test. If we accidentally re-use dendrites, we could inadvertently
        // make our tests depend on each other.
        for (const denId of dendrites.keys()) {
            console.warn(`Cleaning up dendrite ID ${denId} after ${spec.name}`);
            await dendriteStop(denId);
        }
    });

    on("before:run", async () => {
        // tidy up old dendrite log files before each run
        await fse.emptyDir(path.join("cypress", "dendritelogs"));
    });
}
