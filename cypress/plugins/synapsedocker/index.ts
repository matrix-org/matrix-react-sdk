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

import path from "path";
import os from "os";
import * as crypto from "crypto";
import childProcess from "child_process";
import * as fse from "fs-extra"

// A cypress plugins to add command to start & stop synapses in
// docker with preset templates.

interface SynapseConfig {
    configDir: string;
    registrationSecret: string;
}

export interface SynapseInstance extends SynapseConfig {
    synapseId: string;
    port: number;
}

const synapses = new Map<string, SynapseInstance>();

function randB64Bytes(numBytes: number): string {
    return crypto.randomBytes(numBytes).toString("base64").replace(/=*$/, "");
}

async function cfgDirFromTemplate(template: string): Promise<SynapseConfig> {
    const templateDir = path.join(__dirname, "templates", template);

    const stats = await fse.stat(templateDir);
    if (!stats?.isDirectory) {
        throw new Error(`No such template: ${template}`);
    }
    const tempDir = await fse.mkdtemp(path.join(os.tmpdir(), 'react-sdk-synapsedocker-'));

    // change permissions on the temp directory so the docker container can see its contents
    await fse.chmod(tempDir, 0o777);

    // copy the contents of the template dir, omitting homeserver.yaml as we'll template that
    console.log(`Copy ${templateDir} -> ${tempDir}`);
    await fse.copy(templateDir, tempDir, { filter: f => path.basename(f) !== 'homeserver.yaml' });

    const registrationSecret = randB64Bytes(16);
    const macaroonSecret = randB64Bytes(16);
    const formSecret = randB64Bytes(16);

    // now copy homeserver.yaml, applying sustitutions
    console.log(`Gen ${path.join(templateDir, "homeserver.yaml")}`);
    let hsYaml = await fse.readFile(path.join(templateDir, "homeserver.yaml"), "utf8");
    hsYaml = hsYaml.replace(/{{REGISTRATION_SECRET}}/g, registrationSecret);
    hsYaml = hsYaml.replace(/{{MACAROON_SECRET_KEY}}/g, macaroonSecret);
    hsYaml = hsYaml.replace(/{{FORM_SECRET}}/g, formSecret);
    await fse.writeFile(path.join(tempDir, "homeserver.yaml"), hsYaml);

    // now generate a signing key (we could use synapse's config generation for
    // this, or we could just do this...)
    // NB. This assumes the homeserver.yaml specifies the key in this location
    const signingKey = randB64Bytes(32);
    console.log(`Gen ${path.join(templateDir, "localhost.signing.key")}`);
    await fse.writeFile(path.join(tempDir, "localhost.signing.key"), `ed25519 x ${signingKey}`);

    return {
        configDir: tempDir,
        registrationSecret,
    };
}

/**
 * @type {Cypress.PluginConfig}
 */
// eslint-disable-next-line no-unused-vars
export function synapseDocker(on, config) {
    on("task", {
        // Start a synapse instance: the template must be the name of
        // one of the templates in the cypress/plugins/synapsedocker/templates
        // directory
        async synapseStart(template: string): Promise<SynapseInstance> {
            const synCfg = await cfgDirFromTemplate(template);

            console.log(`Starting synapse with config dir ${synCfg.configDir}...`);

            const synapseId = await new Promise<string>((resolve, reject) => {
                childProcess.execFile('docker', [
                    "run",
                    "-d",
                    "-v", `${synCfg.configDir}:/data`,
                    "-p", "8008/tcp",
                    "matrixdotorg/synapse",
                    "run",
                ], (err, stdout) => {
                    if (err) reject(err);
                    resolve(stdout.trim());
                });
            });

            // Get the port that docker allocated: specifying only one
            // port above leaves docker to just grab a free one, although
            // in hindsight we need to put the port in public_baseurl in the
            // config really, so this will probably need changing to use a fixed
            // / configured port.
            const port = await new Promise<number>((resolve, reject) => {
                childProcess.execFile('docker', [
                    "port", synapseId, "8008",
                ], { encoding: 'utf8' }, (err, stdout) => {
                    if (err) reject(err);
                    resolve(Number(stdout.trim().split(":")[1]));
                });
            });

            synapses.set(synapseId, Object.assign({
                port,
                synapseId,
            }, synCfg));

            console.log(`Started synapse with id ${synapseId} on port ${port}.`);
            return synapses.get(synapseId);
        },
        async synapseStop(id) {
            const synCfg = synapses.get(id);

            if (!synCfg) throw new Error("Unknown synapse ID");

            const dockerLogsPath = path.join("cypress", "dockerlogs", id);
            await fse.ensureDir(dockerLogsPath);

            await new Promise<void>((resolve, reject) => {
                childProcess.execFile('docker', [
                    "logs",
                    id,
                ], async (err, stdout, stderr) => {
                    if (err) reject(err);
                    await fse.writeFile(path.join(dockerLogsPath, "stdout.log"), stdout);
                    await fse.writeFile(path.join(dockerLogsPath, "stderr.log"), stderr);
                    resolve();
                });
            });

            await new Promise<void>((resolve, reject) => {
                childProcess.execFile('docker', [
                    "stop",
                    id,
                ], err => {
                    if (err) reject(err);
                    resolve();
                });
            });

            await new Promise<void>((resolve, reject) => {
                childProcess.execFile('docker', [
                    "rm",
                    id,
                ], err => {
                    if (err) reject(err);
                    resolve();
                });
            });

            await fse.remove(synCfg.configDir);

            synapses.delete(id);

            console.log(`Stopped synapse id ${id}.`);
            // apparently returning 'undefined' here means the task never
            // returns on the other side. returning 'null' is fine though...
            return null;
        },
    });
}
