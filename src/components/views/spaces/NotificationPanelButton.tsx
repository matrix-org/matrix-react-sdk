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

import React from "react";

import { _t } from "../../../languageHandler";
import TooltipTarget from "../elements/TooltipTarget";
import { Alignment } from "../elements/Tooltip";
import RightPanelStore from "../../../stores/right-panel/RightPanelStore";
import { RightPanelPhases } from "../../../stores/right-panel/RightPanelStorePhases";
import { UnreadIndicator } from "../right_panel/LegacyRoomHeaderButtons";
import { NotificationColor } from "../../../stores/notifications/NotificationColor";
import { useGlobalNotificationState } from "../../../hooks/useGlobalNotification";
import { Icon as NotificationIcon } from "../../../../res/img/element-icons/notifications.svg";

export const NotificationPanelButton: React.FC = () => {
    const summarizedNotificationState = useGlobalNotificationState();
    return (
        <TooltipTarget label={_t("Notifications")} alignment={Alignment.Right}>
            <div
                className="mx_SpacePanel_button"
                title={_t("Notifications")}
                onClick={() => {
                    RightPanelStore.instance.setCard({ phase: RightPanelPhases.NotificationPanel });
                }}
                role="button"
                aria-label={_t("Notifications")}
            >
                <NotificationIcon />
                {summarizedNotificationState.color === NotificationColor.Red ? (
                    <UnreadIndicator color={summarizedNotificationState.color} />
                ) : null}
            </div>
        </TooltipTarget>
    );
};
