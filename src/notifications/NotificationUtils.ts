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

export class PushRuleMap extends Map<string, IExtendedPushRule> {
    constructor(public readonly rules: IPushRuleSet) {
        super(Object.values(rules).flat(1).reverse().map(r => [r.rule_id, r]));
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
}
