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

// These are in their own file because of circular imports being a problem.
export enum RightPanelPhases {
    // Room stuff
    RoomMemberList = 'RoomMemberList',
    FilePanel = 'FilePanel',
    NotificationPanel = 'NotificationPanel',
    RoomMemberInfo = 'RoomMemberInfo',
    EncryptionPanel = 'EncryptionPanel',
    RoomSummary = 'RoomSummary',
    Widget = 'Widget',
    PinnedMessages = "PinnedMessages",

    Room3pidMemberInfo = 'Room3pidMemberInfo',
    // Group stuff
    GroupMemberList = 'GroupMemberList',
    GroupRoomList = 'GroupRoomList',
    GroupRoomInfo = 'GroupRoomInfo',
    GroupMemberInfo = 'GroupMemberInfo',

    // Space stuff
    SpaceMemberList = "SpaceMemberList",
    SpaceMemberInfo = "SpaceMemberInfo",
    Space3pidMemberInfo = "Space3pidMemberInfo",
}

// These are the phases that are safe to persist (the ones that don't require additional
// arguments).
export const RIGHT_PANEL_PHASES_NO_ARGS = [
    RightPanelPhases.RoomSummary,
    RightPanelPhases.NotificationPanel,
    RightPanelPhases.PinnedMessages,
    RightPanelPhases.FilePanel,
    RightPanelPhases.RoomMemberList,
    RightPanelPhases.GroupMemberList,
    RightPanelPhases.GroupRoomList,
];

// Subset of phases visible in the Space View
export const RIGHT_PANEL_SPACE_PHASES = [
    RightPanelPhases.SpaceMemberList,
    RightPanelPhases.Space3pidMemberInfo,
    RightPanelPhases.SpaceMemberInfo,
];
