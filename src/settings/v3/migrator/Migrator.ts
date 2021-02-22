/*
 * Copyright 2021 The Matrix.org Foundation C.I.C.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *         http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import { Migration } from "./Migration";
import { iterableUnion } from "../../../utils/iterables";
import { NameMigration } from "./NameMigration";

const LS_RUN_HISTORY = "mx_settings_migration_history";

export class Migrator {
    private static migrations: Migration[] = [
        new NameMigration(<any>"test", <any>"test2"),
    ];

    private constructor() {
        // static only
    }

    public static async run(): Promise<void> {
        console.log(`[Migrator] Starting migrations...`);
        const lsFlagged = localStorage.getItem(LS_RUN_HISTORY);
        const doneMigrations = new Set<string>();
        if (lsFlagged) {
            (<string[]>JSON.parse(lsFlagged)).forEach(r => doneMigrations.add(r));
        }

        for (const migration of this.migrations) {
            if (doneMigrations.has(migration.id)) {
                console.log(`[Migrator] Skipping migration: ${migration.id}`);
                continue;
            }
            console.log(`[Migrator] Running migration: ${migration.id}`);
            await migration.run();
            doneMigrations.add(migration.id);
        }

        const possibleIds = new Set(this.migrations.map(m => m.id));
        const union = Array.from(iterableUnion(possibleIds, doneMigrations));
        localStorage.setItem(LS_RUN_HISTORY, JSON.stringify(union));

        console.log(`[Migrator] Done. ` +
            `${possibleIds.size} complete, ` +
            `${doneMigrations.size} recorded as done, ` +
            `${union.length} persisted as complete`);
    }
}
