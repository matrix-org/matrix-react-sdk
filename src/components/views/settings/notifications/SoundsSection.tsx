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
import SettingsStore from "../../../../settings/SettingsStore";
import {SettingLevel} from "../../../../settings/SettingLevel";
import {compareNotificationSettings as compareSettings, NotificationSetting} from "../../../../notifications/types";
import StyledRadioGroup from "../../elements/StyledRadioGroup";
import StyledCheckbox from "../../elements/StyledCheckbox";
import {useSettingValue} from "../../../../hooks/useSettings";
import {labelForSetting} from "../../../../notifications/NotificationUtils2";

interface IProps {
    notifyMeWith: NotificationSetting;
    playSoundFor: NotificationSetting;
    onChange(playSoundFor: NotificationSetting);
}

const AUDIBLE_NOTIFICATIONS_ENABLED_KEY = "audioNotificationsEnabled";

const onMuteAudioForThisSessionChange = ev => {
    SettingsStore.setValue(AUDIBLE_NOTIFICATIONS_ENABLED_KEY, null, SettingLevel.DEVICE, !ev.target.checked);
};

const SoundsSection: React.FC<IProps> = ({notifyMeWith, playSoundFor, onChange}) => {
    // TODO local echo
    const muteAudio = !useSettingValue(AUDIBLE_NOTIFICATIONS_ENABLED_KEY);

    return <SettingsSection title={_t("Play a sound for")} className="mx_NotificationsTab_sounds">
        <StyledRadioGroup
            name="playSoundFor"
            value={playSoundFor}
            onChange={onChange}
            definitions={[
                {
                    value: NotificationSetting.AllMessages,
                    label: labelForSetting(NotificationSetting.AllMessages),
                    disabled: compareSettings(notifyMeWith, NotificationSetting.AllMessages) < 0,
                }, {
                    value: NotificationSetting.DirectMessagesMentionsKeywords,
                    label: labelForSetting(NotificationSetting.DirectMessagesMentionsKeywords),
                    disabled: compareSettings(notifyMeWith, NotificationSetting.DirectMessagesMentionsKeywords) < 0,
                }, {
                    value: NotificationSetting.MentionsKeywordsOnly,
                    label: labelForSetting(NotificationSetting.MentionsKeywordsOnly),
                    disabled: compareSettings(notifyMeWith, NotificationSetting.MentionsKeywordsOnly) < 0,
                }, {
                    value: NotificationSetting.Never,
                    label: labelForSetting(NotificationSetting.Never),
                },
            ]}
        />

        <br />

        <StyledCheckbox checked={muteAudio} onChange={onMuteAudioForThisSessionChange}>
            {_t("Mute audio for this session")}
        </StyledCheckbox>
    </SettingsSection>;
};

export default SoundsSection;
