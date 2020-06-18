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

import SettingsSection from "../SettingsSection";
import {_t} from "../../../../languageHandler";
import {useSettingValue} from "../../../../hooks/useSettings";
import SettingsStore, {SettingLevel} from "../../../../settings/SettingsStore";
import StyledCheckbox from "../../elements/StyledCheckbox";

const ALWAYS_SHOW_BADGE_COUNTS_KEY = "Notifications.alwaysShowBadgeCounts";

const onAlwaysShowBadgeCountsChange = ev => {
    SettingsStore.setValue(ALWAYS_SHOW_BADGE_COUNTS_KEY, null, SettingLevel.ACCOUNT, ev.target.checked);
};

const AppearanceSoundsSection: React.FC = () => {
    const alwaysShowBadgeCounts = useSettingValue(ALWAYS_SHOW_BADGE_COUNTS_KEY);

    let badgePreview;
    if (alwaysShowBadgeCounts) {
        badgePreview = <React.Fragment>
            (<div className="mx_NotificationBadge mx_NotificationBadge_visible mx_NotificationBadge_2char">
            <span className="mx_NotificationBadge_count">2</span>
        </div>)
        </React.Fragment>;
    }

    return <SettingsSection title={_t("Appearance & Sounds")} className="mx_NotificationsTab_appearanceAndSounds">
        <StyledCheckbox checked={alwaysShowBadgeCounts} onChange={onAlwaysShowBadgeCountsChange}>
            {_t("Show number of messages in all rooms")} {badgePreview}
        </StyledCheckbox>
        <div className="mx_Checkbox_microCopy">
            {_t("Riot always displays the number of missed Direct Messages, mentions & keywords")}
        </div>

        <br />
        <br />

        <StyledCheckbox>
            {_t("Play a sound for all messages")}
        </StyledCheckbox>
        <StyledCheckbox>
            {_t("Play a sound for mentions")}
        </StyledCheckbox>
    </SettingsSection>;
};

export default AppearanceSoundsSection;
