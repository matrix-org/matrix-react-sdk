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
import { privateShouldBeEncrypted } from "../../../../../createRoom";
import SecureBackupPanel from "../../SecureBackupPanel";
import SettingsStore from "../../../../../settings/SettingsStore";
import { UIFeature } from "../../../../../settings/UIFeature";
import E2eAdvancedPanel, { isE2eAdvancedPanelPossible } from "../../E2eAdvancedPanel";
import { replaceableComponent } from "../../../../../utils/replaceableComponent";
import CryptographyPanel from "../../CryptographyPanel";
import E2eDevicesPanel from "../../E2eDevicesPanel";
import CrossSigningPanel from "../../CrossSigningPanel";
import EventIndexPanel from "../../EventIndexPanel";
import { MatrixClientPeg } from '../../../../../MatrixClientPeg';

interface IProps {
    closeSettingsFn: () => void;
}

interface IState {
    canChangePassword: boolean,
}

@replaceableComponent("views.settings.tabs.user.SecureMessagingUserSettingsTab")
export default class SecureMessagingUserSettingsTab extends React.Component<IProps, IState> {
    constructor(props: IProps) {
        super(props);

        this.state = {
            canChangePassword: false,
        };
    }

    // TODO: [REACT-WARNING] Move this to constructor
    // eslint-disable-next-line @typescript-eslint/naming-convention, camelcase
    public async UNSAFE_componentWillMount(): Promise<void> {
        const cli = MatrixClientPeg.get();

        const capabilities = await cli.getCapabilities(); // this is cached
        const changePasswordCap = capabilities['m.change_password'];

        // You can change your password so long as the capability isn't explicitly disabled. The implicit
        // behaviour is you can change your password when the capability is missing or has not-false as
        // the enabled flag value.
        const canChangePassword = !changePasswordCap || changePasswordCap['enabled'] !== false;

        this.setState({ canChangePassword });
    }

    public render(): JSX.Element {
        const secureBackup = (
            <div className='mx_SettingsTab_section'>
                <span className="mx_SettingsTab_subheading">{ _t("Secure Backup") }</span>
                <div className='mx_SettingsTab_subsectionText'>
                    <SecureBackupPanel />
                </div>
            </div>
        );

        const eventIndex = (
            <div className="mx_SettingsTab_section">
                <span className="mx_SettingsTab_subheading">{ _t("Message search") }</span>
                <EventIndexPanel />
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
            const e2ePanel = isE2eAdvancedPanelPossible() ? <E2eAdvancedPanel /> : null;
            // only show the section if there's something to show
            if (e2ePanel) {
                advancedSection = <>
                    <div className="mx_SettingsTab_heading">{ _t("Advanced") }</div>
                    <div className="mx_SettingsTab_section">
                        { e2ePanel }
                        { eventIndex }
                        { crossSigning }
                        <CryptographyPanel />
                    </div>
                </>;
            }
        }

        return (
            <div className="mx_SettingsTab mx_SecurityUserSettingsTab">
                { warning }
                <div className="mx_SettingsTab_heading">{ _t("Secure messaging") }</div>
                <p>{ _t("Secure messages are protected using end-to-end encryption ") }</p>
                <div className="mx_SettingsTab_heading">{ _t("Where you're signed in") }</div>
                <div className="mx_SettingsTab_section">
                    <span>
                        { _t(
                            "Manage your signed-in devices below. " +
                            "A device's name is visible to people you communicate with.",
                        ) }
                    </span>
                    <E2eDevicesPanel />
                </div>
                <div className="mx_SettingsTab_section">
                    { secureBackup }
                </div>
                { advancedSection }
            </div>
        );
    }
}
