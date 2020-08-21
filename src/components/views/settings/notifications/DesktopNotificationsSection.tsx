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
import SettingsStore from "../../../../settings/SettingsStore";
import {SettingLevel} from "../../../../settings/SettingLevel";
import StyledCheckbox from "../../elements/StyledCheckbox";

const NOTIFICATIONS_ENABLED_KEY = "notificationsEnabled";
const NOTIFICATIONS_BODY_ENABLED_KEY = "notificationBodyEnabled";

const onNotificationsEnabledChange = (ev) => {
    // error from this gets shown to the user in a modal
    SettingsStore.setValue(NOTIFICATIONS_ENABLED_KEY, null, SettingLevel.DEVICE, ev.target.checked);
};

const onNotificationsBodyEnabledChange = (ev) => {
    // invert as we show the inverse of the underlying setting
    SettingsStore.setValue(NOTIFICATIONS_BODY_ENABLED_KEY, null, SettingLevel.DEVICE, !ev.target.checked);
};

const DesktopNotificationsSection: React.FC = () => {
    const desktopNotificationsEnabled = useSettingValue(NOTIFICATIONS_ENABLED_KEY);
    const notificationsBodyEnabled = useSettingValue(NOTIFICATIONS_BODY_ENABLED_KEY);

    // TODO confirm with design that NOTIFICATIONS_BODY_ENABLED_KEY should be disabled when notifications are
    return <SettingsSection
        title={_t("Desktop notifications")}
        className="mx_NotificationsTab_desktopNotificationsSection"
    >
        <StyledCheckbox
            checked={desktopNotificationsEnabled}
            onChange={onNotificationsEnabledChange}
        >
            {_t("Enable desktop notifications")}
        </StyledCheckbox>
        <StyledCheckbox
            checked={!notificationsBodyEnabled}
            onChange={onNotificationsBodyEnabledChange}
            disabled={!desktopNotificationsEnabled}
        >
            {_t("Hide message contents")}
        </StyledCheckbox>
    </SettingsSection>;
};

export default DesktopNotificationsSection;
