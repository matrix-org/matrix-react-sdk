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

import React, { useCallback } from "react";
import { Device } from "matrix-js-sdk/src/matrix";

import * as FormattingUtils from "../../../utils/FormattingUtils";
import { _t } from "../../../languageHandler";
import QuestionDialog from "./QuestionDialog";
import { MatrixClientPeg } from "../../../MatrixClientPeg";

interface IManualDeviceKeyVerificationDialogProps {
    userId: string;
    device: Device;
    onFinished(confirm?: boolean): void;
}

export function ManualDeviceKeyVerificationDialog({
    userId,
    device,
    onFinished,
}: IManualDeviceKeyVerificationDialogProps): JSX.Element {
    const mxClient = MatrixClientPeg.safeGet();

    const onLegacyFinished = useCallback(
        (confirm: boolean) => {
            if (confirm) {
                mxClient.setDeviceVerified(userId, device.deviceId, true);
            }
            onFinished(confirm);
        },
        [mxClient, userId, device, onFinished],
    );

    let text;
    if (mxClient?.getUserId() === userId) {
        text = _t("encryption|verification|manual_device_verification_self_text");
    } else {
        text = _t("encryption|verification|manual_device_verification_user_text");
    }

    const fingerprint = device.getFingerprint();
    const key = fingerprint && FormattingUtils.formatCryptoKey(fingerprint);
    const body = (
        <div>
            <p>{text}</p>
            <div className="mx_DeviceVerifyDialog_cryptoSection">
                <ul>
                    <li>
                        <label>{_t("encryption|verification|manual_device_verification_device_name_label")}:</label>{" "}
                        <span>{device.displayName}</span>
                    </li>
                    <li>
                        <label>{_t("encryption|verification|manual_device_verification_device_id_label")}:</label>{" "}
                        <span>
                            <code>{device.deviceId}</code>
                        </span>
                    </li>
                    <li>
                        <label>{_t("encryption|verification|manual_device_verification_device_key_label")}:</label>{" "}
                        <span>
                            <code>
                                <b>{key}</b>
                            </code>
                        </span>
                    </li>
                </ul>
            </div>
            <p>{_t("encryption|verification|manual_device_verification_footer")}</p>
        </div>
    );

    return (
        <QuestionDialog
            title={_t("settings|sessions|verify_session")}
            description={body}
            button={_t("settings|sessions|verify_session")}
            onFinished={onLegacyFinished}
        />
    );
}
