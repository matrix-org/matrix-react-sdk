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
    highlightTweak,
    PushRule,
    NotificationSetting,
    RuleId,
    soundTweak, roundRoomNotificationSetting,
} from "./types";
import {SCOPE} from "./ContentRules";
import {arrayHasDiff} from "../utils/arrays";
import {NotificationSettingStore} from "../stores/notifications/NotificationSettingStore";

interface IEncodedActions {
    notify: boolean;
    sound?: string;
    highlight?: boolean;
}

export class NotificationUtils {
    // Encodes a dictionary of {
    //   "notify": true/false,
    //   "sound": string or undefined,
    //   "highlight: true/false,
    // }
    // to a list of push actions.
    static encodeActions(action: IEncodedActions) {
        const notify = action.notify;
        const sound = action.sound;
        const highlight = action.highlight;
        if (notify) {
            const actions: ActionType[] = [Action.Notify];
            if (sound) {
                actions.push(soundTweak(sound));
            }
            if (highlight) {
                actions.push(highlightTweak());
            } else {
                actions.push(highlightTweak(false));
            }
            return actions;
        } else {
            return [Action.DontNotify];
        }
    }

    // Decode a list of actions to a dictionary of {
    //   "notify": true/false,
    //   "sound": string or undefined,
    //   "highlight: true/false,
    // }
    // If the actions couldn't be decoded then returns null.
    static decodeActions(actions: ActionType[]): IEncodedActions {
        let notify = false;
        let sound = null;
        let highlight = false;

        for (let i = 0; i < actions.length; ++i) {
            const action = actions[i];
            if (action === Action.Notify) {
                notify = true;
            } else if (action === Action.DontNotify) {
                notify = false;
            } else if (typeof action === "object") {
                if (action.set_tweak === "sound") {
                    sound = action.value;
                } else if (action.set_tweak === "highlight") {
                    highlight = action.value;
                } else {
                    // We don't understand this kind of tweak, so give up.
                    return null;
                }
            } else {
                // We don't understand this kind of action, so give up.
                return null;
            }
        }

        if (highlight === undefined) {
            // If a highlight tweak is missing a value then it defaults to true.
            highlight = true;
        }

        const result: IEncodedActions = { notify, highlight };
        if (sound !== null) {
            result.sound = sound;
        }
        return result;
    }
}

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

    // TODO if selecting ALL_MESSAGES, set noisy to that too
    return Promise.all([
        updatePushRule(cli, store.get(RuleId.Master), false, []),
        updatePushRule(cli, store.get(RuleId.RoomOneToOne),
            value !== NotificationSetting.MentionsKeywordsOnly, [Action.Notify, soundTweak()]),
        updatePushRule(cli, store.get(RuleId.Message),
            value === NotificationSetting.AllMessages, [Action.Notify]),
    ]);
};

export const possibleRoomSoundOverrides = (value: NotificationSetting) => {
    const rounded = roundRoomNotificationSetting(value);
};
