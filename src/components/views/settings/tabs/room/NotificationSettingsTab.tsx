/*
Copyright 2019 - 2021 The Matrix.org Foundation C.I.C.

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

import {_t} from "../../../../../languageHandler";
import AccessibleButton, {ButtonEvent} from "../../../elements/AccessibleButton";
import Notifier from "../../../../../Notifier";
import {RoomEchoChamber} from "../../../../../stores/local-echo/RoomEchoChamber";
import {EchoChamber} from "../../../../../stores/local-echo/EchoChamber";
import MatrixClientContext from "../../../../../contexts/MatrixClientContext";
import StyledRadioGroup from "../../../elements/StyledRadioGroup";
import {RoomNotifState} from "../../../../../RoomNotifs";
import defaultDispatcher from "../../../../../dispatcher/dispatcher";
import {Action} from "../../../../../dispatcher/actions";
import {UserTab} from "../../../dialogs/UserTab";
import NotificationSound from "../../NotificationSound";
import {SettingLevel} from "../../../../../settings/SettingLevel";

interface IProps {
    roomId: string;
    closeSettingsFn(): void;
}

interface IState {
    notificationSettingLevel: SettingLevel;
    currentSound: string;
    uploadedFile: File | null;
}

export default class NotificationsSettingsTab extends React.Component<IProps, IState> {
    private readonly roomProps: RoomEchoChamber;

    public static contextType = MatrixClientContext;
    public context!: React.ContextType<typeof MatrixClientContext>;

    public constructor(props: IProps, context: React.ContextType<typeof MatrixClientContext>) {
        super(props, context);

        this.roomProps = EchoChamber.forRoom(context.getRoom(this.props.roomId));

        let currentSound = "default";
        const soundData = Notifier.getNotificationSound(this.props.roomId);
        if (soundData) {
            currentSound = soundData.name || soundData.url;
        }

        this.state = {
            notificationSettingLevel: SettingLevel.ROOM_ACCOUNT,
            currentSound: currentSound,
            uploadedFile: null,
        };
    }

    private onRoomNotificationChange = (value: RoomNotifState): void => {
        this.roomProps.notificationVolume = value;
        this.forceUpdate();
    };

    private onOpenSettingsClick = (event: ButtonEvent): void => {
        // avoid selecting the radio button
        event.preventDefault();
        this.props.closeSettingsFn();
        defaultDispatcher.dispatch({
            action: Action.ViewUserSettings,
            initialTabId: UserTab.Notifications,
        });
    };

    public render(): React.ReactNode {
        return (
            <div className="mx_SettingsTab">
                <div className="mx_SettingsTab_heading">{_t("Notifications")}</div>

                <div className="mx_SettingsTab_section mx_NotificationSettingsTab_notificationsSection">
                    <StyledRadioGroup
                        name="roomNotificationSetting"
                        definitions={[
                            {
                                value: RoomNotifState.AllMessages,
                                className: "mx_NotificationSettingsTab_defaultEntry",
                                label: (
                                    <>
                                        {_t("Default")}
                                        <div className="mx_NotificationSettingsTab_microCopy">
                                            {_t(
                                                "Get notifications as set up in your <a>settings</a>",
                                                {},
                                                {
                                                    a: (sub) => (
                                                        <AccessibleButton
                                                            kind="link_inline"
                                                            onClick={this.onOpenSettingsClick}
                                                        >
                                                            {sub}
                                                        </AccessibleButton>
                                                    ),
                                                },
                                            )}
                                        </div>
                                    </>
                                ),
                            },
                            {
                                value: RoomNotifState.AllMessagesLoud,
                                className: "mx_NotificationSettingsTab_allMessagesEntry",
                                label: (
                                    <>
                                        {_t("All messages")}
                                        <div className="mx_NotificationSettingsTab_microCopy">
                                            {_t("Get notified for every message")}
                                        </div>
                                    </>
                                ),
                            },
                            {
                                value: RoomNotifState.MentionsOnly,
                                className: "mx_NotificationSettingsTab_mentionsKeywordsEntry",
                                label: (
                                    <>
                                        {_t("@mentions & keywords")}
                                        <div className="mx_NotificationSettingsTab_microCopy">
                                            {_t(
                                                "Get notified only with mentions and keywords " +
                                                "as set up in your <a>settings</a>",
                                                {},
                                                {
                                                    a: (sub) => (
                                                        <AccessibleButton
                                                            kind="link_inline"
                                                            onClick={this.onOpenSettingsClick}
                                                        >
                                                            {sub}
                                                        </AccessibleButton>
                                                    ),
                                                },
                                            )}
                                        </div>
                                    </>
                                ),
                            },
                            {
                                value: RoomNotifState.Mute,
                                className: "mx_NotificationSettingsTab_noneEntry",
                                label: (
                                    <>
                                        {_t("Off")}
                                        <div className="mx_NotificationSettingsTab_microCopy">
                                            {_t("You won't get any notifications")}
                                        </div>
                                    </>
                                ),
                            },
                        ]}
                        onChange={this.onRoomNotificationChange}
                        value={this.roomProps.notificationVolume}
                    />
                </div>

                <NotificationSound currentSound={this.state.currentSound}
                                   level={this.state.notificationSettingLevel}
                                   // onFileUpload={this.onFileUpload}
                />
            </div>
        );
    }
}
