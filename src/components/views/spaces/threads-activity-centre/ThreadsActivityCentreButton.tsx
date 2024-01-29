/*
 *
 * Copyright 2024 The Matrix.org Foundation C.I.C.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 * /
 */

import React, { ComponentProps, forwardRef, HTMLProps, useState } from "react";
import { Icon } from "@vector-im/compound-design-tokens/icons/threads-solid.svg";
import classNames from "classnames";
import { IndicatorIcon } from "@vector-im/compound-web";
import { ClientEvent } from "matrix-js-sdk/src/matrix";

import { _t } from "../../../../languageHandler";
import AccessibleTooltipButton from "../../elements/AccessibleTooltipButton";
import { useEventEmitter } from "../../../../hooks/useEventEmitter";
import { useMatrixClientContext } from "../../../../contexts/MatrixClientContext";
import { useSettingValue } from "../../../../hooks/useSettings";
import { NotificationLevel } from "../../../../stores/notifications/NotificationLevel";
import { VisibilityProvider } from "../../../../stores/room-list/filters/VisibilityProvider";
import { getThreadNotificationLevel, notificationLevelToIndicator } from "../../../../utils/notifications";
import { doesRoomHaveUnreadThreads } from "../../../../Unread";

interface ThreadsActivityCentreButtonProps extends HTMLProps<HTMLDivElement> {
    /**
     * Display the `Treads` label next to the icon.
     */
    displayLabel?: boolean;
}

/**
 * A button to open the thread activity centre.
 */
export const ThreadsActivityCentreButton = forwardRef<HTMLDivElement, ThreadsActivityCentreButtonProps>(
    function ThreadsActivityCentreButton({ displayLabel, ...props }, ref): React.JSX.Element {
        const indicator = useThreadIndicator();

        return (
            <AccessibleTooltipButton
                className={classNames("mx_ThreadsActivityCentreButton", { expanded: displayLabel })}
                title={_t("common|threads")}
                // @ts-ignore
                // ref nightmare...
                ref={ref}
                forceHide={displayLabel}
                aria-expanded={displayLabel}
                {...props}
            >
                <IndicatorIcon className="mx_ThreadsActivityCentreButton_IndicatorIcon" indicator={indicator}>
                    <Icon className="mx_ThreadsActivityCentreButton_Icon" />
                </IndicatorIcon>
                {displayLabel && _t("common|threads")}
            </AccessibleTooltipButton>
        );
    },
);

type Indicator = ComponentProps<typeof IndicatorIcon>["indicator"];

/**
 * Get the indicator of all the unread threads.
 * The indicator is updated when the client syncs.
 * @returns the indicator of the unread threads.
 */
function useThreadIndicator(): Indicator {
    const msc3946ProcessDynamicPredecessor = useSettingValue<boolean>("feature_dynamic_room_predecessors");
    const mxClient = useMatrixClientContext();

    const [indicator, setIndicator] = useState<Indicator>();
    useEventEmitter(mxClient, ClientEvent.Sync, () => {
        // Only count visible rooms to not torment the user with notification counts in rooms they can't see.
        // This will include highlights from the previous version of the room internally
        const visibleRooms = mxClient.getVisibleRooms(msc3946ProcessDynamicPredecessor);

        let greatestNotificationLevel = NotificationLevel.None;
        for (const room of visibleRooms) {
            // We only care about rooms with unread threads
            if (VisibilityProvider.instance.isRoomVisible(room) && doesRoomHaveUnreadThreads(room)) {
                const notificationLevel = getThreadNotificationLevel(room);
                if (notificationLevel > greatestNotificationLevel) {
                    greatestNotificationLevel = notificationLevel;
                }

                // We can't get any higher than this, so stop looking
                if (greatestNotificationLevel === NotificationLevel.Highlight) {
                    break;
                }
            }
        }

        setIndicator(notificationLevelToIndicator(greatestNotificationLevel));
    });

    return indicator;
}
