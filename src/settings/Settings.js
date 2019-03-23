/*
Copyright 2017 Travis Ralston
Copyright 2018, 2019 New Vector Ltd.

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

import {_td} from '../languageHandler';
import {
    AudioNotificationsEnabledController,
    NotificationBodyEnabledController,
    NotificationsEnabledController,
} from "./controllers/NotificationControllers";
import CustomStatusController from "./controllers/CustomStatusController";
import ThemeController from './controllers/ThemeController';

// These are just a bunch of helper arrays to avoid copy/pasting a bunch of times
const LEVELS_ROOM_SETTINGS = ['device', 'room-device', 'room-account', 'account', 'config'];
const LEVELS_ROOM_SETTINGS_WITH_ROOM = ['device', 'room-device', 'room-account', 'account', 'config', 'room'];
const LEVELS_ACCOUNT_SETTINGS = ['device', 'account', 'config'];
const LEVELS_FEATURE = ['device', 'config'];
const LEVELS_DEVICE_ONLY_SETTINGS = ['device'];
const LEVELS_DEVICE_ONLY_SETTINGS_WITH_CONFIG = ['device', 'config'];

export const SETTINGS = {
    // EXAMPLE SETTING:
    // "my-setting": {
    //     // Must be set to true for features. Default is 'false'.
    //     isFeature: false,
    //
    //     // Display names are strongly recommended for clarity.
    //     displayName: _td("Cool Name"),
    //
    //     // Display name can also be an object for different levels.
    //     //displayName: {
    //     //    "device": _td("Name for when the setting is used at 'device'"),
    //     //    "room": _td("Name for when the setting is used at 'room'"),
    //     //    "default": _td("The name for all other levels"),
    //     //}
    //
    //     // The supported levels are required. Preferably, use the preset arrays
    //     // at the top of this file to define this rather than a custom array.
    //     supportedLevels: [
    //         // The order does not matter.
    //
    //         "device",        // Affects the current device only
    //         "room-device",   // Affects the current room on the current device
    //         "room-account",  // Affects the current room for the current account
    //         "account",       // Affects the current account
    //         "room",          // Affects the current room (controlled by room admins)
    //         "config",        // Affects the current application
    //
    //         // "default" is always supported and does not get listed here.
    //     ],
    //
    //     // Required. Can be any data type. The value specified here should match
    //     // the data being stored (ie: if a boolean is used, the setting should
    //     // represent a boolean).
    //     default: {
    //         your: "value",
    //     },
    //
    //     // Optional settings controller. See SettingsController for more information.
    //     controller: new MySettingController(),
    //
    //     // Optional flag to make supportedLevels be respected as the order to handle
    //     // settings. The first element is treated as "most preferred". The "default"
    //     // level is always appended to the end.
    //     supportedLevelsAreOrdered: false,
    //
    //     // Optional value to invert a boolean setting's value. The string given will
    //     // be read as the setting's ID instead of the one provided as the key for the
    //     // setting definition. By setting this, the returned value will automatically
    //     // be inverted, except for when the default value is returned. Inversion will
    //     // occur after the controller is asked for an override. This should be used by
    //     // historical settings which we don't want existing user's values be wiped. Do
    //     // not use this for new settings.
    //     invertedSettingName: "my-negative-setting",
    // },
    "feature_pinning": {
        isFeature: true,
        displayName: _td("Message Pinning"),
        supportedLevels: LEVELS_FEATURE,
        default: false,
    },
    "feature_custom_status": {
        isFeature: true,
        displayName: _td("Custom user status messages"),
        supportedLevels: LEVELS_FEATURE,
        default: false,
        controller: new CustomStatusController(),
    },
    "feature_room_breadcrumbs": {
        isFeature: true,
        displayName: _td("Show recent room avatars above the room list (refresh to apply changes)"),
        supportedLevels: LEVELS_FEATURE,
        default: false,
    },
    "feature_custom_tags": {
        isFeature: true,
        displayName: _td("Group & filter rooms by custom tags (refresh to apply changes)"),
        supportedLevels: LEVELS_FEATURE,
        default: false,
    },
    "feature_state_counters": {
        isFeature: true,
        displayName: _td("Render simple counters in room header"),
        supportedLevels: LEVELS_FEATURE,
        default: false,
    },
    "MessageComposerInput.suggestEmoji": {
        supportedLevels: LEVELS_ACCOUNT_SETTINGS,
        displayName: _td('Enable Emoji suggestions while typing'),
        default: true,
        invertedSettingName: 'MessageComposerInput.dontSuggestEmoji',
    },
    "useCompactLayout": {
        supportedLevels: LEVELS_ACCOUNT_SETTINGS,
        displayName: _td('Use compact timeline layout'),
        default: false,
    },
    "showRedactions": {
        supportedLevels: LEVELS_ROOM_SETTINGS_WITH_ROOM,
        displayName: _td('Show a placeholder for removed messages'),
        default: true,
        invertedSettingName: 'hideRedactions',
    },
    "showJoinLeaves": {
        supportedLevels: LEVELS_ROOM_SETTINGS_WITH_ROOM,
        displayName: _td('Show join/leave messages (invites/kicks/bans unaffected)'),
        default: true,
        invertedSettingName: 'hideJoinLeaves',
    },
    "showAvatarChanges": {
        supportedLevels: LEVELS_ROOM_SETTINGS_WITH_ROOM,
        displayName: _td('Show avatar changes'),
        default: true,
        invertedSettingName: 'hideAvatarChanges',
    },
    "showDisplaynameChanges": {
        supportedLevels: LEVELS_ROOM_SETTINGS_WITH_ROOM,
        displayName: _td('Show display name changes'),
        default: true,
        invertedSettingName: 'hideDisplaynameChanges',
    },
    "showReadReceipts": {
        supportedLevels: LEVELS_ROOM_SETTINGS,
        displayName: _td('Show read receipts sent by other users'),
        default: true,
        invertedSettingName: 'hideReadReceipts',
    },
    "showTwelveHourTimestamps": {
        supportedLevels: LEVELS_ACCOUNT_SETTINGS,
        displayName: _td('Show timestamps in 12 hour format (e.g. 2:30pm)'),
        default: false,
    },
    "alwaysShowTimestamps": {
        supportedLevels: LEVELS_ACCOUNT_SETTINGS,
        displayName: _td('Always show message timestamps'),
        default: false,
    },
    "autoplayGifsAndVideos": {
        supportedLevels: LEVELS_ACCOUNT_SETTINGS,
        displayName: _td('Autoplay GIFs and videos'),
        default: false,
    },
    "alwaysShowEncryptionIcons": {
        supportedLevels: LEVELS_ACCOUNT_SETTINGS,
        displayName: _td('Always show encryption icons'),
        default: true,
    },
    "showRoomRecoveryReminder": {
        supportedLevels: LEVELS_ACCOUNT_SETTINGS,
        displayName: _td('Show a reminder to enable Secure Message Recovery in encrypted rooms'),
        default: true,
    },
    "enableSyntaxHighlightLanguageDetection": {
        supportedLevels: LEVELS_ACCOUNT_SETTINGS,
        displayName: _td('Enable automatic language detection for syntax highlighting'),
        default: false,
    },
    "Pill.shouldShowPillAvatar": {
        supportedLevels: LEVELS_ACCOUNT_SETTINGS,
        displayName: _td('Show avatars in user and room mentions'),
        default: true,
        invertedSettingName: 'Pill.shouldHidePillAvatar',
    },
    "TextualBody.enableBigEmoji": {
        supportedLevels: LEVELS_ACCOUNT_SETTINGS,
        displayName: _td('Enable big emoji in chat'),
        default: true,
        invertedSettingName: 'TextualBody.disableBigEmoji',
    },
    "MessageComposerInput.isRichTextEnabled": {
        supportedLevels: LEVELS_ACCOUNT_SETTINGS,
        default: false,
    },
    "MessageComposer.showFormatting": {
        supportedLevels: LEVELS_ACCOUNT_SETTINGS,
        default: false,
    },
    "sendTypingNotifications": {
        supportedLevels: LEVELS_ACCOUNT_SETTINGS,
        displayName: _td("Send typing notifications"),
        default: true,
        invertedSettingName: 'dontSendTypingNotifications',
    },
    "MessageComposerInput.autoReplaceEmoji": {
        supportedLevels: LEVELS_ACCOUNT_SETTINGS,
        displayName: _td('Automatically replace plain text Emoji'),
        default: false,
    },
    "VideoView.flipVideoHorizontally": {
        supportedLevels: LEVELS_ACCOUNT_SETTINGS,
        displayName: _td('Mirror local video feed'),
        default: false,
    },
    "TagPanel.enableTagPanel": {
        supportedLevels: LEVELS_ACCOUNT_SETTINGS,
        displayName: _td('Enable Community Filter Panel'),
        default: true,
        invertedSettingName: 'TagPanel.disableTagPanel',
    },
    "theme": {
        supportedLevels: LEVELS_ACCOUNT_SETTINGS,
        default: "light",
        controller: new ThemeController(),
    },
    "webRtcAllowPeerToPeer": {
        supportedLevels: LEVELS_DEVICE_ONLY_SETTINGS_WITH_CONFIG,
        displayName: _td('Allow Peer-to-Peer for 1:1 calls'),
        default: true,
        invertedSettingName: 'webRtcForceTURN',
    },
    "webrtc_audiooutput": {
        supportedLevels: LEVELS_DEVICE_ONLY_SETTINGS,
        default: null,
    },
    "webrtc_audioinput": {
        supportedLevels: LEVELS_DEVICE_ONLY_SETTINGS,
        default: null,
    },
    "webrtc_videoinput": {
        supportedLevels: LEVELS_DEVICE_ONLY_SETTINGS,
        default: null,
    },
    "language": {
        supportedLevels: LEVELS_DEVICE_ONLY_SETTINGS_WITH_CONFIG,
        default: "en",
    },
    "analyticsOptIn": {
        supportedLevels: LEVELS_DEVICE_ONLY_SETTINGS_WITH_CONFIG,
        displayName: _td('Send analytics data'),
        default: false,
    },
    "showCookieBar": {
        supportedLevels: LEVELS_DEVICE_ONLY_SETTINGS_WITH_CONFIG,
        default: true,
    },
    "autocompleteDelay": {
        supportedLevels: LEVELS_DEVICE_ONLY_SETTINGS_WITH_CONFIG,
        default: 200,
    },
    "blacklistUnverifiedDevices": {
        // We specifically want to have room-device > device so that users may set a device default
        // with a per-room override.
        supportedLevels: ['room-device', 'device'],
        supportedLevelsAreOrdered: true,
        displayName: {
            "default": _td('Never send encrypted messages to unverified devices from this device'),
            "room-device": _td('Never send encrypted messages to unverified devices in this room from this device'),
        },
        default: false,
    },
    "urlPreviewsEnabled": {
        supportedLevels: LEVELS_ROOM_SETTINGS_WITH_ROOM,
        displayName: {
            "default": _td('Enable inline URL previews by default'),
            "room-account": _td("Enable URL previews for this room (only affects you)"),
            "room": _td("Enable URL previews by default for participants in this room"),
        },
        default: true,
    },
    "urlPreviewsEnabled_e2ee": {
        supportedLevels: ['room-device', 'room-account'],
        displayName: {
            "room-account": _td("Enable URL previews for this room (only affects you)"),
        },
        default: false,
    },
    "roomColor": {
        supportedLevels: LEVELS_ROOM_SETTINGS_WITH_ROOM,
        displayName: _td("Room Colour"),
        default: {
            primary_color: null, // Hex string, eg: #000000
            secondary_color: null, // Hex string, eg: #000000
        },
    },
    "notificationsEnabled": {
        supportedLevels: LEVELS_DEVICE_ONLY_SETTINGS,
        default: false,
        controller: new NotificationsEnabledController(),
    },
    "notificationBodyEnabled": {
        supportedLevels: LEVELS_DEVICE_ONLY_SETTINGS,
        default: true,
        controller: new NotificationBodyEnabledController(),
    },
    "audioNotificationsEnabled": {
        supportedLevels: LEVELS_DEVICE_ONLY_SETTINGS,
        default: true,
        controller: new AudioNotificationsEnabledController(),
    },
    "enableWidgetScreenshots": {
        supportedLevels: LEVELS_ACCOUNT_SETTINGS,
        displayName: _td('Enable widget screenshots on supported widgets'),
        default: false,
    },
    "PinnedEvents.isOpen": {
        supportedLevels: ['room-device'],
        default: false,
    },
    "promptBeforeInviteUnknownUsers": {
        supportedLevels: LEVELS_ACCOUNT_SETTINGS,
        displayName: _td('Prompt before sending invites to potentially invalid matrix IDs'),
        default: true,
    },
    "showDeveloperTools": {
        supportedLevels: LEVELS_ACCOUNT_SETTINGS,
        displayName: _td('Show developer tools'),
        default: false,
    },
    "RoomList.orderByImportance": {
        supportedLevels: LEVELS_ACCOUNT_SETTINGS,
        displayName: _td('Order rooms in the room list by most important first instead of most recent'),
        default: true,
    },
};
