/*
Copyright 2016 OpenMarket Ltd
Copyright 2019, 2020 The Matrix.org Foundation C.I.C.

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

import MatrixClient from "matrix-js-sdk/src/client";

import {
    Action,
    ActionType,
    Condition,
    ConditionKind,
    highlightTweak,
    IPushRuleWithConditions,
    NotificationSetting,
    PushRule, RoomNotificationSetting,
    RuleId,
    soundTweak,
    TweakKind,
} from "./types";
import {SCOPE} from "./ContentRules";
import {arrayHasDiff} from "../utils/arrays";
import {NotificationSettingStore} from "../stores/notifications/NotificationSettingStore";
import {_t} from "../languageHandler";

export const getKeywordActions = (loud: boolean) => {
    const actions: ActionType[] = [Action.Notify, highlightTweak()];
    if (loud) {
        actions.push(soundTweak());
    }
    return actions;
};

const getMismatchedNotifyMeWith = (value: NotificationSetting): PushRule[] => {
    // TODO allow keywords to be disabled

    const store = NotificationSettingStore.instance;
    switch (value) {
        case NotificationSetting.Never:
            if (store.get(RuleId.Master).enabled) {
                return [];
            }
            return []; // TODO

        case NotificationSetting.AllMessages:
            return notifyMeWithAllRules.map(id => store.get(id)).filter(rule => {
                return !rule.enabled || !rule.actions.includes(Action.Notify);
            });

        case NotificationSetting.MentionsKeywordsOnly:
            return [
                ...notifyMeWithMentionsKeywordsRules.map(id => store.get(id)),
                ...store.getKeywordRules(),
            ].filter(rule => !rule.enabled || !rule.actions.includes(Action.Notify));

        case NotificationSetting.DirectMessagesMentionsKeywords:
            return [
                ...notifyMeWithDmMentionsKeywordsRules.map(id => store.get(id)),
                ...store.getKeywordRules(),
            ].filter(rule => !rule.enabled || !rule.actions.includes(Action.Notify));

    }
};

export const ruleHasCondition = (rule: IPushRuleWithConditions, target: Condition) => {
    return rule.conditions.some(c => {
        switch (target.kind) {
            case ConditionKind.EventMatch:
                return c.kind === target.kind && c.key === target.key && c.pattern === target.pattern;
            case ConditionKind.ContainsDisplayName:
                return c.kind === target.kind;
            case ConditionKind.RoomMemberCount:
                return c.kind === target.kind && c.is === target.is;
            case ConditionKind.SenderNotificationPermission:
                return c.kind === target.kind && c.key === target.key;
        }
    });
};

export const actionIsTweakOfKind = (action: ActionType, kind: TweakKind) => {
    if (typeof action !== "object") return false;
    return action.set_tweak === kind;
}

export const updatePushRule = (cli: MatrixClient, rule: PushRule, enabled?: boolean, actions?: ActionType[]) => {
    const promises: Promise<any>[] = [];

    if (enabled !== undefined && rule.enabled !== enabled) {
        promises.push(cli.setPushRuleEnabled(SCOPE, rule.kind, rule.rule_id, enabled));
    }

    if (actions !== undefined && arrayHasDiff(rule.actions, actions)) {
        promises.push(cli.setPushRuleActions(SCOPE, rule.kind, rule.rule_id, actions));
    }

    return Promise.all(promises);
};

export const writeNotifyMeWith = (cli: MatrixClient, value: NotificationSetting) => {
    const store = NotificationSettingStore.instance;
    if (value === NotificationSetting.Never) {
        return updatePushRule(cli, store.get(RuleId.Master), true, []);
    }

    return Promise.all([
        updatePushRule(cli, store.get(RuleId.Master), false, []),
        updatePushRule(cli, store.get(RuleId.RoomOneToOne),
            value !== NotificationSetting.MentionsKeywordsOnly, [Action.Notify, soundTweak()]),
        updatePushRule(cli, store.get(RuleId.Message),
            // we add sound tweak additionally here so that when changing your notifyMeWith the sound follows
            value === NotificationSetting.AllMessages, [Action.Notify, soundTweak()]),
    ]);
};

export const possibleRoomSoundOptions = (roomId: string, value: RoomNotificationSetting): RoomNotificationSetting[] => {
    if (value === NotificationSetting.AllMessages) {
        return [
            NotificationSetting.AllMessages,
            NotificationSetting.MentionsKeywordsOnly,
        ];
    }

    return [
        NotificationSetting.AllMessages,
        value,
    ];
};

export const labelForSetting = (setting: NotificationSetting): string => {
    switch (setting) {
        case NotificationSetting.AllMessages:
            return _t("All messages");
        case NotificationSetting.DirectMessagesMentionsKeywords:
            return _t("Direct messages, mentions & keywords");
        case NotificationSetting.MentionsKeywordsOnly:
            return _t("Mentions & keywords only");
        case NotificationSetting.Never:
            return _t("Never");
    }
}
