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

import React, {useContext, useState, useEffect} from "react";
import MatrixClient from "matrix-js-sdk/src/client";

import MatrixClientContext from "../../../../../contexts/MatrixClientContext";
import {_t} from "../../../../../languageHandler";
import StyledCheckbox from "../../../elements/StyledCheckbox";
import SettingsSection from "../../SettingsSection";
import {portRulesToNewAPI} from "../../../../../notifications";
import Field from "../../../elements/Field";
import AccessibleButton from "../../../elements/AccessibleButton";
import {useStateToggle} from "../../../../../hooks/useStateToggle";
import DesktopNotificationsSection from "../../notifications/DesktopNotificationsSection";
import StyledRadioButton from "../../../elements/StyledRadioButton";
import EmailNotificationsSection from "../../notifications/EmailNotificationsSection";
import AppearanceSoundsSection from "../../notifications/AppearanceSoundsSection";
import { useAccountData } from "../../../../../hooks/useAccountData";

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

    if (!pushRules) return null;

    const onNotifyMeWithChange = ev => {
        setNotifyMeWith(ev.target.value);
        // TODO update push rules
    };

    const mentionsKeywordsSectionDisabled = (
        notifyMeWith === NotificationSettings.AllMessages || notifyMeWith === NotificationSettings.Never
    );

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
            <StyledCheckbox disabled={mentionsKeywordsSectionDisabled}>
                {_t("Notify when someone mentions using @")}
            </StyledCheckbox>
            <StyledCheckbox disabled={mentionsKeywordsSectionDisabled}>
                {_t("Notify when someone uses a keyword")}
            </StyledCheckbox>
            <div className="mx_Checkbox_microCopy">
                {_t("Enter keywords here, or use for spelling variations or nicknames")}
            </div>

            <Field
                element="textarea"
                label={_t("New keyword")}
                rows={5}
                onChange={onChange}
                value={""}
                disabled={mentionsKeywordsSectionDisabled}
            />
        </SettingsSection>

        <AppearanceSoundsSection />

        <SettingsSection title={_t("Room notifications")}>
            ...
        </SettingsSection>

        <DesktopNotificationsSection />

        <EmailNotificationsSection />

        <AdvancedNotificationsSection rules={[]} />
    </div>;
};

export default NotificationUserSettingsTab2;
