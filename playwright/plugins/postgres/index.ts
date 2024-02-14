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

import { Docker } from "../docker";

export const PG_PASSWORD = "p4S5w0rD";

export abstract class WithPostgres {
    protected readonly postgresDocker = new Docker();

    protected async waitForPostgresReady(): Promise<void> {
        const waitTimeMillis = 30000;
        const startTime = new Date().getTime();
        let lastErr: Error | null = null;
        while (new Date().getTime() - startTime < waitTimeMillis) {
            try {
                await this.postgresDocker.exec(["pg_isready", "-U", "postgres"]);
                lastErr = null;
                break;
            } catch (err) {
                console.log("pg_isready: failed");
                lastErr = err;
            }
        }
        if (lastErr) {
            console.log("rethrowing");
            throw lastErr;
        }
    }

    protected async startPostgres(id: string): Promise<{
        postgresIp: string;
        postgresId: string;
    }> {
        console.log(new Date(), "Starting sliding sync proxy...");

        const postgresId = await this.postgresDocker.run({
            image: "postgres",
            containerName: `react-sdk-playwright-postgres-${id}`,
            params: ["-e", `POSTGRES_PASSWORD=${PG_PASSWORD}`],
        });

        const postgresIp = await this.postgresDocker.getContainerIp();
        console.log(new Date(), "postgres container up");

        await this.waitForPostgresReady();
        return { postgresIp, postgresId };
    }
}
