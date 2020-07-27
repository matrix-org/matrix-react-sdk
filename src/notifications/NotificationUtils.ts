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

import {ActionType, Action, IExtendedPushRule, IPushRuleSet} from "./types";
import {EventEmitter} from "events";
import {objectDiff} from "../utils/objects";

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

export class PushRuleMap extends EventEmitter implements Partial<Map<string, IExtendedPushRule>> {
    private map: Map<string, IExtendedPushRule>;

    constructor(private _rules: IPushRuleSet) {
        super();
        this.setPushRules(_rules);
    }

    public get rules() {
        return  this._rules;
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
        this._rules = rules;

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

    hasEnabledRuleWithAction(ruleId: string, action: ActionType) {
        if (!this.has(ruleId)) return false;
        const rule = this.get(ruleId);
        return rule.enabled && rule.actions.includes(action);
    }

    // TODO this is different than it used to be
    getKeywordRules(): IExtendedPushRule[] {
        return this.rules.content.filter(r => !r.rule_id.startsWith("."));
    }

    get(key: string): IExtendedPushRule | undefined {
        return this.map.get(key);
    }

    has(key: string): boolean {
        return this.map.has(key);
    }
}
