/*
Copyright 2017 Travis Ralston

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

import SettingsHandler from "./SettingsHandler";
import MatrixClientPeg from '../../MatrixClientPeg';

/**
 * Gets and sets settings at the "room-account" level for the current user.
 */
export default class RoomAccountSettingsHandler extends SettingsHandler {
    getValue(settingName, roomId) {
        // Special case URL previews
        if (settingName === "urlPreviewsEnabled") {
            const content = this._getSettings(roomId, "org.matrix.room.preview_urls") || {};

            // Check to make sure that we actually got a boolean
            if (typeof(content['disable']) !== "boolean") return null;
            return !content['disable'];
        }

        // Special case room color
        if (settingName === "roomColor") {
            // The event content should already be in an appropriate format, we just need
            // to get the right value.
            // don't fallback to {} because thats truthy and would imply there is an event specifying tint
            return this._getSettings(roomId, "org.matrix.room.color_scheme");
        }

        const settings = this._getSettings(roomId) || {};
        return settings[settingName];
    }

    setValue(settingName, roomId, newValue) {
        // Special case URL previews
        if (settingName === "urlPreviewsEnabled") {
            const content = this._getSettings(roomId, "org.matrix.room.preview_urls") || {};
            content['disable'] = !newValue;
            return MatrixClientPeg.get().setRoomAccountData(roomId, "org.matrix.room.preview_urls", content);
        }

        // Special case room color
        if (settingName === "roomColor") {
            // The new value should match our requirements, we just need to store it in the right place.
            return MatrixClientPeg.get().setRoomAccountData(roomId, "org.matrix.room.color_scheme", newValue);
        }

        const content = this._getSettings(roomId) || {};
        content[settingName] = newValue;
        return MatrixClientPeg.get().setRoomAccountData(roomId, "im.vector.web.settings", content);
    }

    canSetValue(settingName, roomId) {
        const room = MatrixClientPeg.get().getRoom(roomId);

        // If they have the room, they can set their own account data
        return room !== undefined && room !== null;
    }

    isSupported() {
        const cli = MatrixClientPeg.get();
        return cli !== undefined && cli !== null;
    }

    _getSettings(roomId, eventType = "im.vector.web.settings") {
        const room = MatrixClientPeg.get().getRoom(roomId);
        if (!room) return null;

        const event = room.getAccountData(eventType);
        if (!event || !event.getContent()) return null;
        return event.getContent();
    }
}
