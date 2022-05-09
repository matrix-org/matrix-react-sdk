/*
Copyright 2016 OpenMarket Ltd
Copyright 2017 Vector Creations Ltd
Copyright 2019 New Vector Ltd
Copyright 2019 Michael Telatynski <7t3chguy@gmail.com>
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

import React from 'react';
import { DeviceInfo } from "matrix-js-sdk/src/crypto/deviceinfo";

import { MatrixClientPeg } from '../../../MatrixClientPeg';
import * as FormattingUtils from '../../../utils/FormattingUtils';
import { _t } from '../../../languageHandler';
import QuestionDialog from "./QuestionDialog";
import { IDialogProps } from "./IDialogProps";

interface IProps extends IDialogProps {
    userId: string;
    device: DeviceInfo;
}

export default class ManualDeviceKeyVerificationDialog extends React.Component<IProps> {
    private onLegacyFinished = (confirm: boolean): void => {
        if (confirm) {
            MatrixClientPeg.get().setDeviceVerified(
                this.props.userId, this.props.device.deviceId, true,
            );
        }
        this.props.onFinished(confirm);
    };

    public render(): JSX.Element {
        let text;
        if (MatrixClientPeg.get().getUserId() === this.props.userId) {
            text = _t("Confirm by comparing the following with the User Settings in your other session:");
        } else {
            text = _t("Confirm this user's session by comparing the following with their User Settings:");
        }

        const key = FormattingUtils.formatCryptoKey(this.props.device.getFingerprint());
        const body = (
            <div>
                <p>
                    { text }
                </p>
                <div className="mx_DeviceVerifyDialog_cryptoSection">
                    <ul>
                        <li><label>{ _t("Session name") }:</label> <span>{ this.props.device.getDisplayName() }</span></li>
                        <li><label>{ _t("Session ID") }:</label> <span><code>{ this.props.device.deviceId }</code></span></li>
                        <li><label>{ _t("Session key") }:</label> <span><code><b>{ key }</b></code></span></li>
                    </ul>
                </div>
                <p>
                    { _t("If they don't match, the security of your communication may be compromised.") }
                </p>
            </div>
        );

        return (
            <QuestionDialog
                title={_t("Verify session")}
                description={body}
                button={_t("Verify session")}
                onFinished={this.onLegacyFinished}
            />
        );
    }
}
