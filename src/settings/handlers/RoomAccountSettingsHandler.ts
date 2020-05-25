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

import {MatrixClientPeg} from '../../MatrixClientPeg';
import MatrixClientBackedSettingsHandler from "./MatrixClientBackedSettingsHandler";
import { WatchManager } from "../WatchManager";
import { SettingLevel } from "../models";

const ALLOWED_WIDGETS_EVENT_TYPE = "im.vector.setting.allowed_widgets";

/**
 * Gets and sets settings at the "room-account" level for the current user.
 */
export default class RoomAccountSettingsHandler extends MatrixClientBackedSettingsHandler {
    constructor(private _watchers: WatchManager) {
        super();
        this._onAccountData = this._onAccountData.bind(this);
    }

    protected initMatrixClient(oldClient, newClient) {
        if (oldClient) {
            oldClient.removeListener("Room.accountData", this._onAccountData);
        }

        newClient.on("Room.accountData", this._onAccountData);
    }

    private _onAccountData(event, room) {
        const roomId = room.roomId;

        if (event.getType() === "org.matrix.room.preview_urls") {
            let val = event.getContent()['disable'];
            if (typeof (val) !== "boolean") {
                val = null;
            } else {
                val = !val;
            }

            this._watchers.notifyUpdate("urlPreviewsEnabled", roomId, SettingLevel.ROOM_ACCOUNT, val);
        } else if (event.getType() === "org.matrix.room.color_scheme") {
            this._watchers.notifyUpdate("roomColor", roomId, SettingLevel.ROOM_ACCOUNT, event.getContent());
        } else if (event.getType() === "im.vector.web.settings") {
            // We can't really discern what changed, so trigger updates for everything
            for (const settingName of Object.keys(event.getContent())) {
                const val = event.getContent()[settingName];
                this._watchers.notifyUpdate(settingName, roomId, SettingLevel.ROOM_ACCOUNT, val);
            }
        } else if (event.getType() === ALLOWED_WIDGETS_EVENT_TYPE) {
            this._watchers.notifyUpdate("allowedWidgets", roomId, SettingLevel.ROOM_ACCOUNT, event.getContent());
        }
    }

    public getValue(settingName, roomId) {
        // Special case URL previews
        if (settingName === "urlPreviewsEnabled") {
            const content = this.getSettings(roomId, "org.matrix.room.preview_urls") || {};

            // Check to make sure that we actually got a boolean
            if (typeof(content['disable']) !== "boolean") return null;
            return !content['disable'];
        }

        // Special case room color
        if (settingName === "roomColor") {
            // The event content should already be in an appropriate format, we just need
            // to get the right value.
            // don't fallback to {} because thats truthy and would imply there is an event specifying tint
            return this.getSettings(roomId, "org.matrix.room.color_scheme");
        }

        // Special case allowed widgets
        if (settingName === "allowedWidgets") {
            return this.getSettings(roomId, ALLOWED_WIDGETS_EVENT_TYPE);
        }

        const settings = this.getSettings(roomId) || {};
        return settings[settingName];
    }

    public setValue(settingName, roomId, newValue) {
        // Special case URL previews
        if (settingName === "urlPreviewsEnabled") {
            const content2 = this.getSettings(roomId, "org.matrix.room.preview_urls") || {};
            content2['disable'] = !newValue;
            return MatrixClientPeg.get().setRoomAccountData(roomId, "org.matrix.room.preview_urls", content2);
        }

        // Special case room color
        if (settingName === "roomColor") {
            // The new value should match our requirements, we just need to store it in the right place.
            return MatrixClientPeg.get().setRoomAccountData(roomId, "org.matrix.room.color_scheme", newValue);
        }

        // Special case allowed widgets
        if (settingName === "allowedWidgets") {
            return MatrixClientPeg.get().setRoomAccountData(roomId, ALLOWED_WIDGETS_EVENT_TYPE, newValue);
        }

        const content = this.getSettings(roomId) || {};
        content[settingName] = newValue;
        return MatrixClientPeg.get().setRoomAccountData(roomId, "im.vector.web.settings", content);
    }

    public canSetValue(settingName, roomId) {
        const room = MatrixClientPeg.get().getRoom(roomId);

        // If they have the room, they can set their own account data
        return room !== undefined && room !== null;
    }

    public isSupported() {
        const cli = MatrixClientPeg.get();
        return cli !== undefined && cli !== null;
    }

    private getSettings(roomId, eventType = "im.vector.web.settings") {
        const room = MatrixClientPeg.get().getRoom(roomId);
        if (!room) return null;

        const event = room.getAccountData(eventType);
        if (!event || !event.getContent()) return null;
        return event.getContent();
    }
}
