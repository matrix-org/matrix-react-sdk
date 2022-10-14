/*
Copyright 2022 The Matrix.org Foundation C.I.C.

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

import { _t } from '../../../../languageHandler';
import { MatrixClientPeg } from '../../../../MatrixClientPeg';
import SdkConfig from '../../../../SdkConfig';
import AccessibleButton from '../../elements/AccessibleButton';
import Spinner from '../../elements/Spinner';
import SettingsSubsection from '../shared/SettingsSubsection';

interface IProps {
    onShowQr: () => void;
    onScanQr: () => void;
}

interface IState {
    supported: boolean | null;
}

export default class LoginWithQRSection extends React.Component<IProps, IState> {
    constructor(props: IProps) {
        super(props);

        this.state = {
            supported: null,
        };
    }

    public componentDidMount(): void {
        MatrixClientPeg.get().doesServerSupportUnstableFeature("org.matrix.msc3882").then((supported) => {
            this.setState({ supported });
        });
    }

    public render(): JSX.Element {
        if (!SdkConfig.get().login_with_qr?.reciprocate?.enable_scanning &&
            !SdkConfig.get().login_with_qr?.reciprocate?.enable_showing) {
            return null;
        }

        const features = SdkConfig.get().login_with_qr?.reciprocate;
        let description: string;
        if (features.enable_scanning && features.enable_showing) {
            description = _t("You can use this device to sign in a new device with a QR code. There are two ways " +
            "to do this:");
        } else if (features.enable_scanning) {
            description = _t("You can use this device to sign in a new device with a QR code. You will need to " +
            "use this device to scan the QR code shown on your other device that's signed out.");
        } else {
            description = _t("You can use this device to sign in a new device with a QR code. You will need to " +
            "scan the QR code shown on this device with your device that's signed out.");
        }

        const scanQR = features.enable_scanning ? <AccessibleButton
            onClick={this.props.onScanQr}
            kind="primary"
        >{ _t("Scan QR code") }</AccessibleButton> : null;

        const showQR = features.enable_showing ? <AccessibleButton
            onClick={this.props.onShowQr}
            kind={features.enable_scanning ? "primary_outline" : "primary"}
        >{ _t("Show QR code") }</AccessibleButton> : null;

        return <SettingsSubsection
            heading={_t('Sign in with QR code')}
        >
            <div className="mx_LoginWithQRSection">
                { this.state.supported === null && <Spinner /> }
                { this.state.supported === true &&
                    <>
                        <p className="mx_SettingsTab_subsectionText">{ description }</p>
                        { scanQR }
                        { showQR }
                    </>
                }
                { this.state.supported === false &&
                    <p className="mx_SettingsTab_subsectionText">{ _t("This homeserver doesn't support signing in with QR codes.") }</p>
                }
            </div>
        </SettingsSubsection>;
    }
}
