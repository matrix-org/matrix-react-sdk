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

export enum NotificationSetting {
    AllMessages = "all_messages", // .m.rule.message = notify
    DirectMessagesMentionsKeywords = "dm_mentions_keywords", // .m.rule.message = mark_unread. This is the new default.
    MentionsKeywordsOnly = "mentions_keywords", // .m.rule.message = mark_unread; .m.rule.room_one_to_one = mark_unread
    Never = "never", // .m.rule.master = enabled (dont_notify)
}

const enumOrder = {
    [NotificationSetting.Never]: 0,
    [NotificationSetting.MentionsKeywordsOnly]: 1,
    [NotificationSetting.DirectMessagesMentionsKeywords]: 2,
    [NotificationSetting.AllMessages]: 3,
};

export const compareNotificationSettings = (a: NotificationSetting, b: NotificationSetting): number => {
    return enumOrder[a] - enumOrder[b];
};

export interface ISoundTweak {
    // eslint-disable-next-line camelcase
    set_tweak: "sound";
    value: string;
}
export interface IHighlightTweak {
    // eslint-disable-next-line camelcase
    set_tweak: "highlight";
    value?: boolean;
}

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

export interface IEventMatchCondition {
    kind: "event_match";
    key: string;
    pattern: string;
}

export interface IContainsDisplayNameCondition {
    kind: "contains_display_name";
}

export interface IRoomMemberCountCondition {
    kind: "room_member_count";
    is: string;
}

export interface ISenderNotificationPermissionCondition {
    kind: "sender_notification_permission";
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
    InviteForMe = ".m.invite_for_me",
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

export interface IPushRule {
    enabled: boolean;
    // eslint-disable-next-line camelcase
    rule_id: RuleId | string;
    actions: ActionType[];
    default: boolean;
    conditions?: Condition[]; // only applicable to `underride` and `override` rules
    pattern?: string; // only applicable to `content` rules
}

// push rule extended with kind, used by ContentRules and js-sdk's pushprocessor
export interface IExtendedPushRule extends IPushRule {
    kind: Kind;
}

export interface IPushRuleSet {
    override: IExtendedPushRule[];
    content: IExtendedPushRule[];
    room: IExtendedPushRule[];
    sender: IExtendedPushRule[];
    underride: IExtendedPushRule[];
}

export interface IRuleSets {
    global: IPushRuleSet;
}
