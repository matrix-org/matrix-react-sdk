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

import {MatrixClientPeg} from "../MatrixClientPeg";

export enum NotificationSetting {
    AllMessages = "all_messages",
    DirectMessagesMentionsKeywords = "dm_mentions_keywords",
    MentionsKeywordsOnly = "mentions_keywords",
    Never = "never",
}

export type RoomNotificationSetting =
    NotificationSetting.AllMessages | NotificationSetting.MentionsKeywordsOnly | NotificationSetting.Never;

export const roundRoomNotificationSetting = (roomId: string, level: NotificationSetting): RoomNotificationSetting => {
    if (level === NotificationSetting.DirectMessagesMentionsKeywords) {
        // XXX: Push Rules considers DMs very differently to us
        // if (DMRoomMap.shared().getUserIdForRoomId(roomId)) {
        if (MatrixClientPeg.get().getRoom(roomId).getJoinedMemberCount() === 2) {
            return NotificationSetting.AllMessages;
        } else {
            return NotificationSetting.MentionsKeywordsOnly;
        }
    }
    return level;
};

const enumOrder = {
    [NotificationSetting.Never]: 0,
    [NotificationSetting.MentionsKeywordsOnly]: 1,
    [NotificationSetting.DirectMessagesMentionsKeywords]: 2,
    [NotificationSetting.AllMessages]: 3,
};

export const compareNotificationSettings = (a: NotificationSetting, b: NotificationSetting): number => {
    return enumOrder[a] - enumOrder[b];
};

export enum TweakKind {
    Sound = "sound",
    Highlight = "highlight",
}

export interface ISoundTweak {
    // eslint-disable-next-line camelcase
    set_tweak: TweakKind.Sound;
    value: string;
}

export const soundTweak = (value = "default"): ISoundTweak => ({
    set_tweak: TweakKind.Sound,
    value,
});

export interface IHighlightTweak {
    // eslint-disable-next-line camelcase
    set_tweak: TweakKind.Highlight;
    value?: boolean;
}

export const highlightTweak = (value = true): IHighlightTweak => ({
    set_tweak: TweakKind.Highlight,
    value,
});

export type Tweak = ISoundTweak | IHighlightTweak;

export enum Action {
    Notify = "notify",
    DontNotify = "dont_notify", // no-op
    Coalesce = "coalesce", // unused
}

export type ActionType = Action | Tweak;

// Push rule kinds in descending priority order
export enum Kind {
    Override = "override",
    ContentSpecific = "content",
    RoomSpecific = "room",
    SenderSpecific = "sender",
    Underride = "underride",
}

export enum ConditionKind {
    EventMatch = "event_match",
    ContainsDisplayName = "contains_display_name",
    RoomMemberCount = "room_member_count",
    SenderNotificationPermission = "sender_notification_permission",
}

interface IBaseCondition {
    kind: ConditionKind;
}

export interface IEventMatchCondition extends IBaseCondition {
    kind: ConditionKind.EventMatch;
    key: string;
    pattern: string;
}

export interface IContainsDisplayNameCondition extends IBaseCondition {
    kind: ConditionKind.ContainsDisplayName;
}

export interface IRoomMemberCountCondition extends IBaseCondition {
    kind: ConditionKind.RoomMemberCount;
    is: string;
}

export interface ISenderNotificationPermissionCondition extends IBaseCondition {
    kind: ConditionKind.SenderNotificationPermission;
    key: string;
}

export type Condition =
    IEventMatchCondition |
    IContainsDisplayNameCondition |
    IRoomMemberCountCondition |
    ISenderNotificationPermissionCondition;

export enum RuleId {
    EncryptedRoomOneToOne = ".m.rule.room_one_to_one", // TODO being removed

    // overrides
    Master = ".m.rule.master", // The master rule (all notifications disabling)
    SuppressNotices = ".m.rule.suppress_notices",
    SuppressEdits = ".m.rule.suppress_edits",
    InviteForMe = ".m.rule.invite_for_me",
    // omits .m.rule.member_event
    ContainsDisplayName = ".m.rule.contains_display_name",
    Tombstone = ".m.rule.tombstone",
    RoomNotif = ".m.rule.roomnotif",
    // content
    ContainsUserName = ".m.rule.contains_user_name",
    // underride
    Call = ".m.rule.call",
    RoomOneToOne = ".m.rule.room_one_to_one",
    Message = ".m.rule.message",
    Encrypted = ".m.rule.encrypted",
}

interface IBasePushRule {
    // eslint-disable-next-line camelcase
    rule_id: RuleId | string;
    actions: ActionType[];
    enabled: boolean;
    default: boolean;
}

export interface IPushRuleWithConditions extends IBasePushRule {
    kind: Kind.Override | Kind.Underride;
    conditions: Condition[];
}

export interface IPushRuleWithPattern extends IBasePushRule {
    kind: Kind.ContentSpecific;
    pattern: string;
}

export interface IPushRule extends IBasePushRule {
    kind: Kind.RoomSpecific | Kind.SenderSpecific;
}

export type PushRule = IPushRuleWithConditions | IPushRuleWithPattern | IPushRule;

export interface IPushRuleSet {
    override: IPushRuleWithConditions[];
    content: IPushRuleWithPattern[];
    room: IPushRule[];
    sender: IPushRule[];
    underride: IPushRuleWithConditions[];
}

export interface IRuleSets {
    global: IPushRuleSet;
}
