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

import React, {useContext, useState} from "react";
import MatrixClient from "matrix-js-sdk/src/client";

import MatrixClientContext from "../../../../../contexts/MatrixClientContext";
import {_t} from "../../../../../languageHandler";
import SettingsSection from "../../SettingsSection";
import DesktopNotificationsSection from "../../notifications/DesktopNotificationsSection";
import EmailNotificationsSection from "../../notifications/EmailNotificationsSection";
import AppearanceSoundsSection from "../../notifications/AppearanceSoundsSection";
import MentionsKeywordsSection from "../../notifications/MentionsKeywordsSection";
import {compareNotificationSettings, NotificationSetting} from "../../../../../notifications/types";
import RoomOverridesSection from "../../notifications/RoomOverridesSection";
import StyledRadioGroup from "../../../elements/StyledRadioGroup";
import {writeNotifyMeWith} from "../../../../../notifications/NotificationUtils";
import {useEventEmitter} from "../../../../../hooks/useEventEmitter";
import {
    NotificationSettingStore,
    EVENT_NOTIFY_ME_WITH_CHANGED,
    EVENT_PLAY_SOUND_FOR_CHANGED,
    EVENT_KEYWORDS_CHANGED,
} from "../../../../../stores/notifications/NotificationSettingStore";

const NotificationUserSettingsTab2: React.FC = () => {
    const cli = useContext<MatrixClient>(MatrixClientContext);

    const pushRules = NotificationSettingStore.instance;
    const [notifyMeWith, setNotifyMeWith] = useState<NotificationSetting>(pushRules.notifyMeWith);
    useEventEmitter(pushRules, EVENT_NOTIFY_ME_WITH_CHANGED, setNotifyMeWith);

    const [playSoundFor, setPlaySoundFor] = useState<NotificationSetting>(pushRules.playSoundFor);
    useEventEmitter(pushRules, EVENT_PLAY_SOUND_FOR_CHANGED, setPlaySoundFor);

    const [keywordsEnabled, setKeywordsEnabled] = useState(pushRules.keywordsEnabled);
    useEventEmitter(pushRules, EVENT_KEYWORDS_CHANGED, setKeywordsEnabled);

    const onNotifyMeWithChange = (value: NotificationSetting) => {
        setNotifyMeWith(value); // local echo

        writeNotifyMeWith(cli, value).catch(e => {
            console.log(e); // TODO error handling
        });
    };

    const onPlaySoundForChange = (value: NotificationSetting) => {
        setPlaySoundFor(value); // local echo

        const soundEnabled = compareNotificationSettings(value, NotificationSetting.Never) > 0;
        pushRules.updateSoundRules(cli, value).catch(e => {
            console.log(e); // TODO error handling
        });
        pushRules.updateKeywordRules(cli, keywordsEnabled, soundEnabled).catch(e => {
            console.log(e); // TODO error handling
        });
    };

    const mentionsKeywordsSectionDisabled = notifyMeWith === NotificationSetting.Never;

    return <div className="mx_SettingsTab mx_NotificationsTab">
        <div className="mx_SettingsTab_heading">{_t("Notifications")}</div>
        <div className="mx_SettingsTab_subsectionText">
            {_t("Manage notifications across all rooms...")}
        </div>

        <SettingsSection title={_t("Notify me with")}>
            <StyledRadioGroup
                name="notifyMeWith"
                value={notifyMeWith}
                onChange={onNotifyMeWithChange}
                definitions={[
                    {
                        value: NotificationSetting.AllMessages,
                        label: _t("All messages"),
                    }, {
                        value: NotificationSetting.DirectMessagesMentionsKeywords,
                        label: _t("Direct messages, mentions & keywords"),
                    }, {
                        value: NotificationSetting.MentionsKeywordsOnly,
                        label: _t("Mentions & keywords only"),
                    }, {
                        value: NotificationSetting.Never,
                        label: _t("Never"),
                    },
                ]}
            />
        </SettingsSection>

        <AppearanceSoundsSection
            notifyMeWith={notifyMeWith}
            playSoundFor={playSoundFor}
            onChange={onPlaySoundForChange}
        />

        <MentionsKeywordsSection
            disabled={mentionsKeywordsSectionDisabled}
            keywordsEnabled={keywordsEnabled}
            setKeywordsEnabled={setKeywordsEnabled}
            soundEnabled={compareNotificationSettings(playSoundFor, NotificationSetting.Never) > 0}
        />

        <RoomOverridesSection notifyMeWith={notifyMeWith} />

        <DesktopNotificationsSection />

        <EmailNotificationsSection />
    </div>;
};

export default NotificationUserSettingsTab2;
