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

import React, {useContext, useState, useEffect, useCallback} from "react";
import MatrixClient from "matrix-js-sdk/src/client";

import MatrixClientContext from "../../../../../contexts/MatrixClientContext";
import {_t} from "../../../../../languageHandler";
import StyledCheckbox from "../../../elements/StyledCheckbox";
import SettingsSection from "../../SettingsSection";
import {portRulesToNewAPI} from "../../../../../notifications";
import BaseAvatar from "../../../avatars/BaseAvatar";
import Field from "../../../elements/Field";
import AccessibleButton from "../../../elements/AccessibleButton";
import {useStateToggle} from "../../../../../hooks/useStateToggle";
import {useEventEmitter} from "../../../../../hooks/useEventEmitter";
import {useSettingValue} from "../../../../../hooks/useSettings";
import DesktopNotifications from "../../notifications/DesktopNotifications";
import StyledRadioButton from "../../../elements/StyledRadioButton";
import SettingsStore, {SettingLevel} from "../../../../../settings/SettingsStore";

enum NotificationSettings {
    AllMessages = "all_messages", // .m.rule.message = notify
    DirectMessagesMentionsKeywords = "dm_mentions_keywords", // .m.rule.message = mark_unread. This is the new default.
    MentionsKeywordsOnly = "mentions_keywords", // .m.rule.message = mark_unread; .m.rule.room_one_to_one = mark_unread
    Never = "never", // .m.rule.master = enabled (dont_notify)
}

interface ISoundTweak {
    set_tweak: "sound";
    value: string;
}
interface IHighlightTweak {
    set_tweak: "highlight";
    value: boolean;
}

type Tweak = ISoundTweak | IHighlightTweak;

enum Actions {
    Notify = "notify",
    DontNotify = "dont_notify", // no-op
    Coalesce = "coalesce", // unused
    MarkUnread = "mark_unread", // new
}

type Action = Actions | Tweak;

// Push rule kinds in descending priority order
enum Kind {
    Override = "override",
    ContentSpecific = "content",
    RoomSpecific = "room",
    SenderSpecific = "sender",
    Underride = "underride",
}

interface IEventMatchCondition {
    kind: "event_match";
    key: string;
    pattern: string;
}

interface IContainsDisplayNameCondition {
    kind: "contains_display_name";
}

interface IRoomMemberCountCondition {
    kind: "room_member_count";
    is: string;
}

interface ISenderNotificationPermissionCondition {
    kind: "sender_notification_permission";
    key: string;
}

type Condition =
    IEventMatchCondition |
    IContainsDisplayNameCondition |
    IRoomMemberCountCondition |
    ISenderNotificationPermissionCondition;

enum RuleIds {
    MasterRule = ".m.rule.master", // The master rule (all notifications disabling)
    MessageRule = ".m.rule.message",
    EncryptedMessageRule = ".m.rule.encrypted",
    RoomOneToOneRule = ".m.rule.room_one_to_one",
    EncryptedRoomOneToOneRule = ".m.rule.room_one_to_one",
}

interface IPushRule {
    enabled: boolean;
    rule_id: RuleIds | string;
    actions: Action[];
    conditions: Condition[];
    default: boolean;
    kind: Kind;
}

interface IPushRulesMap {
    override: Record<string, IPushRule>;
    content: Record<string, IPushRule>;
    room: Record<string, IPushRule>;
    sender: Record<string, IPushRule>;
    underride: Record<string, IPushRule>;
}

const mapRules = (rules: IPushRule[]): Record<string, IPushRule> => {
    const map: Record<string, IPushRule> = {};
    rules.forEach(rule => {
        map[rule.rule_id] = rule;
    });
    return map;
};

const mapRuleset = (pushRules): IPushRulesMap => ({
    override: mapRules(pushRules.override),
    content: mapRules(pushRules.content),
    room: mapRules(pushRules.room),
    sender: mapRules(pushRules.sender),
    underride: mapRules(pushRules.underride),
});

const calculateNotifyMeWith = (pushRules: IPushRulesMap): NotificationSettings => {
    const masterRule = pushRules.override[RuleIds.MasterRule];
    if (masterRule && masterRule.enabled) {
        return NotificationSettings.Never;
    }

    const messageRule = pushRules.underride[RuleIds.MessageRule];
    const roomOneToOneRule = pushRules.underride[RuleIds.RoomOneToOneRule];
    // TODO
    if (messageRule) {
        if (messageRule.enabled && messageRule.actions.includes(Actions.Notify)) {
            return NotificationSettings.AllMessages;
        }
        // TODO consider how to handle other messageRule states like disabled
        if (messageRule.actions.includes(Actions.MarkUnread)) {
            if (roomOneToOneRule.actions.includes(Actions.MarkUnread)) {
                return NotificationSettings.MentionsKeywordsOnly;
            } else {
                return NotificationSettings.DirectMessagesMentionsKeywords;
            }
        }
    }

    return NotificationSettings.DirectMessagesMentionsKeywords;
};

const AdvancedNotificationsSection: React.FC = () => {
    const [expanded, toggleExpanded] = useStateToggle(false);

    let children;
    if (expanded) {
        children = <Field
            element="textarea"
            label={_t("Keywords")}
            value='{"json": "yes"}'
            readOnly
        >
            <div>{_t("Custom Rules")}</div>

            <textarea />
        </Field>;
    }

    return <SettingsSection title={_t("Advanced notifications")}>
        {children}
        <AccessibleButton kind="link" onClick={toggleExpanded}>
            {expanded ? _t("Hide") : _t("Show more")}
        </AccessibleButton>
    </SettingsSection>;
};

const useAccountData = (cli: MatrixClient, eventType: string) => {
    const [value, setValue] = useState(cli.getAccountData(eventType));

    const handler = useCallback((event) => {
        if (event.getType() !== eventType) return;
        setValue(cli.getAccountData(eventType));
    }, [cli, eventType]);
    useEventEmitter(cli, "accountData", handler);

    return value;
};

const NotificationUserSettingsTab2: React.FC = () => {
    const onChange = console.log;

    const cli = useContext<MatrixClient>(MatrixClientContext);
    const rawPushRules = useAccountData(cli, "m.push_rules");

    const [pushRules, setPushRules] = useState<IPushRulesMap>(null);
    const [notifyMeWith, setNotifyMeWith] = useState<NotificationSettings>(null);
    useEffect(() => {
        if (!rawPushRules) {
            setPushRules(null);
            return;
        }
        Promise.resolve(rawPushRules.getContent()).then(portRulesToNewAPI).then(rules => {
            const ruleMap = mapRuleset(rules.global);
            setNotifyMeWith(calculateNotifyMeWith(ruleMap));
            setPushRules(ruleMap);
        });
    }, [rawPushRules]);

    const alwaysShowBadgeCounts = useSettingValue("Notifications.alwaysShowBadgeCounts");

    if (!pushRules) return null;

    const onNotifyMeWithChange = ev => {
        setNotifyMeWith(ev.target.value);
        // TODO update push rules
    };

    let displayName = cli.getUserId();
    let avatarUrl: string = null;
    const myUser = cli.getUser(cli.getUserId());
    if (myUser) {
        displayName = myUser.rawDisplayName;
        avatarUrl = myUser.avatarUrl;
    }

    let appearancePreviewBadge;
    // TODO !showBadgeForMentions || !showBadgeForUnreadMessages
    if (alwaysShowBadgeCounts) {
        appearancePreviewBadge = (
            <div className="mx_NotificationBadge mx_NotificationBadge_visible mx_NotificationBadge_highlighted mx_NotificationBadge_2char">
                <span className="mx_NotificationBadge_count">2</span>
            </div>
        );
    } else {
        appearancePreviewBadge = (
            <div className="mx_NotificationBadge mx_NotificationBadge_visible mx_NotificationBadge_highlighted mx_NotificationBadge_dot">
                <span className="mx_NotificationBadge_count" />
            </div>
        );
    }
    const onAlwaysShowBadgeCountsChange = ev => {
        SettingsStore.setValue("Notifications.alwaysShowBadgeCounts", null, SettingLevel.ACCOUNT, ev.target.checked);
    };

    return <div className="mx_SettingsTab mx_NotificationsTab">
        <div className="mx_SettingsTab_heading">{_t("Notifications")}</div>
        <div className="mx_SettingsTab_subsectionText">
            {_t("Manage notifications across all rooms...")}
        </div>

        <SettingsSection title={_t("Notify me with")}>
            <StyledRadioButton
                onChange={onNotifyMeWithChange}
                checked={notifyMeWith === NotificationSettings.AllMessages}
                name="notifyMeWith"
                value={NotificationSettings.AllMessages}
            >
                {_t("All messages")}
            </StyledRadioButton>
            <StyledRadioButton
                onChange={onNotifyMeWithChange}
                checked={notifyMeWith === NotificationSettings.DirectMessagesMentionsKeywords}
                name="notifyMeWith"
                value={NotificationSettings.DirectMessagesMentionsKeywords}
            >
                {_t("Direct messages, mentions & keywords")}
            </StyledRadioButton>
            <StyledRadioButton
                onChange={onNotifyMeWithChange}
                checked={notifyMeWith === NotificationSettings.MentionsKeywordsOnly}
                name="notifyMeWith"
                value={NotificationSettings.MentionsKeywordsOnly}
            >
                {_t("Mentions & keywords only")}
            </StyledRadioButton>
            <StyledRadioButton
                onChange={onNotifyMeWithChange}
                checked={notifyMeWith === NotificationSettings.Never}
                name="notifyMeWith"
                value={NotificationSettings.Never}
            >
                {_t("Never")}
            </StyledRadioButton>
        </SettingsSection>

        <SettingsSection title={_t("Mentions & Keywords")}>
            <StyledCheckbox>
                {_t("Notify when someone mentions using @")}
            </StyledCheckbox>
            <StyledCheckbox>
                {_t("Notify when someone uses a keyword")}
            </StyledCheckbox>
            <div className="mx_Checkbox_microCopy">
                {_t("Enter keywords here, or use for spelling variations or nicknames")}
            </div>

            <Field
                element="textarea"
                label={_t("Keywords")}
                rows={5}
                onChange={onChange}
                value={""}
                disabled={false}
            />
        </SettingsSection>

        <SettingsSection title={_t("Appearance & Sounds")} className="mx_NotificationsTab_appearanceAndSounds">
            <div className="mx_NotificationsTab_appearance_settings">
                <StyledCheckbox checked={alwaysShowBadgeCounts} onChange={onAlwaysShowBadgeCountsChange}>
                    {_t("Show number of messages in all badges")}
                </StyledCheckbox>
                <div className="mx_Checkbox_microCopy">
                    {_t("Riot will always display the numbered badges on direct messages, mentions and set keywords")}
                </div>
            </div>

            <div className="mx_NotificationsTab_appearance_preview">
                <div className="mx_RoomTile2 mx_RoomTile2_minimized">
                    <div className="mx_RoomTile2_avatarContainer">
                        <BaseAvatar
                            idName={cli.getUserId()}
                            name={displayName}
                            url={avatarUrl}
                            width={48}
                            height={48}
                            resizeMethod="crop"
                            className="mx_LeftPanel2_userAvatar"
                        />
                    </div>
                    <div className="mx_RoomTile2_badgeContainer">
                        {appearancePreviewBadge}
                    </div>
                </div>
                <div>{_t("Preview")}</div>
            </div>

            <br />
            <br />

            <StyledCheckbox>
                {_t("Play a sound for all messages")}
            </StyledCheckbox>
            <StyledCheckbox>
                {_t("Play a sound for mentions")}
            </StyledCheckbox>
        </SettingsSection>

        <DesktopNotifications />

        <SettingsSection title={_t("Email notifications")}>
            <StyledCheckbox>
                {_t("Receive a summary of missed notifications by email")}
            </StyledCheckbox>
            Email input????
        </SettingsSection>

        <AdvancedNotificationsSection rules={[]} />
    </div>;
};

export default NotificationUserSettingsTab2;
