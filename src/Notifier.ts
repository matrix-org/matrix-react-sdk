/*
Copyright 2015, 2016 OpenMarket Ltd
Copyright 2017 Vector Creations Ltd
Copyright 2017 New Vector Ltd
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

import { MatrixEvent, MatrixEventEvent } from "matrix-js-sdk/src/models/event";
import { Room, RoomEvent } from "matrix-js-sdk/src/models/room";
import { ClientEvent } from "matrix-js-sdk/src/client";
import { logger } from "matrix-js-sdk/src/logger";
import { MsgType } from "matrix-js-sdk/src/@types/event";
import { M_LOCATION } from "matrix-js-sdk/src/@types/location";
import {
    PermissionChanged as PermissionChangedEvent,
} from "@matrix-org/analytics-events/types/typescript/PermissionChanged";

import { MatrixClientPeg } from './MatrixClientPeg';
import { PosthogAnalytics } from "./PosthogAnalytics";
import SdkConfig from './SdkConfig';
import PlatformPeg from './PlatformPeg';
import * as TextForEvent from './TextForEvent';
import * as Avatar from './Avatar';
import dis from './dispatcher/dispatcher';
import { _t } from './languageHandler';
import Modal from './Modal';
import SettingsStore from "./settings/SettingsStore";
import { hideToast as hideNotificationsToast } from "./toasts/DesktopNotificationsToast";
import { SettingLevel } from "./settings/SettingLevel";
import { isPushNotifyDisabled } from "./settings/controllers/NotificationControllers";
import { RoomViewStore } from "./stores/RoomViewStore";
import UserActivity from "./UserActivity";
import { mediaFromMxc } from "./customisations/Media";
import ErrorDialog from "./components/views/dialogs/ErrorDialog";
import CallHandler from "./CallHandler";
import VoipUserMapper from "./VoipUserMapper";

/*
 * Dispatches:
 * {
 *   action: "notifier_enabled",
 *   value: boolean
 * }
 */

const MAX_PENDING_ENCRYPTED = 20;

/*
Override both the content body and the TextForEvent handler for specific msgtypes, in notifications.
This is useful when the content body contains fallback text that would explain that the client can't handle a particular
type of tile.
*/
const msgTypeHandlers = {
    [MsgType.KeyVerificationRequest]: (event: MatrixEvent) => {
        const name = (event.sender || {}).name;
        return _t("%(name)s is requesting verification", { name });
    },
    [M_LOCATION.name]: (event: MatrixEvent) => {
        return TextForEvent.textForLocationEvent(event)();
    },
    [M_LOCATION.altName]: (event: MatrixEvent) => {
        return TextForEvent.textForLocationEvent(event)();
    },
};

export const Notifier = {
    notifsByRoom: {},

    // A list of event IDs that we've received but need to wait until
    // they're decrypted until we decide whether to notify for them
    // or not
    pendingEncryptedEventIds: [],

    notificationMessageForEvent: function(ev: MatrixEvent): string {
        if (msgTypeHandlers.hasOwnProperty(ev.getContent().msgtype)) {
            return msgTypeHandlers[ev.getContent().msgtype](ev);
        }
        return TextForEvent.textForEvent(ev);
    },

    _displayPopupNotification: function(ev: MatrixEvent, room: Room) {
        const plaf = PlatformPeg.get();
        if (!plaf) {
            return;
        }
        if (!plaf.supportsNotifications() || !plaf.maySendNotifications()) {
            return;
        }

        let msg = this.notificationMessageForEvent(ev);
        if (!msg) return;

        let title;
        if (!ev.sender || room.name === ev.sender.name) {
            title = room.name;
            // notificationMessageForEvent includes sender,
            // but we already have the sender here
            if (ev.getContent().body && !msgTypeHandlers.hasOwnProperty(ev.getContent().msgtype)) {
                msg = ev.getContent().body;
            }
        } else if (ev.getType() === 'm.room.member') {
            // context is all in the message here, we don't need
            // to display sender info
            title = room.name;
        } else if (ev.sender) {
            title = ev.sender.name + " (" + room.name + ")";
            // notificationMessageForEvent includes sender,
            // but we've just out sender in the title
            if (ev.getContent().body && !msgTypeHandlers.hasOwnProperty(ev.getContent().msgtype)) {
                msg = ev.getContent().body;
            }
        }

        if (!this.isBodyEnabled()) {
            msg = '';
        }

        let avatarUrl = null;
        if (ev.sender && !SettingsStore.getValue("lowBandwidth")) {
            avatarUrl = Avatar.avatarUrlForMember(ev.sender, 40, 40, 'crop');
        }

        const notif = plaf.displayNotification(title, msg, avatarUrl, room, ev);

        // if displayNotification returns non-null,  the platform supports
        // clearing notifications later, so keep track of this.
        if (notif) {
            if (this.notifsByRoom[ev.getRoomId()] === undefined) this.notifsByRoom[ev.getRoomId()] = [];
            this.notifsByRoom[ev.getRoomId()].push(notif);
        }
    },

    getSoundForRoom: function(roomId: string) {
        // We do no caching here because the SDK caches setting
        // and the browser will cache the sound.
        const content = SettingsStore.getValue("notificationSound", roomId);
        if (!content) {
            return null;
        }

        if (!content.url) {
            logger.warn(`${roomId} has custom notification sound event, but no url key`);
            return null;
        }

        if (!content.url.startsWith("mxc://")) {
            logger.warn(`${roomId} has custom notification sound event, but url is not a mxc url`);
            return null;
        }

        // Ideally in here we could use MSC1310 to detect the type of file, and reject it.

        return {
            url: mediaFromMxc(content.url).srcHttp,
            name: content.name,
            type: content.type,
            size: content.size,
        };
    },

    _playAudioNotification: async function(ev: MatrixEvent, room: Room) {
        const sound = this.getSoundForRoom(room.roomId);
        logger.log(`Got sound ${sound && sound.name || "default"} for ${room.roomId}`);

        try {
            const selector =
                document.querySelector<HTMLAudioElement>(sound ? `audio[src='${sound.url}']` : "#messageAudio");
            let audioElement = selector;
            if (!selector) {
                if (!sound) {
                    logger.error("No audio element or sound to play for notification");
                    return;
                }
                audioElement = new Audio(sound.url);
                if (sound.type) {
                    audioElement.type = sound.type;
                }
                document.body.appendChild(audioElement);
            }
            await audioElement.play();
        } catch (ex) {
            logger.warn("Caught error when trying to fetch room notification sound:", ex);
        }
    },

    start: function() {
        // do not re-bind in the case of repeated call
        this.boundOnEvent = this.boundOnEvent || this.onEvent.bind(this);
        this.boundOnSyncStateChange = this.boundOnSyncStateChange || this.onSyncStateChange.bind(this);
        this.boundOnRoomReceipt = this.boundOnRoomReceipt || this.onRoomReceipt.bind(this);
        this.boundOnEventDecrypted = this.boundOnEventDecrypted || this.onEventDecrypted.bind(this);

        MatrixClientPeg.get().on(ClientEvent.Event, this.boundOnEvent);
        MatrixClientPeg.get().on(RoomEvent.Receipt, this.boundOnRoomReceipt);
        MatrixClientPeg.get().on(MatrixEventEvent.Decrypted, this.boundOnEventDecrypted);
        MatrixClientPeg.get().on(ClientEvent.Sync, this.boundOnSyncStateChange);
        this.toolbarHidden = false;
        this.isSyncing = false;
    },

    stop: function() {
        if (MatrixClientPeg.get()) {
            MatrixClientPeg.get().removeListener(ClientEvent.Event, this.boundOnEvent);
            MatrixClientPeg.get().removeListener(RoomEvent.Receipt, this.boundOnRoomReceipt);
            MatrixClientPeg.get().removeListener(MatrixEventEvent.Decrypted, this.boundOnEventDecrypted);
            MatrixClientPeg.get().removeListener(ClientEvent.Sync, this.boundOnSyncStateChange);
        }
        this.isSyncing = false;
    },

    supportsDesktopNotifications: function() {
        const plaf = PlatformPeg.get();
        return plaf && plaf.supportsNotifications();
    },

    setEnabled: function(enable: boolean, callback?: () => void) {
        const plaf = PlatformPeg.get();
        if (!plaf) return;

        // Dev note: We don't set the "notificationsEnabled" setting to true here because it is a
        // calculated value. It is determined based upon whether or not the master rule is enabled
        // and other flags. Setting it here would cause a circular reference.

        // make sure that we persist the current setting audio_enabled setting
        // before changing anything
        if (SettingsStore.isLevelSupported(SettingLevel.DEVICE)) {
            SettingsStore.setValue("audioNotificationsEnabled", null, SettingLevel.DEVICE, this.isEnabled());
        }

        if (enable) {
            // Attempt to get permission from user
            plaf.requestNotificationPermission().then((result) => {
                if (result !== 'granted') {
                    // The permission request was dismissed or denied
                    // TODO: Support alternative branding in messaging
                    const brand = SdkConfig.get().brand;
                    const description = result === 'denied'
                        ? _t('%(brand)s does not have permission to send you notifications - ' +
                            'please check your browser settings', { brand })
                        : _t('%(brand)s was not given permission to send notifications - please try again', { brand });
                    Modal.createDialog(ErrorDialog, {
                        title: _t('Unable to enable Notifications'),
                        description,
                    });
                    return;
                }

                if (callback) callback();

                PosthogAnalytics.instance.trackEvent<PermissionChangedEvent>({
                    eventName: "PermissionChanged",
                    permission: "Notification",
                    granted: true,
                });
                dis.dispatch({
                    action: "notifier_enabled",
                    value: true,
                });
            });
        } else {
            PosthogAnalytics.instance.trackEvent<PermissionChangedEvent>({
                eventName: "PermissionChanged",
                permission: "Notification",
                granted: false,
            });
            dis.dispatch({
                action: "notifier_enabled",
                value: false,
            });
        }
        // set the notifications_hidden flag, as the user has knowingly interacted
        // with the setting we shouldn't nag them any further
        this.setPromptHidden(true);
    },

    isEnabled: function() {
        return this.isPossible() && SettingsStore.getValue("notificationsEnabled");
    },

    isPossible: function() {
        const plaf = PlatformPeg.get();
        if (!plaf) return false;
        if (!plaf.supportsNotifications()) return false;
        if (!plaf.maySendNotifications()) return false;

        return true; // possible, but not necessarily enabled
    },

    isBodyEnabled: function() {
        return this.isEnabled() && SettingsStore.getValue("notificationBodyEnabled");
    },

    isAudioEnabled: function() {
        // We don't route Audio via the HTML Notifications API so it is possible regardless of other things
        return SettingsStore.getValue("audioNotificationsEnabled");
    },

    setPromptHidden: function(hidden: boolean, persistent = true) {
        this.toolbarHidden = hidden;

        hideNotificationsToast();

        // update the info to localStorage for persistent settings
        if (persistent && global.localStorage) {
            global.localStorage.setItem("notifications_hidden", String(hidden));
        }
    },

    shouldShowPrompt: function() {
        const client = MatrixClientPeg.get();
        if (!client) {
            return false;
        }
        const isGuest = client.isGuest();
        return !isGuest && this.supportsDesktopNotifications() && !isPushNotifyDisabled() &&
            !this.isEnabled() && !this._isPromptHidden();
    },

    _isPromptHidden: function() {
        // Check localStorage for any such meta data
        if (global.localStorage) {
            return global.localStorage.getItem("notifications_hidden") === "true";
        }

        return this.toolbarHidden;
    },

    onSyncStateChange: function(state: string) {
        if (state === "SYNCING") {
            this.isSyncing = true;
        } else if (state === "STOPPED" || state === "ERROR") {
            this.isSyncing = false;
        }
    },

    onEvent: function(ev: MatrixEvent) {
        if (!this.isSyncing) return; // don't alert for any messages initially
        if (ev.getSender() === MatrixClientPeg.get().credentials.userId) return;

        MatrixClientPeg.get().decryptEventIfNeeded(ev);

        // If it's an encrypted event and the type is still 'm.room.encrypted',
        // it hasn't yet been decrypted, so wait until it is.
        if (ev.isBeingDecrypted() || ev.isDecryptionFailure()) {
            this.pendingEncryptedEventIds.push(ev.getId());
            // don't let the list fill up indefinitely
            while (this.pendingEncryptedEventIds.length > MAX_PENDING_ENCRYPTED) {
                this.pendingEncryptedEventIds.shift();
            }
            return;
        }

        this._evaluateEvent(ev);
    },

    onEventDecrypted: function(ev: MatrixEvent) {
        // 'decrypted' means the decryption process has finished: it may have failed,
        // in which case it might decrypt soon if the keys arrive
        if (ev.isDecryptionFailure()) return;

        const idx = this.pendingEncryptedEventIds.indexOf(ev.getId());
        if (idx === -1) return;

        this.pendingEncryptedEventIds.splice(idx, 1);
        this._evaluateEvent(ev);
    },

    onRoomReceipt: function(ev: MatrixEvent, room: Room) {
        if (room.getUnreadNotificationCount() === 0) {
            // ideally we would clear each notification when it was read,
            // but we have no way, given a read receipt, to know whether
            // the receipt comes before or after an event, so we can't
            // do this. Instead, clear all notifications for a room once
            // there are no notifs left in that room., which is not quite
            // as good but it's something.
            const plaf = PlatformPeg.get();
            if (!plaf) return;
            if (this.notifsByRoom[room.roomId] === undefined) return;
            for (const notif of this.notifsByRoom[room.roomId]) {
                plaf.clearNotification(notif);
            }
            delete this.notifsByRoom[room.roomId];
        }
    },

    _evaluateEvent: function(ev: MatrixEvent) {
        let roomId = ev.getRoomId();
        if (CallHandler.instance.getSupportsVirtualRooms()) {
            // Attempt to translate a virtual room to a native one
            const nativeRoomId = VoipUserMapper.sharedInstance().nativeRoomForVirtualRoom(roomId);
            if (nativeRoomId) {
                roomId = nativeRoomId;
            }
        }
        const room = MatrixClientPeg.get().getRoom(roomId);

        const actions = MatrixClientPeg.get().getPushActionsForEvent(ev);
        if (actions?.notify) {
            if (RoomViewStore.instance.getRoomId() === room.roomId &&
                UserActivity.sharedInstance().userActiveRecently() &&
                !Modal.hasDialogs()
            ) {
                // don't bother notifying as user was recently active in this room
                return;
            }

            if (this.isEnabled()) {
                this._displayPopupNotification(ev, room);
            }
            if (actions.tweaks.sound && this.isAudioEnabled()) {
                PlatformPeg.get().loudNotification(ev, room);
                this._playAudioNotification(ev, room);
            }
        }
    },
};

if (!window.mxNotifier) {
    window.mxNotifier = Notifier;
}

export default window.mxNotifier;
