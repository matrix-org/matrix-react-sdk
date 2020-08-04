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

import { MatrixClient } from "matrix-js-sdk/src/client";
import { MatrixEvent } from "matrix-js-sdk/src/models/event";

import { ActionPayload } from "../../dispatcher/payloads";
import defaultDispatcher from "../../dispatcher/dispatcher";
import { AsyncStoreWithClient } from "../AsyncStoreWithClient";
import {
    Action,
    ActionType,
    compareNotificationSettings,
    ConditionKind,
    IPushRuleSet,
    IPushRuleWithPattern,
    IRuleSets,
    Kind,
    NotificationSetting,
    PushRule,
    RoomNotificationSetting,
    RuleId,
    soundTweak,
    Tweak,
    TweakKind,
} from "../../notifications/types";
import {objectKeyChanges} from "../../utils/objects";
import {KIND, SCOPE} from "../../notifications/ContentRules";
import {
    actionIsTweakOfKind,
    getKeywordActions,
    ruleHasCondition,
    updatePushRule,
} from "../../notifications/NotificationUtils";
import {mapKeyChanges} from "../../utils/maps";

export const EVENT_KEYWORDS_CHANGED = Symbol("event-keywords-changed");
export const EVENT_NOTIFY_ME_WITH_CHANGED = Symbol("notify-me-with-changed");
export const EVENT_PLAY_SOUND_FOR_CHANGED = Symbol("play-sound-for-changed");
export const EVENT_ROOM_OVERRIDE_CHANGED = Symbol("room-override-changed");
export const getEventRoomNotifyOverrideChanged = (roomId: string) => `event-room-notify-override-changed:${roomId}`;
export const getEventRoomSoundOverrideChanged = (roomId: string) => `event-room-sound-override-changed:${roomId}`;
export const getEventRoomOverrideChanged = (roomId: string) => `event-room-override-changed:${roomId}`;

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

interface IState {
}

// TODO consider using the lock whilst performing updates so the UI doesn't flicker and dropping any updates whilst locked
export class NotificationSettingStore extends AsyncStoreWithClient<IState> {
    private ruleMap: Map<string, PushRule>;
    private _notifyMeWith: NotificationSetting = null;
    private _playSoundFor: NotificationSetting = null;
    private _keywordsEnabled: boolean;
    private _rules: IPushRuleSet = {
        override: [],
        content: [],
        room: [],
        sender: [],
        underride: [],
    };
    private roomNotifyOverrides: Map<string, RoomNotificationSetting> = new Map();
    private roomSoundOverrides: Map<string, RoomNotificationSetting> = new Map();

    private static internalInstance = new NotificationSettingStore();

    private constructor() {
        super(defaultDispatcher, {});
    }

    public static get instance(): NotificationSettingStore {
        return NotificationSettingStore.internalInstance;
    }

    protected async onNotReady() {
        if (this.matrixClient) {
            this.matrixClient.removeListener("accountData", this.onAccountDataEvents);
        }
        await this.reset({});
    }

    protected async onReady() {
        this.matrixClient.on("accountData", this.onAccountDataEvents);
        this.setPushRules(this.matrixClient.pushRules.global); // trigger an initial update
    }

    protected async onAction(payload: ActionPayload) {
        // we don't actually do anything here
    }

    private onAccountDataEvents = (ev: MatrixEvent) => {
        if (ev.getType() === "m.push_rules") {
            const pushRules: IRuleSets = ev.getContent();
            this.setPushRules(pushRules.global);
        }
    };

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

    private setPushRules(rules: IPushRuleSet) {
        // tag them with kind so they make sense when flattened
        Object.keys(rules).forEach((kind: Kind) => {
            rules[kind].forEach((rule: PushRule) => {
                rule.kind = kind;
                // Filter out `dont_notify` as it is a no-op and simplifies later checks
                rule.actions = rule.actions.filter(a => a !== Action.DontNotify);
            });
        });

        this.ruleMap = new Map(Object.values(rules).flat(1).reverse().map(r => [r.rule_id, r]));

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

        const contentRuleChanges = objectKeyChanges(oldRules.content, rules.content);

        const changedRules = new Set<string>();
        [
            contentRuleChanges,
            objectKeyChanges(oldRules.override, rules.override),
            objectKeyChanges(oldRules.room, rules.room),
            objectKeyChanges(oldRules.sender, rules.sender),
            objectKeyChanges(oldRules.underride, rules.underride),
        ].forEach(diff => diff.forEach(k => changedRules.add(k)));

        [...changedRules].forEach(k => {
            this.emit(k, this.ruleMap.get(k));
        });

        this._keywordsEnabled = this.calculateKeywordRulesEnabled();
        if (contentRuleChanges.length > 0) {
            this.emit(EVENT_KEYWORDS_CHANGED, this._keywordsEnabled);
        }

        const oldRoomNotifyOverrides = this.roomNotifyOverrides;
        const oldRoomSoundOverrides = this.roomSoundOverrides;
        [this.roomNotifyOverrides, this.roomSoundOverrides] = this.calculateRoomOverrides();

        const roomNotifyChanges = mapKeyChanges(oldRoomNotifyOverrides, this.roomNotifyOverrides);
        const roomSoundChanges = mapKeyChanges(oldRoomSoundOverrides, this.roomSoundOverrides);

        roomNotifyChanges.forEach(roomId => {
            this.emit(getEventRoomNotifyOverrideChanged(roomId), this.roomNotifyOverrides.get(roomId));
        });
        roomSoundChanges.forEach(roomId => {
            this.emit(getEventRoomSoundOverrideChanged(roomId), this.roomSoundOverrides.get(roomId));
        });

        new Set([...roomNotifyChanges, ...roomSoundChanges]).forEach(roomId => {
            this.emit(getEventRoomOverrideChanged(roomId), [
                this.roomNotifyOverrides.get(roomId),
                this.roomSoundOverrides.get(roomId),
            ]);
        });

        if (roomNotifyChanges.length > 0 || roomSoundChanges.length > 0) {
            this.emit(EVENT_ROOM_OVERRIDE_CHANGED);
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

        return NotificationSetting.Never; // no?
    }

    private calculatePlaySoundFor(): NotificationSetting {
        if (this.get(RuleId.Master).enabled) {
            return NotificationSetting.Never;
        }

        if (notifyMeWithAllRules.some(id => this.hasEnabledRuleWithTweak(id, TweakKind.Sound))) {
            return NotificationSetting.AllMessages;
        }

        if (notifyMeWithDmMentionsKeywordsRules.some(id => this.hasEnabledRuleWithTweak(id, TweakKind.Sound))) {
            return NotificationSetting.DirectMessagesMentionsKeywords;
        }

        if (notifyMeWithMentionsKeywordsRules.some(id => this.hasEnabledRuleWithTweak(id, TweakKind.Sound))) {
            return NotificationSetting.MentionsKeywordsOnly;
        }
        const keywordRules = this.getKeywordRules();
        if (keywordRules.some(r => r.enabled && r.actions.some(a => (<Tweak>a).set_tweak === TweakKind.Sound))) {
            return NotificationSetting.MentionsKeywordsOnly;
        }

        return NotificationSetting.Never; // no? - TODO this will have a knock on effect of disabling UI elements
    }

    private calculateRoomOverrides(): [Map<string, RoomNotificationSetting>, Map<string, RoomNotificationSetting>] {
        const notifyOverrides = new Map<string, RoomNotificationSetting>();
        const soundOverrides = new Map<string, RoomNotificationSetting>();

        this.rules.underride.forEach(rule => {
            if (rule.enabled && rule.rule_id[0] === "!" && ruleHasCondition(rule, {
                kind: ConditionKind.EventMatch,
                pattern: rule.rule_id,
                key: "room_id",
            }) && ruleHasCondition(rule, {
                kind: ConditionKind.EventMatch,
                pattern: "*",
                key: "content.body",
            }) && rule.actions.includes(Action.Notify)) {
                notifyOverrides.set(rule.rule_id, NotificationSetting.AllMessages);
                if (rule.actions.some(action => actionIsTweakOfKind(action, TweakKind.Sound))) {
                    soundOverrides.set(rule.rule_id, NotificationSetting.AllMessages);
                }
            }
        });

        this.rules.room.forEach(rule => {
            if (rule.enabled && rule.rule_id[0] === "!" && rule.actions.length < 1) {
                notifyOverrides.set(rule.rule_id, NotificationSetting.MentionsKeywordsOnly);
                if (rule.actions.some(action => actionIsTweakOfKind(action, TweakKind.Sound))) {
                    soundOverrides.set(rule.rule_id, NotificationSetting.AllMessages);
                }
            }
        });

        this.rules.override.forEach(rule => {
            if (rule.enabled && rule.rule_id[0] === "!" && ruleHasCondition(rule, {
                kind: ConditionKind.EventMatch,
                pattern: rule.rule_id,
                key: "room_id",
            }) && rule.actions.length < 1) {
                notifyOverrides.set(rule.rule_id, NotificationSetting.Never);
            }
        });

        return [notifyOverrides, soundOverrides];
    }

    public async addKeywordRule(cli: MatrixClient, keyword: string, enabled: boolean, loud: boolean) {
        const actions = getKeywordActions(loud);

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
        const actions = getKeywordActions(loud);
        const rules = this.getKeywordRules();
        return Promise.all(rules.map(async (rule) => updatePushRule(cli, rule, enabled, actions)));
    }

    public async setSoundTweakInRule(cli: MatrixClient, rule: PushRule, loud: boolean, sound?: string) {
        const actions = rule.actions.filter(a => (<Tweak>a).set_tweak !== TweakKind.Sound);
        if (loud) {
            actions.push(soundTweak(sound));
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

    public hasEnabledRuleWithTweak(ruleId: string, tweakType: TweakKind) {
        if (!this.has(ruleId)) return false;
        const rule = this.get(ruleId);
        return rule.enabled && rule.actions.some(a => (<Tweak>a).set_tweak === tweakType);
    }

    public getKeywordRules(): IPushRuleWithPattern[] {
        return this.rules.content.filter(r => !r.rule_id.startsWith("."));
    }

    private calculateKeywordRulesEnabled(): boolean {
        const keywordRules = this.getKeywordRules();
        // if there are no keyword rules, say they are enabled eagerly
        return keywordRules.length < 1 || keywordRules.some(rule => {
            return rule.enabled && rule.actions.includes(Action.Notify);
        });
    }

    public getRoomNotifyOverride(roomId: string): RoomNotificationSetting | undefined {
        return this.roomNotifyOverrides.get(roomId);
    }

    public getRoomSoundOverride(roomId: string): RoomNotificationSetting | undefined {
        return this.roomSoundOverrides.get(roomId);
    }

    public getOverridenRooms(): string[] {
        return Array.from(new Set([
            ...this.roomNotifyOverrides.keys(),
            ...this.roomSoundOverrides.keys(),
        ]));
    }

    public get(key: string): PushRule | undefined {
        return this.ruleMap.get(key);
    }

    public has(key: string): boolean {
        return this.ruleMap.has(key);
    }
}

window.mxNotificationSettingStore = NotificationSettingStore.instance;
