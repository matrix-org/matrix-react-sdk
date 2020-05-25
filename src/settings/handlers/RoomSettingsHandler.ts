/*
Copyright 2017 Travis Ralston
Copyright 2019 New Vector Ltd.
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

import { MatrixClientPeg } from '../../MatrixClientPeg';
import MatrixClientBackedSettingsHandler from "./MatrixClientBackedSettingsHandler";
import { WatchManager } from "../WatchManager";
import { SettingLevel } from "../models";

/**
 * Gets and sets settings at the "room" level.
 */
export default class RoomSettingsHandler extends MatrixClientBackedSettingsHandler {
    constructor(private _watchers: WatchManager) {
        super();

        this.onEvent = this.onEvent.bind(this);
    }

    protected initMatrixClient(oldClient, newClient) {
        if (oldClient) {
            oldClient.removeListener("RoomState.events", this.onEvent);
        }

        newClient.on("RoomState.events", this.onEvent);
    }

    private onEvent(event) {
        const roomId = event.getRoomId();

        if (event.getType() === "org.matrix.room.preview_urls") {
            let val = event.getContent()['disable'];
            if (typeof (val) !== "boolean") {
                val = null;
            } else {
                val = !val;
            }

            this._watchers.notifyUpdate("urlPreviewsEnabled", roomId, SettingLevel.ROOM, val);
        } else if (event.getType() === "im.vector.web.settings") {
            // We can't really discern what changed, so trigger updates for everything
            for (const settingName of Object.keys(event.getContent())) {
                this._watchers.notifyUpdate(settingName, roomId, SettingLevel.ROOM, event.getContent()[settingName]);
            }
        }
    }

    public getValue(settingName, roomId) {
        // Special case URL previews
        if (settingName === "urlPreviewsEnabled") {
            const content = this.getSettings(roomId, "org.matrix.room.preview_urls") || {};

            // Check to make sure that we actually got a boolean
            if (typeof (content['disable']) !== "boolean") return null;
            return !content['disable'];
        }

        const settings = this.getSettings(roomId) || {};
        return settings[settingName];
    }

    public setValue(settingName, roomId, newValue) {
        // Special case URL previews
        if (settingName === "urlPreviewsEnabled") {
            const urlContent = this.getSettings(roomId, "org.matrix.room.preview_urls") || {};
            urlContent['disable'] = !newValue;
            return MatrixClientPeg.get().sendStateEvent(roomId, "org.matrix.room.preview_urls", urlContent);
        }

        const content = this.getSettings(roomId) || {};
        content[settingName] = newValue;
        return MatrixClientPeg.get().sendStateEvent(roomId, "im.vector.web.settings", content, "");
    }

    public canSetValue(settingName, roomId) {
        const cli = MatrixClientPeg.get();
        const room = cli.getRoom(roomId);

        let eventType = "im.vector.web.settings";
        if (settingName === "urlPreviewsEnabled") eventType = "org.matrix.room.preview_urls";

        if (!room) return false;
        return room.currentState.maySendStateEvent(eventType, cli.getUserId());
    }

    public isSupported(): boolean {
        const cli = MatrixClientPeg.get();
        return cli !== undefined && cli !== null;
    }

    private getSettings(roomId: string, eventType = "im.vector.web.settings") {
        const room = MatrixClientPeg.get().getRoom(roomId);
        if (!room) return null;

        const event = room.currentState.getStateEvents(eventType, "");
        if (!event || !event.getContent()) return null;
        return event.getContent();
    }
}
