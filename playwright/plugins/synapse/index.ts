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

import * as path from "path";
import * as os from "os";
import * as crypto from "crypto";
import * as fse from "fs-extra";

import { getFreePort } from "../utils/port";
import { Docker } from "../docker";
import { HomeserverConfig, HomeserverInstance } from "../utils/homeserver";

export interface StartHomeserverOpts {
    /** path to template within cypress/plugins/{homeserver}docker/template/ directory. */
    template: string;

    /** Port of an OAuth server to configure the homeserver to use */
    oAuthServerPort?: number;

    /** Additional variables to inject into the configuration template **/
    variables?: Record<string, string | number>;
}

function randB64Bytes(numBytes: number): string {
    return crypto.randomBytes(numBytes).toString("base64").replace(/=*$/, "");
}

async function cfgDirFromTemplate(opts: StartHomeserverOpts): Promise<HomeserverConfig> {
    const templateDir = path.join(__dirname, "templates", opts.template);

    const stats = await fse.stat(templateDir);
    if (!stats?.isDirectory) {
        throw new Error(`No such template: ${opts.template}`);
    }
    const tempDir = await fse.mkdtemp(path.join(os.tmpdir(), "react-sdk-synapsedocker-"));

    // copy the contents of the template dir, omitting homeserver.yaml as we'll template that
    console.log(`Copy ${templateDir} -> ${tempDir}`);
    await fse.copy(templateDir, tempDir, { filter: (f) => path.basename(f) !== "homeserver.yaml" });

    const registrationSecret = randB64Bytes(16);
    const macaroonSecret = randB64Bytes(16);
    const formSecret = randB64Bytes(16);

    const port = await getFreePort();
    const baseUrl = `http://localhost:${port}`;

    // now copy homeserver.yaml, applying substitutions
    const templateHomeserver = path.join(templateDir, "homeserver.yaml");
    const outputHomeserver = path.join(tempDir, "homeserver.yaml");
    console.log(`Gen ${templateHomeserver} -> ${outputHomeserver}`);
    let hsYaml = await fse.readFile(templateHomeserver, "utf8");
    hsYaml = hsYaml.replace(/{{REGISTRATION_SECRET}}/g, registrationSecret);
    hsYaml = hsYaml.replace(/{{MACAROON_SECRET_KEY}}/g, macaroonSecret);
    hsYaml = hsYaml.replace(/{{FORM_SECRET}}/g, formSecret);
    hsYaml = hsYaml.replace(/{{PUBLIC_BASEURL}}/g, baseUrl);
    if (opts.oAuthServerPort) {
        hsYaml = hsYaml.replace(/{{OAUTH_SERVER_PORT}}/g, opts.oAuthServerPort.toString());
    }
    hsYaml = hsYaml.replace(/{{HOST_DOCKER_INTERNAL}}/g, await Docker.hostnameOfHost());
    if (opts.variables) {
        let fetchedHostContainer: Awaited<ReturnType<typeof Docker.hostnameOfHost>> | null = null;
        for (const key in opts.variables) {
            let value = String(opts.variables[key]);

            if (value === "{{HOST_DOCKER_INTERNAL}}") {
                if (!fetchedHostContainer) {
                    fetchedHostContainer = await Docker.hostnameOfHost();
                }
                value = fetchedHostContainer;
            }

            hsYaml = hsYaml.replace(new RegExp("%" + key + "%", "g"), value);
        }
    }

    await fse.writeFile(outputHomeserver, hsYaml);

    // now generate a signing key (we could use synapse's config generation for
    // this, or we could just do this...)
    // NB. This assumes the homeserver.yaml specifies the key in this location
    const signingKey = randB64Bytes(32);
    const outputSigningKey = path.join(tempDir, "localhost.signing.key");
    console.log(`Gen -> ${outputSigningKey}`);
    await fse.writeFile(outputSigningKey, `ed25519 x ${signingKey}`);

    return {
        port,
        baseUrl,
        configDir: tempDir,
        registrationSecret,
    };
}

export class Synapse {
    private docker: Docker = new Docker();
    private instance: HomeserverInstance;

    /**
     * Start a synapse instance: the template must be the name of
     * one of the templates in the cypress/plugins/synapsedocker/templates
     * directory.
     *
     * Any value in opts.variables that is set to `{{HOST_DOCKER_INTERNAL}}'
     * will be replaced with 'host.docker.internal' (if we are on Docker) or
     * 'host.containers.interal' if we are on Podman.
     */
    async start(opts: StartHomeserverOpts): Promise<HomeserverInstance> {
        const synCfg = await cfgDirFromTemplate(opts);
        console.log(`Starting synapse with config dir ${synCfg.configDir}...`);
        const dockerSynapseParams = ["--rm", "-v", `${synCfg.configDir}:/data`, "-p", `${synCfg.port}:8008/tcp`];
        if (await Docker.isPodman()) {
            // Make host.containers.internal work to allow Synapse to talk to the
            // test OIDC server.
            dockerSynapseParams.push("--network");
            dockerSynapseParams.push("slirp4netns:allow_host_loopback=true");
        } else {
            // Make host.docker.internal work to allow Synapse to talk to the test
            // OIDC server.
            dockerSynapseParams.push("--add-host");
            dockerSynapseParams.push("host.docker.internal:host-gateway");
        }
        const synapseId = await this.docker.run({
            image: "matrixdotorg/synapse:develop",
            containerName: `react-sdk-cypress-synapse`,
            params: dockerSynapseParams,
            cmd: ["run"],
        });
        console.log(`Started synapse with id ${synapseId} on port ${synCfg.port}.`);
        // Await Synapse healthcheck
        await this.docker.exec([
            "curl",
            "--connect-timeout",
            "30",
            "--retry",
            "30",
            "--retry-delay",
            "1",
            "--retry-all-errors",
            "--silent",
            "http://localhost:8008/health",
        ]);
        const host = await this.docker.getContainerIp();
        const synapse: HomeserverInstance = { serverId: synapseId, ...synCfg, host };
        this.instance = synapse;
        return synapse;
    }

    async stop(): Promise<void> {
        if (!this.instance) throw new Error("Missing existing synapse instance, did you call stop() before start()?");
        const id = this.instance.serverId;
        const synapseLogsPath = path.join("cypress", "synapselogs", id);
        await fse.ensureDir(synapseLogsPath);
        await this.docker.persistLogsToFile({
            stdoutFile: path.join(synapseLogsPath, "stdout.log"),
            stderrFile: path.join(synapseLogsPath, "stderr.log"),
        });
        await this.docker.stop();
        await fse.remove(this.instance.configDir);
        console.log(`Stopped synapse id ${id}.`);
    }
}

// /**
//  * @type {Cypress.PluginConfig}
//  */
// export function synapseDocker(on: PluginEvents, config: PluginConfigOptions) {
//     on("task", {
//         synapseStart,
//         synapseStop,
//     });

//     on("after:spec", async (spec) => {
//         // Cleans up any remaining synapse instances after a spec run
//         // This is on the theory that we should avoid re-using synapse
//         // instances between spec runs: they should be cheap enough to
//         // start that we can have a separate one for each spec run or even
//         // test. If we accidentally re-use synapses, we could inadvertently
//         // make our tests depend on each other.
//         for (const synId of synapses.keys()) {
//             console.warn(`Cleaning up synapse ID ${synId} after ${spec.name}`);
//             await synapseStop(synId);
//         }
//     });

//     on("before:run", async () => {
//         // tidy up old synapse log files before each run
//         await fse.emptyDir(path.join("cypress", "synapselogs"));
//     });
// }
