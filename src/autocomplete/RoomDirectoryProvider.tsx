/*
Copyright 2020 The Matrix.org Foundation C.I.C.

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

import * as React from 'react';
import MatrixClient from "matrix-js-sdk/src/client";
import { _t } from '../languageHandler';
import AutocompleteProvider from './AutocompleteProvider';
import {MatrixClientPeg} from '../MatrixClientPeg';
import QueryMatcher from './QueryMatcher';
import {PillCompletion} from './Components';
import * as sdk from '../index';
import _sortBy from 'lodash/sortBy';
import {makeRoomPermalink} from "../utils/permalinks/Permalinks";
import {ICompletion, ISelectionRange} from "./Autocompleter";
import dis from "../dispatcher";

const ROOM_REGEX = /\B#\S*/g;

function score(query: string, space: string) {
    const index = space.indexOf(query);
    if (index === -1) {
        return Infinity;
    } else {
        return index;
    }
}

const matcher = new QueryMatcher([], {
    keys: ['displayedAlias', 'name'],
});

const NUM_PUBLIC_ROOMS = 100;
const POLL_PUBLIC_ROOMS_INTERVAL = 10 * 60 * 1000; // 10 minutes

interface IEntry {
    roomId: string;
    alias: string;
    name?: string;
    avatarUrl?: string;
}

let matrixClient: MatrixClient;
async function updatePublicRooms() {
    if (!matrixClient) return;

    const servers = [MatrixClientPeg.getHomeserverName()];

    const promises = servers.map(server => {
        const opts = { limit: NUM_PUBLIC_ROOMS };
        if (server !== MatrixClientPeg.getHomeserverName()) {
            opts["server"] = server;
        }

        return matrixClient.publicRooms(opts);
    });

    const entries: IEntry[] = [];
    for (const promise of promises) {
        try {
            const data = await promise;
            data.chunk.forEach(room => {
                [room.canonical_alias, ...(room.aliases || [])].forEach(alias => {
                    entries.push({
                        name: room.name,
                        avatarUrl: room.avatar_url,
                        roomId: room.room_id,
                        alias,
                    });
                });
            });
        } catch (e) {
            console.error(e);
        } // fail-safe
    }
    matcher.setObjects(entries);
}

let interval;
dis.register((payload) => {
    switch (payload.action) {
        case "on_logged_in":
            if (!interval) {
                interval = setInterval(updatePublicRooms, POLL_PUBLIC_ROOMS_INTERVAL);
            }

            matrixClient = MatrixClientPeg.get();
            updatePublicRooms();
            break;

        case "on_logged_out":
            if (interval) {
                clearInterval(interval);
                interval = undefined;
            }
            matrixClient = undefined;
            break;
    }
});

const RESULTS_LIMIT = 8;

export default class RoomDirectoryProvider extends AutocompleteProvider {
    constructor() {
        super(ROOM_REGEX);
    }

    async getCompletions(query: string, selection: ISelectionRange, force = false): Promise<ICompletion[]> {
        const RoomAvatar = sdk.getComponent('views.avatars.RoomAvatar');

        const client = MatrixClientPeg.get();
        let completions: IEntry[] = [];
        const {command, range} = this.getCurrentCommand(query, selection, force);
        if (command) {
            const matchedString = command[0];
            completions = matcher.match(matchedString).filter(({alias, roomId}) => {
                return !client.getRoom(roomId) && alias && alias.length > 0;
            });
            completions = _sortBy(completions, [
                (c: IEntry) => score(matchedString, c.alias),
                (c: IEntry) => c.alias.length,
            ]);
            return completions.map((room: IEntry): ICompletion => {
                const avatar = (
                    <RoomAvatar width={24} height={24} oobData={{ avatarUrl: room.avatarUrl, name: room.name }} />
                );
                return {
                    completion: room.alias,
                    completionId: room.roomId,
                    type: "room",
                    suffix: ' ',
                    href: makeRoomPermalink(room.alias),
                    component: (
                        <PillCompletion initialComponent={avatar} title={room.name} description={room.alias} />
                    ),
                    range,
                };
            }).slice(0, RESULTS_LIMIT);
        }
        return [];
    }

    getName() {
        return '💬 ' + _t('Room Directory');
    }

    renderCompletions(completions: React.ReactNode[]): React.ReactNode {
        return (
            <div
                className="mx_Autocomplete_Completion_container_pill mx_Autocomplete_Completion_container_truncate"
                role="listbox"
                aria-label={_t("Room Directory Autocomplete")}
            >
                { completions }
            </div>
        );
    }
}
