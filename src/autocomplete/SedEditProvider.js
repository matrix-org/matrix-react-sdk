/*
Copyright 2019 The Matrix.org Foundation C.I.C.

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

import React from 'react';

import { _t } from '../languageHandler';
import AutocompleteProvider from './AutocompleteProvider';
import {PillCompletion} from './Components';
import type {Completion, SelectionRange} from "./Autocompleter";
import {findEditableEvent} from "../utils/EventUtils";
import SettingsStore from "../settings/SettingsStore";
import sdk from "../index";
import {RoomPermalinkCreator} from "../utils/permalinks/Permalinks";

const MAX_SHOW_EVENTS = 3;

// Match groups {pattern, replacement, flags}
const SED_REGEX = /^s\/(.*?)\/(.*?)(?:\/([gi]*))?$/g;

export default class SedEditProvider extends AutocompleteProvider {
    constructor(room) {
        super(SED_REGEX);
        this.room = room;
    }

    async getCompletions(query: string, selection: SelectionRange, force?: boolean = false): Array<Completion> {
        const {command, range} = this.getCurrentCommand(query, selection, force);

        if (command) {
            const events = [];
            while (events.length < MAX_SHOW_EVENTS) {
                const lastEv = events.length ? events[events.length - 1].getId() : undefined;
                const ev = findEditableEvent(this.room, false, lastEv);
                if (!ev) break;
                events.push(ev);
            }
            console.log("DEBUG found events", events);

            const permalinkCreator = new RoomPermalinkCreator(this.room);

            const EventTile = sdk.getComponent('rooms.EventTile');
            return events.map(ev => {
                const evTile = (
                    <EventTile
                        last={true}
                        tileShape="reply_preview"
                        mxEvent={ev}
                        permalinkCreator={permalinkCreator}
                        isTwelveHour={SettingsStore.getValue("showTwelveHourTimestamps")} />
                );

                return {
                    completion: query,
                    completionId: ev.getId(),
                    type: "sed-edit",
                    component: evTile,
                    range,
                };
            });
        }
        return [];
    }

    getName() {
        return '✏️ ' + _t('Edit');
    }

    renderCompletions(completions: [React.Component]): ?React.Component {
        return (
            <div
                className="mx_Autocomplete_Completion_container_pill mx_Autocomplete_Completion_container_truncate"
                role="listbox"
                aria-label={_t("SED Edit")}
            >
                { completions }
            </div>
        );
    }
}
