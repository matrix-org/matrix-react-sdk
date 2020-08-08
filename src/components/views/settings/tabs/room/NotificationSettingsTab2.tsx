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

import React, { useContext, useState } from "react";
import MatrixClient from "matrix-js-sdk/src/client";

import {_t} from "../../../../../languageHandler";
import AccessibleButton from "../../../elements/AccessibleButton";
import SettingsSection from "../../SettingsSection";
import defaultDispatcher from "../../../../../dispatcher/dispatcher";
import {OpenToTabPayload} from "../../../../../dispatcher/payloads/OpenToTabPayload";
import {Action} from "../../../../../dispatcher/actions";
import {USER_NOTIFICATIONS_TAB} from "../../../dialogs/UserSettingsDialog";
import {NotificationSetting, roundRoomNotificationSetting} from "../../../../../notifications/types";
import AlwaysShowBadgeCountsOption from "../../notifications/AlwaysShowBadgeCountsOption";
import StyledRadioGroup from "../../../elements/StyledRadioGroup";
import CustomSoundSection from "../../notifications/CustomSoundsSection";
import {
    EVENT_NOTIFY_ME_WITH_CHANGED,
    EVENT_PLAY_SOUND_FOR_CHANGED,
    NotificationLevelStore,
} from "../../../../../stores/notifications/NotificationLevelStore";
import {useEventEmitter} from "../../../../../hooks/useEventEmitter";
import MatrixClientContext from "../../../../../contexts/MatrixClientContext";
import {labelForSetting, possibleRoomSoundOptions} from "../../../../../notifications/NotificationUtils2";

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
    const cli = useContext<MatrixClient>(MatrixClientContext);

    const pushRules = NotificationLevelStore.instance;
    const [accountNotifyMeWith, setAccountNotifyMeWith] = useState<NotificationSetting>(pushRules.notifyMeWith);
    useEventEmitter(pushRules, EVENT_NOTIFY_ME_WITH_CHANGED, setAccountNotifyMeWith);
    const roundedNotifyMeWith = roundRoomNotificationSetting(roomId, accountNotifyMeWith);

    const [accountPlaySoundFor, setAccountPlaySoundFor] = useState<NotificationSetting>(pushRules.playSoundFor);
    useEventEmitter(pushRules, EVENT_PLAY_SOUND_FOR_CHANGED, setAccountPlaySoundFor);
    const roundedPlaySoundFor = roundRoomNotificationSetting(roomId, accountPlaySoundFor);

    const [notifyMeWith, setNotifyMeWith] = useState(pushRules.getRoomNotifyOverride(roomId) || roundedNotifyMeWith);
    const [playSoundFor, setPlaySoundFor] = useState(pushRules.getRoomSoundOverride(roomId) || roundedPlaySoundFor);

    const onNotifyMeWithChange = value => {
        setNotifyMeOn(value);
        // TODO update push rules
    };

    const onPlaySoundForChange = () => {};

    const defaultTag = ` (${_t("Default")})`;

    let description;
    if (accountNotifyMeWith === NotificationSetting.Never) {
        description = <div className="mx_SettingsTab_errorText mx_SettingsTab_errorTextIcon">
            {_t("Account notifications are set to “Never” and settings below will not apply.")}
        </div>;
    }

    const soundOptions = possibleRoomSoundOptions(roomId, roundedPlaySoundFor);

    return <div className="mx_SettingsTab mx_NotificationsTab">
        <div className="mx_SettingsTab_heading">{_t("Notifications")}</div>
        {description}

        <SettingsSection title={_t("Notify me on")} className="mx_NotificationsTab_roomNotifyMeOn">
            <StyledRadioGroup
                name="notifyMeWith"
                value={notifyMeWith}
                onChange={onNotifyMeWithChange}
                definitions={[
                    {
                        value: NotificationSetting.AllMessages,
                        label: <React.Fragment>
                            {labelForSetting(NotificationSetting.AllMessages)}
                            {roundedNotifyMeWith === NotificationSetting.AllMessages ? defaultTag : undefined}
                        </React.Fragment>,
                    }, {
                        value: NotificationSetting.MentionsKeywordsOnly,
                        label: <React.Fragment>
                            {labelForSetting(NotificationSetting.MentionsKeywordsOnly)}
                            {roundedNotifyMeWith === NotificationSetting.MentionsKeywordsOnly ? defaultTag : undefined}
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
                            {labelForSetting(NotificationSetting.Never)}
                            {roundedNotifyMeWith === NotificationSetting.Never ? defaultTag : undefined}
                        </React.Fragment>,
                    },
                ]}
            />
        </SettingsSection>

        <SettingsSection title={_t("Play a sound for")}>
            <StyledRadioGroup
                name="playSoundFor"
                value={playSoundFor}
                onChange={onPlaySoundForChange}
                definitions={soundOptions.map(value => ({
                    value,
                    label: <React.Fragment>
                        {labelForSetting(value)}
                        {roundedPlaySoundFor === value ? defaultTag : undefined}
                    </React.Fragment>,
                }))}
            />
        </SettingsSection>

        <SettingsSection title={_t("Appearance")}>
            <AlwaysShowBadgeCountsOption roomId={roomId} />
        </SettingsSection>

        <CustomSoundSection roomId={roomId} />
    </div>;
};

export default NotificationSettingsTab2;
