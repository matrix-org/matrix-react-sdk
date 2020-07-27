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
    DefaultSoundTweak,
    IExtendedPushRule,
    IPushRuleSet,
    NotificationSetting,
    RuleId
} from "./types";
import {EventEmitter} from "events";
import {objectDiff} from "../utils/objects";
import {SCOPE} from "./ContentRules";
import {arrayHasDiff} from "../utils/arrays";

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
                actions.push({"set_tweak": "sound", "value": sound});
            }
            if (highlight) {
                actions.push({"set_tweak": "highlight"});
            } else {
                actions.push({"set_tweak": "highlight", "value": false});
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

export const EVENT_KEYWORDS_CHANGED = Symbol("event-keywords-changed");
export const EVENT_NOTIFY_ME_WITH_CHANGED = Symbol("notify-me-with-changed");

const notifyMeWithAllRules = [
    RuleId.Message,
];

const notifyMeWithDmMentionsKeywordsRules = [
    RuleId.RoomOneToOne,
];

const notifyMeWithMentionsKeywordsRules = [
    RuleId.Encrypted,

    RuleId.InviteForMe, // TODO Maybe?

    // These have their own toggles:
    // RuleId.ContainsUserName,
    // RuleId.ContainsDisplayName,
    // RuleId.RoomNotif,

    // TODO handle
    // RuleId.SuppressNotices;
    // RuleId.SuppressEdits;
];

export class PushRuleMap extends EventEmitter implements Partial<Map<string, IExtendedPushRule>> {
    private map: Map<string, IExtendedPushRule>;
    private _notifyMeWith: NotificationSetting = null;

    constructor(private _rules?: IPushRuleSet) {
        super();
        this.setPushRules(_rules);
    }

    public get rules() {
        return this._rules;
    }

    public get notifyMeWith() {
        return this._notifyMeWith;
    }

    public setPushRules(rules: IPushRuleSet) {
        // tag them with kind so they make sense when flattened
        Object.keys(rules).forEach(kind => {
            rules[kind].forEach(rule => {
                rule.kind = kind;
            });
        });

        this.map = new Map(Object.values(rules).flat(1).reverse().map(r => [r.rule_id, r]));

        const oldRules = this.rules;
        const oldNotifyMeWidth = this._notifyMeWith;
        this._rules = rules;
        this._notifyMeWith = this.calculateNotifyMeWith();

        if (oldNotifyMeWidth !== this._notifyMeWith) {
            this.emit(EVENT_NOTIFY_ME_WITH_CHANGED, this._notifyMeWith);
        }

        const contentRuleChanges = objectDiff(oldRules.content, rules.content);

        const changedRules = new Set<string>();
        [
            contentRuleChanges,
            objectDiff(oldRules.override, rules.override),
            objectDiff(oldRules.room, rules.room),
            objectDiff(oldRules.sender, rules.sender),
            objectDiff(oldRules.underride, rules.underride),
        ].forEach(diff => {
            diff.added.forEach(k => changedRules.add(k));
            diff.removed.forEach(k => changedRules.add(k));
            diff.changed.forEach(k => changedRules.add(k));
        });

        [...changedRules].forEach(k => {
            this.emit(k, this.map.get(k));
        });

        if (contentRuleChanges.added.length || contentRuleChanges.removed.length || contentRuleChanges.changed.length) {
            this.emit(EVENT_KEYWORDS_CHANGED);
        }
    }

    private calculateNotifyMeWith = (): NotificationSetting => {
        if (this.get(RuleId.Master).enabled) {
            return NotificationSetting.Never;
        }

        if (notifyMeWithAllRules.some(id => this.hasEnabledRuleWithAction(id, Action.Notify))) {
            return NotificationSetting.AllMessages;
        }

        if (notifyMeWithDmMentionsKeywordsRules.some(id => this.hasEnabledRuleWithAction(id, Action.Notify))) {
            return NotificationSetting.DirectMessagesMentionsKeywords;
        }

        if (notifyMeWithMentionsKeywordsRules.some(id => this.hasEnabledRuleWithAction(id, Action.Notify))) {
            return NotificationSetting.MentionsKeywordsOnly;
        }
        if (this.getKeywordRules().some(r => r.enabled && r.actions.includes(Action.Notify))) {
            return NotificationSetting.MentionsKeywordsOnly;
        }

        return NotificationSetting.Never; // no?
    };

    public hasEnabledRuleWithAction(ruleId: string, action: ActionType) {
        if (!this.has(ruleId)) return false;
        const rule = this.get(ruleId);
        return rule.enabled && rule.actions.includes(action);
    }

    // TODO this is different than it used to be
    public getKeywordRules(): IExtendedPushRule[] {
        return this.rules.content.filter(r => !r.rule_id.startsWith("."));
    }

    public get(key: string): IExtendedPushRule | undefined {
        return this.map.get(key);
    }

    public has(key: string): boolean {
        return this.map.has(key);
    }
}

const getMismatchedNotifyMeWith = (pushRules: PushRuleMap, value: NotificationSetting): IExtendedPushRule[] => {
    // TODO allow keywords to be disabled

    switch (value) {
        case NotificationSetting.Never:
            if (pushRules.get(RuleId.Master).enabled) {
                return [];
            }
            return []; // TODO

        case NotificationSetting.AllMessages:
            return notifyMeWithAllRules.map(id => pushRules.get(id)).filter(rule => {
                return !rule.enabled || !rule.actions.includes(Action.Notify);
            });

        case NotificationSetting.MentionsKeywordsOnly:
            return [
                ...notifyMeWithMentionsKeywordsRules.map(id => pushRules.get(id)),
                ...pushRules.getKeywordRules(),
            ].filter(rule => !rule.enabled || !rule.actions.includes(Action.Notify));

        case NotificationSetting.DirectMessagesMentionsKeywords:
            return [
                ...notifyMeWithDmMentionsKeywordsRules.map(id => pushRules.get(id)),
                ...pushRules.getKeywordRules(),
            ].filter(rule => !rule.enabled || !rule.actions.includes(Action.Notify));

    }
};

export const updateServerPushRule = (cli: MatrixClient, rule: IExtendedPushRule, enabled: boolean, actions: ActionType[]) => {
    const promises: Promise<any>[] = [];

    if (rule.enabled !== enabled) {
        promises.push(cli.setPushRuleEnabled(SCOPE, rule.kind, rule.rule_id, enabled));
    }

    if (arrayHasDiff(rule.actions, actions)) {
        promises.push(cli.setPushRuleActions(SCOPE, rule.kind, rule.rule_id, actions));
    }

    return Promise.all(promises);
};

export const writeNotifyMeWith = (cli: MatrixClient, pushRules: PushRuleMap, value: NotificationSetting) => {
    if (value === NotificationSetting.Never) {
        return updateServerPushRule(cli, pushRules.get(RuleId.Master), true, []);
    }

    return Promise.all([
        updateServerPushRule(cli, pushRules.get(RuleId.Master), false, []),
        updateServerPushRule(cli, pushRules.get(RuleId.RoomOneToOne),
            value !== NotificationSetting.MentionsKeywordsOnly, [Action.Notify, DefaultSoundTweak]),
        updateServerPushRule(cli, pushRules.get(RuleId.Message),
            value === NotificationSetting.AllMessages, [Action.Notify]),
    ]);
};
