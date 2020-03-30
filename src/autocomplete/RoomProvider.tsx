/*
Copyright 2016 Aviral Dasgupta
Copyright 2017 Vector Creations Ltd
Copyright 2017, 2018 New Vector Ltd
Copyright 2018 Michael Telatynski <7t3chguy@gmail.com>
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

import * as React from "react";
import {MatrixClient} from "matrix-js-sdk/src/client";
import {Room} from "matrix-js-sdk/src/models/room";

import { _t } from '../languageHandler';
import AutocompleteProvider from './AutocompleteProvider';
import {MatrixClientPeg} from '../MatrixClientPeg';
import QueryMatcher from './QueryMatcher';
import {PillCompletion} from './Components';
import * as sdk from '../index';
import _sortBy from 'lodash/sortBy';
import {makeRoomPermalink} from "../utils/permalinks/Permalinks";
import {Completion, SelectionRange} from "./Autocompleter";
import dis from "../dispatcher";

const ROOM_REGEX = /\B#\S*/g;

function score(query, space) {
    const index = space.indexOf(query);
    if (index === -1) {
        return Infinity;
    } else {
        return index;
    }
}

interface IMatcherObject {
    room?: Room;
    name: string;
    roomId: string;
    avatarUrl?: string;
    matchName: string;
    displayedAlias: string;
}

function matcherObject(room, displayedAlias, matchName = ""): IMatcherObject {
    return {
        room,
        matchName,
        displayedAlias,
        name: room.name,
        roomId: room.roomId,
    };
}

const publicRoomsMatcher = new QueryMatcher([], {
    keys: ['displayedAlias', 'matchName'],
});

const NUM_PUBLIC_ROOMS = 100;
const POLL_PUBLIC_ROOMS_INTERVAL = 10 * 60 * 1000; // 10 minutes

let matrixClient: MatrixClient;
async function updatePublicRooms() {
    if (!matrixClient) return;

    const servers = [MatrixClientPeg.getHomeserverName()];

    const promises = servers.map(server => {
        const opts = { limit: NUM_PUBLIC_ROOMS };
        if (server != MatrixClientPeg.getHomeserverName()) {
            opts["server"] = server;
        }

        return matrixClient.publicRooms(opts);
    });

    const entries = [];
    for (const promise of promises) {
        try {
            const data = await promise;
            data.chunk.forEach(room => {
                [room.canonical_alias, ...(room.aliases || [])].forEach(alias => {
                    entries.push({
                        name: room.name,
                        roomId: room.room_id,
                        matchName: room.name,
                        displayedAlias: alias,
                        avatarUrl: room.avatar_url,
                    });
                });
            });
        } catch (e) {
            console.error(e);
        } // fail-safe
    }
    publicRoomsMatcher.setObjects(entries);
}

interface IDispatch {
    action: string;
}

let interval;
dis.register((payload: IDispatch) => {
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

const RESULTS_LIMIT = 16;

// This Provider avoids rebuilding its dataset and only does so on confirmed changes.
// it also pulls data from a global polling query matcher backed by the room directory of the current HS
export default class RoomProvider extends AutocompleteProvider {
    matcher: QueryMatcher;
    cli: MatrixClient;

    constructor() {
        super(ROOM_REGEX);
        this.matcher = new QueryMatcher([], {
            keys: ['displayedAlias', 'matchName'],
        });

        this.cli = MatrixClientPeg.get();
        this.cli.on("Room", this.updateRooms);
        this.cli.on("Room.name", this.updateRooms);
        this.updateRooms();
    }

    destroy() {
        super.destroy();
        this.cli.off("Room", this.updateRooms);
        this.cli.off("Room.name", this.updateRooms);
    }

    private updateRooms = () => {
        // the only reason we need to do this is because Fuse only matches on properties
        let matcherObjects = this.cli.getVisibleRooms().reduce((aliases, room) => {
            if (room.getCanonicalAlias()) {
                aliases = aliases.concat(matcherObject(room, room.getCanonicalAlias(), room.name));
            }
            if (room.getAltAliases().length) {
                const altAliases = room.getAltAliases().map(alias => matcherObject(room, alias));
                aliases = aliases.concat(altAliases);
            }
            return aliases;
        }, []);
        // Filter out any matches where the user will have also autocompleted new rooms
        matcherObjects = matcherObjects.filter((r) => {
            const tombstone = r.room.currentState.getStateEvents("m.room.tombstone", "");
            if (tombstone && tombstone.getContent() && tombstone.getContent()['replacement_room']) {
                const hasReplacementRoom = matcherObjects.some(
                    (r2) => r2.room.roomId === tombstone.getContent()['replacement_room'],
                );
                return !hasReplacementRoom;
            }
            return true;
        });

        this.matcher.setObjects(matcherObjects);
    };

    async getCompletions(query: string, selection: SelectionRange, force: boolean = false): Promise<Array<Completion>> {
        const RoomAvatar = sdk.getComponent('views.avatars.RoomAvatar');

        let completions = [];
        const {command, range} = this.getCurrentCommand(query, selection, force);
        if (command) {
            const matchedString = command[0];
            completions = this.matcher.match(matchedString);
            completions = completions.filter(({displayedAlias}) => displayedAlias && displayedAlias.length > 0);

            completions = _sortBy(completions, [
                (c) => score(matchedString, c.displayedAlias),
                (c) => c.displayedAlias.length,
            ]);

            // if we do not have enough results then pull some from public rooms, prioritising joined rooms
            if (completions.length < RESULTS_LIMIT) {
                completions = [...completions, ..._sortBy(publicRoomsMatcher.match(matchedString), [
                    (c) => score(matchedString, c.displayedAlias),
                    (c) => c.displayedAlias.length,
                ])];
            }

            completions = completions.slice(0, RESULTS_LIMIT).map((room) => {
                const avatar = (
                    <RoomAvatar width={24} height={24} room={room.room} oobData={{avatarUrl: room.avatarUrl, name: room.name}} />
                );
                return {
                    completion: room.displayedAlias,
                    completionId: room.roomId,
                    type: "room",
                    suffix: ' ',
                    href: makeRoomPermalink(room.displayedAlias),
                    component: (
                        <PillCompletion initialComponent={avatar} title={room.name} description={room.displayedAlias} />
                    ),
                    range,
                };
            });
        }
        return completions;
    }

    getName() {
        return '💬 ' + _t('Rooms');
    }

    renderCompletions(completions: [React.Component]): React.ReactNode {
        return (
            <div
                className="mx_Autocomplete_Completion_container_pill mx_Autocomplete_Completion_container_truncate"
                role="listbox"
                aria-label={_t("Room Autocomplete")}
            >
                { completions }
            </div>
        );
    }
}
