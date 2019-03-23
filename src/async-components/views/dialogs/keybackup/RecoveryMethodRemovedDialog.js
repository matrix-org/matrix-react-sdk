/*
Copyright 2019 New Vector Ltd

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
import PropTypes from "prop-types";
import sdk from "../../../../index";
import dis from "../../../../dispatcher";
import { _t } from "../../../../languageHandler";
import Modal from "../../../../Modal";

export default class RecoveryMethodRemovedDialog extends React.PureComponent {
    static propTypes = {
        onFinished: PropTypes.func.isRequired,
    }

    onGoToSettingsClick = () => {
        this.props.onFinished();
        dis.dispatch({ action: 'view_user_settings' });
    }

    onSetupClick = () => {
        this.props.onFinished();
        Modal.createTrackedDialogAsync("Key Backup", "Key Backup",
            import("./CreateKeyBackupDialog"),
        );
    }

    render() {
        const BaseDialog = sdk.getComponent("views.dialogs.BaseDialog");
        const DialogButtons = sdk.getComponent("views.elements.DialogButtons");

        const title = <span className="mx_KeyBackupFailedDialog_title">
            {_t("Recovery Method Removed")}
        </span>;

        return (
            <BaseDialog className="mx_KeyBackupFailedDialog"
                onFinished={this.props.onFinished}
                title={title}
            >
                <div>
                    <p>{_t(
                        "This device has detected that your recovery passphrase and key " +
                        "for Secure Messages have been removed.",
                    )}</p>
                    <p>{_t(
                        "If you did this accidentally, you can setup Secure Messages on " +
                        "this device which will re-encrypt this device's message " +
                        "history with a new recovery method.",
                    )}</p>
                    <p className="warning">{_t(
                        "If you didn't remove the recovery method, an " +
                        "attacker may be trying to access your account. " +
                        "Change your account password and set a new recovery " +
                        "method immediately in Settings.",
                    )}</p>
                    <DialogButtons
                        primaryButton={_t("Set up Secure Messages")}
                        onPrimaryButtonClick={this.onSetupClick}
                        cancelButton={_t("Go to Settings")}
                        onCancel={this.onGoToSettingsClick}
                    />
                </div>
            </BaseDialog>
        );
    }
}
