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
    compareNotificationSettings,
    HighlightTweak,
    IExtendedPushRule,
    IPushRuleSet,
    NotificationSetting,
    RuleId,
    SoundTweak,
    Tweak,
    TweakType
} from "./types";
import {EventEmitter} from "events";
import {objectDiff} from "../utils/objects";
import {KIND, SCOPE} from "./ContentRules";
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
                actions.push(SoundTweak(sound));
            }
            if (highlight) {
                actions.push(HighlightTweak());
            } else {
                actions.push(HighlightTweak(false));
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
export const EVENT_PLAY_SOUND_FOR_CHANGED = Symbol("play-sound-for-changed");

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
    private _playSoundFor: NotificationSetting = null;
    private _keywordsEnabled: boolean;

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

    public get playSoundFor() {
        return this._playSoundFor;
    }

    public get keywordsEnabled() {
        return this._keywordsEnabled;
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

        const oldNotifyMeWidth = this._notifyMeWith;
        this._notifyMeWith = this.calculateNotifyMeWith();
        if (oldNotifyMeWidth !== this._notifyMeWith) {
            this.emit(EVENT_NOTIFY_ME_WITH_CHANGED, this._notifyMeWith);
        }

        const oldPlaySoundFor = this._playSoundFor;
        this._playSoundFor = this.calculatePlaySoundFor();
        if (oldPlaySoundFor !== this._playSoundFor) {
            this.emit(EVENT_PLAY_SOUND_FOR_CHANGED, this._playSoundFor);
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

        this._keywordsEnabled = this.calculateKeywordRulesEnabled();
        if (contentRuleChanges.added.length || contentRuleChanges.removed.length || contentRuleChanges.changed.length) {
            this.emit(EVENT_KEYWORDS_CHANGED, this._keywordsEnabled);
        }
    }

    private calculateNotifyMeWith(): NotificationSetting {
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
        // if (this.getKeywordRules().some(r => r.enabled && r.actions.includes(Action.Notify))) {
        //     return NotificationSetting.MentionsKeywordsOnly;
        // }

        return NotificationSetting.Never; // no?
    }

    private calculatePlaySoundFor(): NotificationSetting {
        if (this.get(RuleId.Master).enabled) {
            return NotificationSetting.Never;
        }

        if (notifyMeWithAllRules.some(id => this.hasEnabledRuleWithTweak(id, TweakType.Sound))) {
            return NotificationSetting.AllMessages;
        }

        if (notifyMeWithDmMentionsKeywordsRules.some(id => this.hasEnabledRuleWithTweak(id, TweakType.Sound))) {
            return NotificationSetting.DirectMessagesMentionsKeywords;
        }

        if (notifyMeWithMentionsKeywordsRules.some(id => this.hasEnabledRuleWithTweak(id, TweakType.Sound))) {
            return NotificationSetting.MentionsKeywordsOnly;
        }
        if (this.getKeywordRules().some(r => r.enabled && r.actions.some(a => (<Tweak>a).set_tweak === TweakType.Sound))) {
            return NotificationSetting.MentionsKeywordsOnly;
        }

        return NotificationSetting.Never; // no?
    }

    private static getKeywordActions(loud: boolean) {
        const actions: ActionType[] = [Action.Notify, HighlightTweak()];
        if (loud) {
            actions.push(SoundTweak());
        }
        return actions;
    }

    public async addKeywordRule(cli: MatrixClient, keyword: string, enabled: boolean, loud: boolean) {
        const actions = PushRuleMap.getKeywordActions(loud);

        const matchingRule = this.getKeywordRules().find(r => r.pattern === keyword);
        if (matchingRule) {
            return updatePushRule(cli, matchingRule, enabled, actions);
        }

        await cli.addPushRule(SCOPE, KIND, keyword, {
            pattern: keyword,
            actions,
        });

        if (!enabled) {
            await cli.setPushRuleEnabled(SCOPE, KIND, keyword, false);
        }
    }

    public async removeKeywordRule(cli: MatrixClient, keyword: string) {
        const matchingRule = this.getKeywordRules().find(r => r.pattern === keyword);
        if (matchingRule) {
            await cli.deletePushRule(SCOPE, matchingRule.kind, matchingRule.rule_id);
        }
    }

    public async updateKeywordRules(cli: MatrixClient, enabled: boolean, loud: boolean) {
        const actions = PushRuleMap.getKeywordActions(loud);
        const rules = this.getKeywordRules();
        return Promise.all(rules.map(async (rule) => updatePushRule(cli, rule, enabled, actions)));
    }

    public async setSoundTweakInRule(cli: MatrixClient, rule: IExtendedPushRule, loud: boolean, sound?: string) {
        let actions = rule.actions.filter(a => (<Tweak>a).set_tweak !== TweakType.Sound);
        if (loud) {
            actions.push(SoundTweak(sound));
        }

        return updatePushRule(cli, rule, undefined, actions);
    }

    public async updateSoundRules(cli: MatrixClient, volume: NotificationSetting) {
        const promises: Promise<any>[] = [];

        const notifyMeWithAllRulesLoud = compareNotificationSettings(volume, NotificationSetting.AllMessages) >= 0;
        promises.push(...notifyMeWithAllRules.map(id => {
            return this.setSoundTweakInRule(cli, this.get(id), notifyMeWithAllRulesLoud);
        }));

        const notifyMeWithDmMentionsKeywordsRulesLoud =
            compareNotificationSettings(volume, NotificationSetting.DirectMessagesMentionsKeywords) >= 0;
        promises.push(...notifyMeWithDmMentionsKeywordsRules.map(id => {
            return this.setSoundTweakInRule(cli, this.get(id), notifyMeWithDmMentionsKeywordsRulesLoud);
        }));

        const notifyMeWithMentionsKeywordsRulesLoud =
            compareNotificationSettings(volume, NotificationSetting.MentionsKeywordsOnly) >= 0;
        promises.push(...notifyMeWithMentionsKeywordsRules.map(id => {
            return this.setSoundTweakInRule(cli, this.get(id), notifyMeWithMentionsKeywordsRulesLoud);
        }));

        return Promise.all(promises);
    }

    public hasEnabledRuleWithAction(ruleId: string, action: ActionType) {
        if (!this.has(ruleId)) return false;
        const rule = this.get(ruleId);
        return rule.enabled && rule.actions.includes(action);
    }

    public hasEnabledRuleWithTweak(ruleId: string, tweakType: TweakType) {
        if (!this.has(ruleId)) return false;
        const rule = this.get(ruleId);
        return rule.enabled && rule.actions.some(a => (<Tweak>a).set_tweak === tweakType);
    }

    // TODO this is different than it used to be
    public getKeywordRules(): IExtendedPushRule[] {
        return this.rules.content.filter(r => !r.rule_id.startsWith("."));
    }

    private calculateKeywordRulesEnabled(): boolean {
        const keywordRules = this.getKeywordRules();
        // if there are no keyword rules, say they are enabled eagerly
        return keywordRules.length < 1 || keywordRules.some(rule => {
            return rule.enabled && rule.actions.includes(Action.Notify);
        });
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

export const updatePushRule = (cli: MatrixClient, rule: IExtendedPushRule, enabled?: boolean, actions?: ActionType[]) => {
    const promises: Promise<any>[] = [];

    if (enabled !== undefined && rule.enabled !== enabled) {
        promises.push(cli.setPushRuleEnabled(SCOPE, rule.kind, rule.rule_id, enabled));
    }

    if (actions !== undefined && arrayHasDiff(rule.actions, actions)) {
        promises.push(cli.setPushRuleActions(SCOPE, rule.kind, rule.rule_id, actions));
    }

    return Promise.all(promises);
};

export const writeNotifyMeWith = (cli: MatrixClient, pushRules: PushRuleMap, value: NotificationSetting) => {
    if (value === NotificationSetting.Never) {
        return updatePushRule(cli, pushRules.get(RuleId.Master), true, []);
    }

    return Promise.all([
        updatePushRule(cli, pushRules.get(RuleId.Master), false, []),
        updatePushRule(cli, pushRules.get(RuleId.RoomOneToOne),
            value !== NotificationSetting.MentionsKeywordsOnly, [Action.Notify, SoundTweak()]),
        updatePushRule(cli, pushRules.get(RuleId.Message),
            value === NotificationSetting.AllMessages, [Action.Notify]),
    ]);
};
