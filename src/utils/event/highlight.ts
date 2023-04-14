/*
Copyright 2021 The Matrix.org Foundation C.I.C.

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
import { IAnnotatedPushRule, MatrixEvent } from "matrix-js-sdk/src/matrix";

/**
 * Determine whether an event should be highlighted
 * For edited events, if a previous version of the event was highlighted
 * the event should remain highlighted as the user may have been notified
 * @returns boolean
 */
export const shouldHighlightEvent = (event: MatrixEvent, client: MatrixClient): boolean => {
    return getEventHighlightInfo(event, client).isHighlighted;
}

export const getEventHighlightInfo = (event: MatrixEvent, client: MatrixClient): {
    isHighlighted: boolean; isBecausePreviousEvent?: boolean; rule?: IAnnotatedPushRule;
} => {
    // don't show self-highlights from another of our clients
    if (event.getSender() === client.getSafeUserId()) {
        return { isHighlighted: false };
    }
    
    const pushDetails = client.getPushDetailsForEvent(event.replacingEvent() || event);
    // get the actions for the previous version of the event too if it is an edit
    const previousPushDetails = event.replacingEvent()
        ? client.getPushDetailsForEvent(event)
        : null;

    if (!pushDetails?.actions?.tweaks && !previousPushDetails?.actions?.tweaks) {
        return { isHighlighted: false };
    }

    // current version of the event triggered a highlight
    if (pushDetails?.actions?.tweaks?.highlight) {
        return {
            isHighlighted: true,
            rule: pushDetails.rule,
        }
    }

    // previous version of the event triggered a highlight
    if (previousPushDetails?.actions?.tweaks.highlight) {
        return {
            isHighlighted: true,
            rule: previousPushDetails.rule,
            isBecausePreviousEvent: true
        }
    }

    return { isHighlighted: false };
}