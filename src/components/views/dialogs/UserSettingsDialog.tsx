/*
Copyright 2019 New Vector Ltd
Copyright 2019 The Matrix.org Foundation C.I.C.

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

import React from 'react';

import TabbedView, { Tab } from "../../structures/TabbedView";
import { _t, _td } from "../../../languageHandler";
import AccountUserSettingsTab from "../settings/tabs/user/AccountUserSettingsTab";
import SettingsStore from "../../../settings/SettingsStore";
import LabsUserSettingsTab from "../settings/tabs/user/LabsUserSettingsTab";
import AppearanceUserSettingsTab from "../settings/tabs/user/AppearanceUserSettingsTab";
import SecureMessagingUserSettingsTab from "../settings/tabs/user/SecureMessagingUserSettingsTab";
import NotificationUserSettingsTab from "../settings/tabs/user/NotificationUserSettingsTab";
import PreferencesUserSettingsTab from "../settings/tabs/user/PreferencesUserSettingsTab";
import VoiceUserSettingsTab from "../settings/tabs/user/VoiceUserSettingsTab";
import HelpUserSettingsTab from "../settings/tabs/user/HelpUserSettingsTab";
import SdkConfig from "../../../SdkConfig";
import { UIFeature } from "../../../settings/UIFeature";
import BaseDialog from "./BaseDialog";
import { IDialogProps } from "./IDialogProps";
import SidebarUserSettingsTab from "../settings/tabs/user/SidebarUserSettingsTab";
import KeyboardUserSettingsTab from "../settings/tabs/user/KeyboardUserSettingsTab";
import PrivacyUserSettingsTab from '../settings/tabs/user/PrivacyUserSettingsTab';
import GeneralUserSettingsTab from '../settings/tabs/user/GeneralUserSettingsTab';
import { UserTab } from "./UserTab";

interface IProps extends IDialogProps {
    initialTabId?: UserTab;
}

interface IState {
}

export default class UserSettingsDialog extends React.Component<IProps, IState> {
    constructor(props) {
        super(props);

        this.state = {
        };
    }

    private getTabs() {
        const tabs = [];

        tabs.push(new Tab(
            UserTab.General,
            _td("General"),
            "mx_UserSettingsDialog_settingsIcon",
            <GeneralUserSettingsTab closeSettingsFn={this.props.onFinished} />,
            "UserSettingsGeneral",
        ));
        tabs.push(new Tab(
            UserTab.Account,
            _td("Account"),
            "mx_UserSettingsDialog_settingsIcon",
            <AccountUserSettingsTab closeSettingsFn={this.props.onFinished} />,
            "UserSettingsGeneral",
        ));
        tabs.push(new Tab(
            UserTab.SecureMessaging,
            _td("Secure Messaging"),
            "mx_UserSettingsDialog_securityIcon",
            <SecureMessagingUserSettingsTab closeSettingsFn={this.props.onFinished} />,
            "UserSettingsSecurityPrivacy",
        ));
        tabs.push(new Tab(
            UserTab.Privacy,
            _td("Privacy"),
            "mx_UserSettingsDialog_mjolnirIcon",
            <PrivacyUserSettingsTab closeSettingsFn={this.props.onFinished} />,
            "UserSettingMjolnir",
        ));
        tabs.push(new Tab(
            UserTab.Notifications,
            _td("Notifications"),
            "mx_UserSettingsDialog_bellIcon",
            <NotificationUserSettingsTab />,
            "UserSettingsNotifications",
        ));
        tabs.push(new Tab(
            UserTab.Appearance,
            _td("Appearance"),
            "mx_UserSettingsDialog_appearanceIcon",
            <AppearanceUserSettingsTab />,
            "UserSettingsAppearance",
        ));
        tabs.push(new Tab(
            UserTab.Sidebar,
            _td("Sidebar"),
            "mx_UserSettingsDialog_sidebarIcon",
            <SidebarUserSettingsTab />,
            "UserSettingsSidebar",
        ));

        tabs.push(new Tab(
            UserTab.Preferences,
            _td("Preferences"),
            "mx_UserSettingsDialog_preferencesIcon",
            <PreferencesUserSettingsTab closeSettingsFn={this.props.onFinished} />,
            "UserSettingsPreferences",
        ));
        if (SettingsStore.getValue(UIFeature.Voip)) {
            tabs.push(new Tab(
                UserTab.Voice,
                _td("Audio & Video"),
                "mx_UserSettingsDialog_voiceIcon",
                <VoiceUserSettingsTab />,
                "UserSettingsVoiceVideo",
            ));
        }

        // Show the Labs tab if enabled or if there are any active betas
        if (SdkConfig.get("show_labs_settings")
            || SettingsStore.getFeatureSettingNames().some(k => SettingsStore.getBetaInfo(k))
        ) {
            tabs.push(new Tab(
                UserTab.Labs,
                _td("Labs"),
                "mx_UserSettingsDialog_labsIcon",
                <LabsUserSettingsTab />,
                "UserSettingsLabs",
            ));
        }
        tabs.push(new Tab(
            UserTab.Keyboard,
            _td("Shortcuts"),
            "mx_UserSettingsDialog_keyboardIcon",
            <KeyboardUserSettingsTab />,
            "UserSettingsKeyboard",
        ));
        tabs.push(new Tab(
            UserTab.Help,
            _td("Help & About"),
            "mx_UserSettingsDialog_helpIcon",
            <HelpUserSettingsTab closeSettingsFn={() => this.props.onFinished(true)} />,
            "UserSettingsHelpAbout",
        ));

        return tabs;
    }

    render() {
        return (
            <BaseDialog
                className='mx_UserSettingsDialog'
                hasCancel={true}
                onFinished={this.props.onFinished}
                title={_t("Settings")}
            >
                <div className='mx_SettingsDialog_content'>
                    <TabbedView
                        tabs={this.getTabs()}
                        initialTabId={this.props.initialTabId}
                        screenName="UserSettings"
                    />
                </div>
            </BaseDialog>
        );
    }
}
