/*
Copyright 2023 The Matrix.org Foundation C.I.C.

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

import { IAnnotatedPushRule, PushRuleKind, RuleId } from "matrix-js-sdk/src/matrix";

import { getHighlightReasonMessage } from "../../../src/utils/event/highlight";
import { getDefaultAnnotatedRule, makeAnnotatedPushRule } from "../../test-utils/pushRules";

describe("getHighlightReasonMessage()", () => {
    const containsUserName = makeAnnotatedPushRule(PushRuleKind.ContentSpecific, RuleId.ContainsUserName, {
        pattern: "ernie@sesame.st",
    });
    const keyword = makeAnnotatedPushRule(PushRuleKind.ContentSpecific, "banana-rule", { pattern: "banana" });
    const containsDisplayName = getDefaultAnnotatedRule(RuleId.ContainsDisplayName);
    const roomMention = getDefaultAnnotatedRule(RuleId.IsRoomMention);
    const atRoomNotif = getDefaultAnnotatedRule(RuleId.AtRoomNotification);
    const userMention = getDefaultAnnotatedRule(RuleId.IsUserMention);
    const irrelevantRule = makeAnnotatedPushRule(PushRuleKind.Override, "something-else");

    type TestCase = [string, IAnnotatedPushRule, string];

    it.each<TestCase>([
        ["rule is not relevant", irrelevantRule, ""],
        [`rule is ${containsUserName.rule_id}`, containsUserName, "Your username was mentioned."],
        [`rule is ${containsDisplayName.rule_id}`, containsDisplayName, "Your display name was mentioned."],
        [`rule is ${atRoomNotif.rule_id}`, atRoomNotif, "This message mentions the room."],
        [`rule is ${roomMention.rule_id}`, roomMention, "This message mentions the room."],
        [`rule is an explicit mention`, userMention, "You were explicitly mentioned."],
        [`rule is a keyword`, keyword, "Your keyword 'banana' was mentioned."],
    ])("returns correct message when %s", (_description, rule, expectedResult) => {
        expect(getHighlightReasonMessage(rule)).toEqual(expectedResult);
    });
});
