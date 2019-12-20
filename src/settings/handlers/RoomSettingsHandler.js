/*
Copyright 2017 Travis Ralston
Copyright 2019 New Vector Ltd.

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

import {MatrixClientPeg} from '../../MatrixClientPeg';
import MatrixClientBackedSettingsHandler from "./MatrixClientBackedSettingsHandler";
import {SettingLevel} from "../SettingsStore";

/**
 * Gets and sets settings at the "room" level.
 */
export default class RoomSettingsHandler extends MatrixClientBackedSettingsHandler {
    constructor(watchManager) {
        super();

        this._watchers = watchManager;
        this._onEvent = this._onEvent.bind(this);
    }

    initMatrixClient(oldClient, newClient) {
        if (oldClient) {
            oldClient.removeListener("RoomState.events", this._onEvent);
        }

        newClient.on("RoomState.events", this._onEvent);
    }

    _onEvent(event) {
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

    getValue(settingName, roomId) {
        // Special case URL previews
        if (settingName === "urlPreviewsEnabled") {
            const content = this._getSettings(roomId, "org.matrix.room.preview_urls") || {};

            // Check to make sure that we actually got a boolean
            if (typeof(content['disable']) !== "boolean") return null;
            return !content['disable'];
        }

        const settings = this._getSettings(roomId) || {};
        return settings[settingName];
    }

    setValue(settingName, roomId, newValue) {
        // Special case URL previews
        if (settingName === "urlPreviewsEnabled") {
            const content = this._getSettings(roomId, "org.matrix.room.preview_urls") || {};
            content['disable'] = !newValue;
            return MatrixClientPeg.get().sendStateEvent(roomId, "org.matrix.room.preview_urls", content);
        }

        const content = this._getSettings(roomId) || {};
        content[settingName] = newValue;
        return MatrixClientPeg.get().sendStateEvent(roomId, "im.vector.web.settings", content, "");
    }

    canSetValue(settingName, roomId) {
        const cli = MatrixClientPeg.get();
        const room = cli.getRoom(roomId);

        let eventType = "im.vector.web.settings";
        if (settingName === "urlPreviewsEnabled") eventType = "org.matrix.room.preview_urls";

        if (!room) return false;
        return room.currentState.maySendStateEvent(eventType, cli.getUserId());
    }

    isSupported() {
        const cli = MatrixClientPeg.get();
        return cli !== undefined && cli !== null;
    }

    _getSettings(roomId, eventType = "im.vector.web.settings") {
        const room = MatrixClientPeg.get().getRoom(roomId);
        if (!room) return null;

        const event = room.currentState.getStateEvents(eventType, "");
        if (!event || !event.getContent()) return null;
        return event.getContent();
    }
}
