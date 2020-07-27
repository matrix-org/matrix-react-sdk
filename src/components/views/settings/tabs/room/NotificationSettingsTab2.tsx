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

import React, { useState } from "react";

import {_t} from "../../../../../languageHandler";
import AccessibleButton from "../../../elements/AccessibleButton";
import SettingsSection from "../../SettingsSection";
import defaultDispatcher from "../../../../../dispatcher/dispatcher";
import {OpenToTabPayload} from "../../../../../dispatcher/payloads/OpenToTabPayload";
import {Action} from "../../../../../dispatcher/actions";
import {USER_NOTIFICATIONS_TAB} from "../../../dialogs/UserSettingsDialog";
import {compareNotificationSettings as compareSettings, NotificationSetting} from "../../../../../notifications/types";
import AlwaysShowBadgeCountsOption from "../../notifications/AlwaysShowBadgeCountsOption";
import StyledRadioGroup from "../../../elements/StyledRadioGroup";
import CustomSoundSection from "../../notifications/CustomSoundsSection";

interface IProps {
    roomId: string;
}

const goToNotificationSettings = () => {
    defaultDispatcher.dispatch<OpenToTabPayload>({
        action: Action.ViewUserSettings,
        initialTabId: USER_NOTIFICATIONS_TAB,
    });
};

const NotificationSettingsTab2: React.FC<IProps> = ({roomId}) => {
    const defaultSetting = NotificationSetting.MentionsKeywordsOnly; // TODO
    const [notifyMeOn, setNotifyMeOn] = useState<NotificationSetting>(null);

    const onNotifyMeWithChange = value => {
        setNotifyMeOn(value);
        // TODO update push rules
    };

    const playSoundFor = NotificationSetting.MentionsKeywordsOnly;
    const onPlaySoundForChange = () => {};

    const defaultTag = ` (${_t("Default")})`;

    let description;
    if (defaultSetting === NotificationSetting.Never) {
        description = <div className="mx_SettingsTab_errorText mx_SettingsTab_errorTextIcon">
            {_t("Account notifications are set to “Never” and settings below will not apply.")}
        </div>;
    } else {
        description = <div className="mx_SettingsTab_subsectionText">
            {_t("Manage notifications...")}
        </div>;
    }

    return <div className="mx_SettingsTab mx_NotificationsTab">
        <div className="mx_SettingsTab_heading">{_t("Notifications")}</div>
        {description}

        <SettingsSection title={_t("Notify me on")} className="mx_NotificationsTab_roomNotifyMeOn">
            <StyledRadioGroup
                name="notifyMeOn"
                value={notifyMeOn}
                onChange={onNotifyMeWithChange}
                definitions={[
                    {
                        value: NotificationSetting.AllMessages,
                        label: <React.Fragment>
                            {_t("All messages")}
                            {defaultSetting === NotificationSetting.AllMessages ? defaultTag : undefined}
                        </React.Fragment>,
                    }, {
                        value: NotificationSetting.MentionsKeywordsOnly,
                        label: <React.Fragment>
                            {_t("Mentions & keywords only")}
                            {defaultSetting === NotificationSetting.MentionsKeywordsOnly ? defaultTag : undefined}
                        </React.Fragment>,
                        description: (
                            <div className="mx_Checkbox_microCopy">
                                {_t("Manage keywords in <a>Account Settings</a>", {}, {
                                    a: sub => <AccessibleButton kind="link" onClick={goToNotificationSettings}>
                                        {sub}
                                    </AccessibleButton>,
                                })}
                            </div>
                        ),
                    }, {
                        value: NotificationSetting.Never,
                        label: <React.Fragment>
                            {_t("Never")}
                            {defaultSetting === NotificationSetting.Never ? defaultTag : undefined}
                        </React.Fragment>,
                    },
                ]}
            />
        </SettingsSection>

        <SettingsSection title={_t("Appearance & Sounds")}>
            <AlwaysShowBadgeCountsOption roomId={roomId} />

            <br />
            <br />

            <StyledRadioGroup
                name="playSoundFor"
                value={playSoundFor}
                onChange={onPlaySoundForChange}
                definitions={[
                    {
                        value: NotificationSetting.AllMessages,
                        label: _t("Play a sound for all messages"),
                        disabled: compareSettings(notifyMeOn, NotificationSetting.AllMessages) < 0,
                    }, {
                        value: NotificationSetting.MentionsKeywordsOnly,
                        label: _t("Play a sound for mentions & keywords"),
                        disabled: compareSettings(notifyMeOn, NotificationSetting.MentionsKeywordsOnly) < 0,
                    }, {
                        value: NotificationSetting.Never,
                        label: _t("Never play a sound"),
                    },
                ]}
            />
        </SettingsSection>

        <CustomSoundSection roomId={roomId} />
    </div>;
};

export default NotificationSettingsTab2;
