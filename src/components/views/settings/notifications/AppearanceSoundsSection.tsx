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

import React, {useState} from "react";

import SettingsSection from "../SettingsSection";
import {_t} from "../../../../languageHandler";
import {compareNotificationSettings as compareSettings, NotificationSettings} from "../../../../notifications/types";
import AlwaysShowBadgeCountsOption from "./AlwaysShowBadgeCountsOption";
import StyledRadioGroup from "../../elements/StyledRadioGroup";

interface IProps {
    notifyMeWith: NotificationSettings;
}

const AppearanceSoundsSection: React.FC<IProps> = ({notifyMeWith}) => {
    // TODO wire up playSoundFor
    const [playSoundFor, setPlaySoundFor] = useState<NotificationSettings>(NotificationSettings.MentionsKeywordsOnly);

    const onPlaySoundForChange = value => {
        setPlaySoundFor(value);
        // TODO update push rules
    };

    return <SettingsSection title={_t("Appearance & Sounds")} className="mx_NotificationsTab_appearanceAndSounds">
        <AlwaysShowBadgeCountsOption />

        <br />
        <br />

        <StyledRadioGroup
            name="playSoundFor"
            value={playSoundFor}
            onChange={onPlaySoundForChange}
            definitions={[
                {
                    value: NotificationSettings.AllMessages,
                    label: _t("Play a sound for all messages"),
                    disabled: compareSettings(notifyMeWith, NotificationSettings.AllMessages) < 0,
                }, {
                    value: NotificationSettings.DirectMessagesMentionsKeywords,
                    label: _t("Play a sound for direct messages, mentions & keywords"),
                    disabled: compareSettings(notifyMeWith, NotificationSettings.DirectMessagesMentionsKeywords) < 0,
                }, {
                    value: NotificationSettings.MentionsKeywordsOnly,
                    label: _t("Play a sound for mentions & keywords"),
                    disabled: compareSettings(notifyMeWith, NotificationSettings.MentionsKeywordsOnly) < 0,
                }, {
                    value: NotificationSettings.Never,
                    label: _t("Never play a sound"),
                },
            ]}
        />
    </SettingsSection>;
};

export default AppearanceSoundsSection;
