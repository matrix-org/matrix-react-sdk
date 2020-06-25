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

import React, {useContext, useEffect, useState} from "react";
import MatrixClient from "matrix-js-sdk/src/client";

import MatrixClientContext from "../../../../../contexts/MatrixClientContext";
import {_t} from "../../../../../languageHandler";
import SettingsSection from "../../SettingsSection";
import {ContentRules} from "../../../../../notifications";
import Field from "../../../elements/Field";
import AccessibleButton from "../../../elements/AccessibleButton";
import {useStateToggle} from "../../../../../hooks/useStateToggle";
import DesktopNotificationsSection from "../../notifications/DesktopNotificationsSection";
import EmailNotificationsSection from "../../notifications/EmailNotificationsSection";
import AppearanceSoundsSection from "../../notifications/AppearanceSoundsSection";
import {useAccountData} from "../../../../../hooks/useAccountData";
import MentionsKeywordsSection from "../../notifications/MentionsKeywordsSection";
import {
    Actions,
    compareNotificationSettings, IExtendedPushRule,
    IPushRule, IPushRuleSet,
    IPushRulesMap,
    NotificationSetting,
    RuleIds,
} from "../../../../../notifications/types";
import RoomOverridesSection from "../../notifications/RoomOverridesSection";
import StyledRadioGroup from "../../../elements/StyledRadioGroup";
import {State} from "../../../../../notifications/PushRuleVectorState";

const mapRules = (rules: IPushRule[]): Record<string, IPushRule> => {
    const map: Record<string, IPushRule> = {};
    rules.forEach(rule => {
        map[rule.rule_id] = rule;
    });
    return map;
};

const mapRuleset = (pushRules: IPushRuleSet): IPushRulesMap => ({
    override: mapRules(pushRules.override),
    room: mapRules(pushRules.room),
    sender: mapRules(pushRules.sender),
    underride: mapRules(pushRules.underride),
});

const calculateNotifyMeWith = (pushRules: IPushRulesMap): NotificationSetting => {
    const masterRule = pushRules.override[RuleIds.MasterRule];
    if (masterRule && masterRule.enabled) {
        return NotificationSetting.Never;
    }

    const messageRule = pushRules.underride[RuleIds.MessageRule];
    const roomOneToOneRule = pushRules.underride[RuleIds.RoomOneToOneRule];
    // TODO
    if (messageRule) {
        if (messageRule.enabled && messageRule.actions.includes(Actions.Notify)) {
            return NotificationSetting.AllMessages;
        }
        // TODO consider how to handle other messageRule states like disabled
        if (messageRule.actions.includes(Actions.MarkUnread)) {
            if (roomOneToOneRule.actions.includes(Actions.MarkUnread)) {
                return NotificationSetting.MentionsKeywordsOnly;
            } else {
                return NotificationSetting.DirectMessagesMentionsKeywords;
            }
        }
    }

    return NotificationSetting.DirectMessagesMentionsKeywords;
};

interface IAdvancedNotificationSectionProps {
    rules: IExtendedPushRule[];
}

const AdvancedNotificationsSection: React.FC<IAdvancedNotificationSectionProps> = ({rules}) => {
    const [expanded, toggleExpanded] = useStateToggle(false);

    let children;
    if (expanded) {
        children = <React.Fragment>
            <Field
                element="textarea"
                label={_t("Custom Rules")}
                value={JSON.stringify(rules, null, 4)}
                readOnly
            />
        </React.Fragment>;
    }

    return <SettingsSection title={_t("Advanced notifications")}>
        {children}
        <AccessibleButton kind="link" onClick={toggleExpanded}>
            {expanded ? _t("Hide") : _t("Show more")}
        </AccessibleButton>
    </SettingsSection>;
};

const NotificationUserSettingsTab2: React.FC = () => {
    const cli = useContext<MatrixClient>(MatrixClientContext);
    const rawPushRules = useAccountData(cli, "m.push_rules");

    const [pushRules, setPushRules] = useState<IPushRulesMap>(null);
    const [notifyMeWith, setNotifyMeWith] = useState<NotificationSetting>(null);
    useEffect(() => {
        if (!rawPushRules) {
            setPushRules(null);
            return;
        }
        const rules = rawPushRules.getContent();
        const ruleMap = mapRuleset(rules.global);
        setNotifyMeWith(calculateNotifyMeWith(ruleMap));
        setPushRules(ruleMap);
    }, [rawPushRules]);

    const contentRules = ContentRules.parseContentRules(rawPushRules.getContent());
    const [keywordsEnabled, setKeywordsEnabled] = useState(contentRules.vectorState !== State.Off);

    // TODO wire up playSoundFor
    const [playSoundFor, setPlaySoundFor] = useState<NotificationSetting>(NotificationSetting.MentionsKeywordsOnly);

    const onPlaySoundForChange = (value: NotificationSetting) => {
        setPlaySoundFor(value);
        // TODO update push rules including all keywords
        const soundEnabled = compareNotificationSettings(value, NotificationSetting.Never) > 0;
        ContentRules.updateContentRules(cli, contentRules, keywordsEnabled, soundEnabled); // TODO error handling
    };

    if (!pushRules) return null;

    const onNotifyMeWithChange = value => {
        setNotifyMeWith(value);
        // TODO update push rules
    };

    const mentionsKeywordsSectionDisabled = notifyMeWith === NotificationSetting.Never;

    return <div className="mx_SettingsTab mx_NotificationsTab">
        <div className="mx_SettingsTab_heading">{_t("Notifications")}</div>
        <div className="mx_SettingsTab_subsectionText">
            {_t("Manage notifications across all rooms...")}
        </div>

        <SettingsSection title={_t("Notify me with")}>
            <StyledRadioGroup
                name="notifyMeWith"
                value={notifyMeWith}
                onChange={onNotifyMeWithChange}
                definitions={[
                    {
                        value: NotificationSetting.AllMessages,
                        label: _t("All messages"),
                    }, {
                        value: NotificationSetting.DirectMessagesMentionsKeywords,
                        label: _t("Direct messages, mentions & keywords"),
                    }, {
                        value: NotificationSetting.MentionsKeywordsOnly,
                        label: _t("Mentions & keywords only"),
                    }, {
                        value: NotificationSetting.Never,
                        label: _t("Never"),
                    },
                ]}
            />
        </SettingsSection>

        <MentionsKeywordsSection
            disabled={mentionsKeywordsSectionDisabled}
            contentRules={contentRules}
            keywordsEnabled={keywordsEnabled}
            setKeywordsEnabled={setKeywordsEnabled}
            soundEnabled={compareNotificationSettings(playSoundFor, NotificationSetting.Never) > 0}
        />

        <AppearanceSoundsSection
            notifyMeWith={notifyMeWith}
            playSoundFor={playSoundFor}
            onChange={onPlaySoundForChange}
        />

        <RoomOverridesSection notifyMeWith={notifyMeWith} pushRules={pushRules} />

        <DesktopNotificationsSection />

        <EmailNotificationsSection />

        <AdvancedNotificationsSection rules={[...contentRules.externalRules]} />
    </div>;
};

export default NotificationUserSettingsTab2;
