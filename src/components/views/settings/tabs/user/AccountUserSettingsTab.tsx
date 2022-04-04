/*
Copyright 2019 New Vector Ltd
Copyright 2019 The Matrix.org Foundation C.I.C.
Copyright 2019 Michael Telatynski <7t3chguy@gmail.com>

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
import { IThreepid } from "matrix-js-sdk/src/@types/threepids";
import { logger } from "matrix-js-sdk/src/logger";

import { _t } from "../../../../../languageHandler";
import SettingsStore from "../../../../../settings/SettingsStore";
import AccessibleButton from "../../../elements/AccessibleButton";
import DeactivateAccountDialog from "../../../dialogs/DeactivateAccountDialog";
import { MatrixClientPeg } from "../../../../../MatrixClientPeg";
import Modal from "../../../../../Modal";
import dis from "../../../../../dispatcher/dispatcher";
import { getThreepidsWithBindStatus } from '../../../../../boundThreepids';
import Spinner from "../../../elements/Spinner";
import { UIFeature } from "../../../../../settings/UIFeature";
import { replaceableComponent } from "../../../../../utils/replaceableComponent";
import { ActionPayload } from "../../../../../dispatcher/payloads";
import ErrorDialog from "../../../dialogs/ErrorDialog";
import AccountPhoneNumbers from "../../account/PhoneNumbers";
import AccountEmailAddresses from "../../account/EmailAddresses";
import ChangePassword from "../../ChangePassword";
import AccountDevicesPanel from '../../AccountDevicesPanel';

interface IProps {
    closeSettingsFn: () => void;
}

interface IState {
    haveIdServer: boolean;
    serverSupportsSeparateAddAndBind: boolean;
    emails: IThreepid[];
    msisdns: IThreepid[];
    loading3pids: boolean; // whether or not the emails and msisdns have been loaded
    canChangePassword: boolean;
}

@replaceableComponent("views.settings.tabs.user.AccountUserSettingsTab")
export default class AccountUserSettingsTab extends React.Component<IProps, IState> {
    private readonly dispatcherRef: string;

    constructor(props: IProps) {
        super(props);

        this.state = {
            haveIdServer: Boolean(MatrixClientPeg.get().getIdentityServerUrl()),
            serverSupportsSeparateAddAndBind: null,
            emails: [],
            msisdns: [],
            loading3pids: true, // whether or not the emails and msisdns have been loaded
            canChangePassword: false,
        };

        this.dispatcherRef = dis.register(this.onAction);
    }

    // TODO: [REACT-WARNING] Move this to constructor
    // eslint-disable-next-line @typescript-eslint/naming-convention, camelcase
    public async UNSAFE_componentWillMount(): Promise<void> {
        const cli = MatrixClientPeg.get();

        const serverSupportsSeparateAddAndBind = await cli.doesServerSupportSeparateAddAndBind();

        const capabilities = await cli.getCapabilities(); // this is cached
        const changePasswordCap = capabilities['m.change_password'];

        // You can change your password so long as the capability isn't explicitly disabled. The implicit
        // behaviour is you can change your password when the capability is missing or has not-false as
        // the enabled flag value.
        const canChangePassword = !changePasswordCap || changePasswordCap['enabled'] !== false;

        this.setState({ serverSupportsSeparateAddAndBind, canChangePassword });

        this.getThreepidState();
    }

    public componentWillUnmount(): void {
        dis.unregister(this.dispatcherRef);
    }

    private onAction = (payload: ActionPayload): void => {
        if (payload.action === 'id_server_changed') {
            this.setState({ haveIdServer: Boolean(MatrixClientPeg.get().getIdentityServerUrl()) });
            this.getThreepidState();
        }
    };

    private onEmailsChange = (emails: IThreepid[]): void => {
        this.setState({ emails });
    };

    private onMsisdnsChange = (msisdns: IThreepid[]): void => {
        this.setState({ msisdns });
    };

    private async getThreepidState(): Promise<void> {
        const cli = MatrixClientPeg.get();

        // Need to get 3PIDs generally for Account section and possibly also for
        // Discovery (assuming we have an IS and terms are agreed).
        let threepids = [];
        try {
            threepids = await getThreepidsWithBindStatus(cli);
        } catch (e) {
            const idServerUrl = MatrixClientPeg.get().getIdentityServerUrl();
            logger.warn(
                `Unable to reach identity server at ${idServerUrl} to check ` +
                `for 3PIDs bindings in Settings`,
            );
            logger.warn(e);
        }
        this.setState({
            emails: threepids.filter((a) => a.medium === 'email'),
            msisdns: threepids.filter((a) => a.medium === 'msisdn'),
            loading3pids: false,
        });
    }

    private onPasswordChangeError = (err): void => {
        // TODO: Figure out a design that doesn't involve replacing the current dialog
        let errMsg = err.error || err.message || "";
        if (err.httpStatus === 403) {
            errMsg = _t("Failed to change password. Is your password correct?");
        } else if (!errMsg) {
            errMsg += ` (HTTP status ${err.httpStatus})`;
        }
        logger.error("Failed to change password: " + errMsg);
        Modal.createTrackedDialog('Failed to change password', '', ErrorDialog, {
            title: _t("Error"),
            description: errMsg,
        });
    };

    private onPasswordChanged = (): void => {
        // TODO: Figure out a design that doesn't involve replacing the current dialog
        Modal.createTrackedDialog('Password changed', '', ErrorDialog, {
            title: _t("Success"),
            description: _t(
                "Your password was successfully changed. You will not receive " +
                "push notifications on other sessions until you log back in to them",
            ) + ".",
        });
    };

    private onDeactivateClicked = (): void => {
        Modal.createTrackedDialog('Deactivate Account', '', DeactivateAccountDialog, {
            onFinished: (success) => {
                if (success) this.props.closeSettingsFn();
            },
        });
    };

    private renderAccountSection(): JSX.Element {
        let passwordChangeForm = (
            <ChangePassword
                className="mx_GeneralUserSettingsTab_changePassword"
                rowClassName=""
                buttonKind="primary"
                onError={this.onPasswordChangeError}
                onFinished={this.onPasswordChanged} />
        );

        let threepidSection = null;

        // For older homeservers without separate 3PID add and bind methods (MSC2290),
        // we use a combo add with bind option API which requires an identity server to
        // validate 3PID ownership even if we're just adding to the homeserver only.
        // For newer homeservers with separate 3PID add and bind methods (MSC2290),
        // there is no such concern, so we can always show the HS account 3PIDs.
        if (SettingsStore.getValue(UIFeature.ThirdPartyID) &&
            (this.state.haveIdServer || this.state.serverSupportsSeparateAddAndBind === true)
        ) {
            const emails = this.state.loading3pids
                ? <Spinner />
                : <AccountEmailAddresses
                    emails={this.state.emails}
                    onEmailsChange={this.onEmailsChange}
                />;
            const msisdns = this.state.loading3pids
                ? <Spinner />
                : <AccountPhoneNumbers
                    msisdns={this.state.msisdns}
                    onMsisdnsChange={this.onMsisdnsChange}
                />;
            threepidSection = <div>
                <span className="mx_SettingsTab_subheading">{ _t("Email addresses") }</span>
                { emails }

                <span className="mx_SettingsTab_subheading">{ _t("Phone numbers") }</span>
                { msisdns }
            </div>;
        } else if (this.state.serverSupportsSeparateAddAndBind === null) {
            threepidSection = <Spinner />;
        }

        let passwordChangeText = _t("Set a new account password...");
        if (!this.state.canChangePassword) {
            // Just don't show anything if you can't do anything.
            passwordChangeText = null;
            passwordChangeForm = null;
        }

        return (
            <div className="mx_SettingsTab_section mx_GeneralUserSettingsTab_accountSection">
                <span className="mx_SettingsTab_subheading">{ _t("Change password") }</span>
                <p className="mx_SettingsTab_subsectionText">
                    { passwordChangeText }
                </p>
                { passwordChangeForm }
                { threepidSection }
            </div>
        );
    }

    private renderManagementSection(): JSX.Element {
        // TODO: Improve warning text for account deactivation
        return (
            <div className="mx_SettingsTab_section">
                <span className="mx_SettingsTab_subheading">{ _t("Close account") }</span>
                <span className="mx_SettingsTab_subsectionText">
                    { _t("Deactivating your account is a permanent action - be careful!") }
                </span>
                <AccessibleButton onClick={this.onDeactivateClicked} kind="danger">
                    { _t("Deactivate Account") }
                </AccessibleButton>
            </div>
        );
    }

    public render(): JSX.Element {
        let accountManagementSection;
        if (SettingsStore.getValue(UIFeature.Deactivate)) {
            accountManagementSection = <>
                <div className="mx_SettingsTab_heading">{ _t("Danger zone") }</div>
                { this.renderManagementSection() }
            </>;
        }

        return (
            <div className="mx_SettingsTab">
                <div className="mx_SettingsTab_heading">{ _t("Account") }</div>
                <div className="mx_SettingsTab_section">
                    <span className="mx_SettingsTab_subheading">{ _t("Where you're signed in") }</span>
                    <div className="mx_SettingsTab_section">
                        <span>
                            { _t(
                                "Manage your signed-in devices below.",
                            ) }
                        </span>
                        <AccountDevicesPanel />
                    </div>
                </div>
                { this.renderAccountSection() }
                { accountManagementSection }
            </div>
        );
    }
}
