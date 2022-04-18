/*
Copyright 2019 - 2022 The Matrix.org Foundation C.I.C.

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

import { _t } from "../../../../../languageHandler";
import { privateShouldBeEncrypted } from "../../../../../utils/rooms";
import SecureBackupPanel from "../../SecureBackupPanel";
import SettingsStore from "../../../../../settings/SettingsStore";
import { UIFeature } from "../../../../../settings/UIFeature";
import E2eTrustPanel from "../../E2eTrustPanel";
import CryptographyPanel from "../../CryptographyPanel";
import E2eDevicesPanel from "../../E2eDevicesPanel";
import CrossSigningPanel from "../../CrossSigningPanel";
import EventIndexPanel from "../../EventIndexPanel";

interface IProps {
    closeSettingsFn: () => void;
}

interface IState {}

export default class SecureMessagingUserSettingsTab extends React.Component<IProps, IState> {
    constructor(props: IProps) {
        super(props);

        this.state = {};
    }

    public render(): JSX.Element {
        const secureBackup = (
            <div className='mx_SettingsTab_section'>
                <span className="mx_SettingsTab_subheading">{ _t("Message key backup") }</span>
                <div className='mx_SettingsTab_subsectionText'>
                    <SecureBackupPanel />
                </div>
            </div>
        );

        // XXX: There's no such panel in the current cross-signing designs, but
        // it's useful to have for testing the feature. If there's no interest
        // in having advanced details here once all flows are implemented, we
        // can remove this.
        const crossSigning = (
            <div className='mx_SettingsTab_section'>
                <span className="mx_SettingsTab_subheading">{ _t("Cross-signing") }</span>
                <div className='mx_SettingsTab_subsectionText'>
                    <CrossSigningPanel />
                </div>
            </div>
        );

        let warning;
        if (!privateShouldBeEncrypted()) {
            warning = <div className="mx_SecurityUserSettingsTab_warning">
                { _t("Your server admin has disabled secure messaging by default. You will need to enable it on individual rooms and Direct Messages where you want it.") }
            </div>;
        }

        let advancedSection;
        if (SettingsStore.getValue(UIFeature.AdvancedSettings)) {
            // only show the section if there's something to show
            advancedSection = <>
                <details>
                    <summary>{ _t("Advanced") }</summary>
                    <div className="mx_SettingsTab_section">
                        { secureBackup }
                        { crossSigning }
                        <CryptographyPanel />
                    </div>
                </details>
            </>;
        }

        return (
            <div className="mx_SettingsTab mx_SecurityUserSettingsTab">
                { warning }
                <div className="mx_SettingsTab_heading">{ _t("Secure messaging") }</div>
                <p>{ _t("Secure messages are protected using end-to-end encryption. This ensures that only you and your intended recipients can read them.") }</p>
                <div className="mx_SettingsTab_heading">{ _t("Your devices") }</div>
                <div className="mx_SettingsTab_section">
                    <E2eDevicesPanel />
                </div>
                <div className="mx_SettingsTab_heading">{ _t("Trust") }</div>
                <div className="mx_SettingsTab_section">
                    <E2eTrustPanel />
                </div>
                <div className="mx_SettingsTab_heading">{ _t("Search") }</div>
                <div className="mx_SettingsTab_section">
                    <EventIndexPanel />
                </div>
                { advancedSection }
            </div>
        );
    }
}
