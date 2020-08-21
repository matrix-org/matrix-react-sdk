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

import React from "react";

import {_t} from "../../../../languageHandler";
import {useSettingValue} from "../../../../hooks/useSettings";
import SettingsStore from "../../../../settings/SettingsStore";
import {SettingLevel} from "../../../../settings/SettingLevel";
import StyledCheckbox from "../../elements/StyledCheckbox";
import NotificationBadge from "../../rooms/NotificationBadge";
import {NotificationColor} from "../../../../stores/notifications/NotificationColor";
import {StaticNotificationState} from "../../../../stores/notifications/StaticNotificationState";

interface IProps {
    roomId?: string;
}

const ALWAYS_SHOW_BADGE_COUNTS_KEY = "Notifications.alwaysShowBadgeCounts";

const onAlwaysShowBadgeCountsChange = ev => {
    SettingsStore.setValue(ALWAYS_SHOW_BADGE_COUNTS_KEY, null, SettingLevel.ACCOUNT, ev.target.checked);
};

const exampleNotificationBadgeState = StaticNotificationState.forCount(2, NotificationColor.Grey);

const AlwaysShowBadgeCountsOption: React.FC<IProps> = ({roomId}) => {
    // TODO local echo
    const alwaysShowBadgeCounts = useSettingValue(ALWAYS_SHOW_BADGE_COUNTS_KEY, roomId);

    let copy;
    if (roomId) {
        copy = _t("Show number of messages in this room");
    } else {
        copy = _t("Show number of messages in all rooms");
    }

    let badgePreview;
    if (alwaysShowBadgeCounts) {
        badgePreview = <React.Fragment>
            (<NotificationBadge notification={exampleNotificationBadgeState} forceCount={true} />)
        </React.Fragment>;
    }

    return <React.Fragment>
        <StyledCheckbox checked={alwaysShowBadgeCounts} onChange={onAlwaysShowBadgeCountsChange}>
            {copy} {badgePreview}
        </StyledCheckbox>
        <div className="mx_Checkbox_microCopy">
            {_t("Riot always displays the number of missed Direct Messages, mentions & keywords")}
        </div>
    </React.Fragment>;
};

export default AlwaysShowBadgeCountsOption;
