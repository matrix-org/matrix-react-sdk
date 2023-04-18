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

import { MatrixClient } from "matrix-js-sdk/src/client";
import { IAnnotatedPushRule, MatrixEvent, PushRuleKind, RuleId } from "matrix-js-sdk/src/matrix";

import { TimelineRenderingType } from "../../contexts/RoomContext";
import { _t } from "../../languageHandler";

/**
 * Determine whether an event should be highlighted
 * For edited events, if a previous version of the event was highlighted
 * the event should remain highlighted as the user may have been notified
 * @returns {boolean}
 */
export const shouldHighlightEvent = (
    event: MatrixEvent,
    client: MatrixClient,
    timelineRenderingType: TimelineRenderingType,
): boolean => {
    return getEventHighlightInfo(event, client, timelineRenderingType).isHighlighted;
};

/**
 * Determine whether an event should be highlighted and why
 * For edited events, if a previous version of the event was highlighted
 * the event should remain highlighted as the user may have been notified
 * @returns {boolean} isHighlighted
 * @returns {boolean} isBecausePreviousEvent - true when a pervious version of the event triggered a highlight
 *                      but the current replaced event does not
 * @returns {IAnnotatedPushRule} rule - the rule that triggered the highlight

 */
export const getEventHighlightInfo = (
    event: MatrixEvent,
    client: MatrixClient,
    timelineRenderingType: TimelineRenderingType,
): {
    isHighlighted: boolean;
    isBecausePreviousEvent?: boolean;
    rule?: IAnnotatedPushRule;
} => {
    if (timelineRenderingType === TimelineRenderingType.Notification) return { isHighlighted: false };
    if (timelineRenderingType === TimelineRenderingType.ThreadsList) return { isHighlighted: false };

    // don't show self-highlights from another of our clients
    if (event.getSender() === client.getSafeUserId()) {
        return { isHighlighted: false };
    }

    const pushDetails = client.getPushDetailsForEvent(event.replacingEvent() || event);
    // get the actions for the previous version of the event too if it is an edit
    const previousPushDetails = event.replacingEvent() ? client.getPushDetailsForEvent(event) : null;

    if (!pushDetails?.actions?.tweaks && !previousPushDetails?.actions?.tweaks) {
        return { isHighlighted: false };
    }

    // current version of the event triggered a highlight
    if (pushDetails?.actions?.tweaks?.highlight) {
        return {
            isHighlighted: true,
            rule: pushDetails.rule,
        };
    }

    // previous version of the event triggered a highlight
    if (previousPushDetails?.actions?.tweaks.highlight) {
        return {
            isHighlighted: true,
            rule: previousPushDetails.rule,
            isBecausePreviousEvent: true,
        };
    }

    return { isHighlighted: false };
};

export const getHighlightReasonMessage = (rule: IAnnotatedPushRule): string => {
    if (rule.rule_id === RuleId.ContainsUserName) {
        return _t("Your username was mentioned.");
    }
    if (rule.rule_id === RuleId.ContainsDisplayName) {
        return _t("Your display name was mentioned.");
    }
    if (rule.rule_id === RuleId.AtRoomNotification || rule.rule_id === RuleId.IsRoomMention) {
        return _t("This message mentions the room.");
    }
    if (rule.rule_id === RuleId.IsUserMention) {
        return _t("You were explicitly mentioned.");
    }
    if (rule.kind === PushRuleKind.ContentSpecific) {
        return _t(`Your keyword '%(keyword)s' was mentioned.`, { keyword: rule.pattern! });
    }
    return "";
};
