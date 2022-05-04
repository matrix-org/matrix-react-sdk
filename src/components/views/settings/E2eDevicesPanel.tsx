/*
Copyright 2016 - 2021 The Matrix.org Foundation C.I.C.

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
import classNames from 'classnames';
import { IMyDevice } from "matrix-js-sdk/src/client";
import { logger } from "matrix-js-sdk/src/logger";
import { CrossSigningInfo } from "matrix-js-sdk/src/crypto/CrossSigning";

import { MatrixClientPeg } from '../../../MatrixClientPeg';
import { _t } from '../../../languageHandler';
import Spinner from "../elements/Spinner";
import AccessibleButton from "../elements/AccessibleButton";
import Modal from '../../../Modal';
import SetupEncryptionDialog from '../dialogs/security/SetupEncryptionDialog';

interface IProps {
    className?: string;
}

interface IState {
    devices: IMyDevice[];
    crossSigningInfo?: CrossSigningInfo;
    deviceLoadError?: string;
    selectedDevices: string[];
    hasRecoveryKey: boolean;
}

export default class E2eDevicesPanel extends React.Component<IProps, IState> {
    private unmounted = false;

    constructor(props: IProps) {
        super(props);
        this.state = {
            devices: [],
            selectedDevices: [],
            hasRecoveryKey: !!localStorage.getItem('mx_4s_key'),
        };
        this.loadDevices = this.loadDevices.bind(this);
    }

    public componentDidMount(): void {
        this.loadDevices();
    }

    public componentWillUnmount(): void {
        this.unmounted = true;
    }

    private loadDevices(): void {
        const cli = MatrixClientPeg.get();
        cli.getDevices().then(
            (resp) => {
                if (this.unmounted) { return; }

                const crossSigningInfo = cli.getStoredCrossSigningForUser(cli.getUserId());
                this.setState((state, props) => {
                    const deviceIds = resp.devices.map((device) => device.device_id);
                    const selectedDevices = state.selectedDevices.filter(
                        (deviceId) => deviceIds.includes(deviceId),
                    );
                    return {
                        devices: resp.devices || [],
                        selectedDevices,
                        crossSigningInfo: crossSigningInfo,
                    };
                });
                console.log(this.state);
            },
            (error) => {
                if (this.unmounted) { return; }
                let errtxt;
                if (error.httpStatus == 404) {
                    // 404 probably means the HS doesn't yet support the API.
                    errtxt = _t("Your homeserver does not support device management.");
                } else {
                    logger.error("Error loading sessions:", error);
                    errtxt = _t("Unable to load device list");
                }
                this.setState({ deviceLoadError: errtxt });
            },
        );
    }

    /*
     * compare two devices, sorting from most-recently-seen to least-recently-seen
     * (and then, for stability, by device id)
     */
    private deviceCompare(a: IMyDevice, b: IMyDevice): number {
        // return < 0 if a comes before b, > 0 if a comes after b.
        const lastSeenDelta =
              (b.last_seen_ts || 0) - (a.last_seen_ts || 0);

        if (lastSeenDelta !== 0) { return lastSeenDelta; }

        const idA = a.device_id;
        const idB = b.device_id;
        return (idA < idB) ? -1 : (idA > idB) ? 1 : 0;
    }

    private isDeviceVerified(device: IMyDevice): boolean | null {
        try {
            const cli = MatrixClientPeg.get();
            const deviceInfo = cli.getStoredDevice(cli.getUserId(), device.device_id);
            return this.state.crossSigningInfo.checkDeviceTrust(
                this.state.crossSigningInfo,
                deviceInfo,
                false,
                true,
            ).isCrossSigningVerified();
        } catch (e) {
            console.error("Error getting device cross-signing info", e);
            return null;
        }
    }

    private async setupThisDevice() {
        const { finished } = Modal.createTrackedDialog("Verify session", "Verify session", SetupEncryptionDialog);
        await finished;
    }

    private notImplemented() {
        alert(`Not implemented. But here is the recovery key: ${localStorage.getItem('mx_4s_key')}`);
    }

    private async deleteRecoveryKey() {
        const cli = MatrixClientPeg.get();
        if (!await cli.getAccountDataFromServer('m.secret_storage.key.export')) {
            alert(`You need to save your recovery key before you can remove it from this device.`);
            return;
        }
        const x = confirm(`Are you sure you want to remove the key from this device?`);
        if (x) {
            localStorage.removeItem('mx_4s_key');
            this.setState({ hasRecoveryKey: false });
        }
    }

    public render(): JSX.Element {
        const loadError = (
            <div className={classNames(this.props.className, "error")}>
                { this.state.deviceLoadError }
            </div>
        );

        if (this.state.deviceLoadError !== undefined) {
            return loadError;
        }

        const devices = this.state.devices;
        if (devices === undefined) {
            // still loading
            return <Spinner />;
        }

        const myDeviceId = MatrixClientPeg.get().getDeviceId();
        const myDevice = devices.find((device) => (device.device_id === myDeviceId));
        if (!myDevice) {
            return loadError;
        }

        const otherDevices = devices.filter((device) => (device.device_id !== myDeviceId));
        otherDevices.sort(this.deviceCompare);

        const verifiedDevices: IMyDevice[] = [];
        const unverifiedDevices: IMyDevice[] = [];
        const nonCryptoDevices: IMyDevice[] = [];
        for (const device of otherDevices) {
            const verified = this.isDeviceVerified(device);
            if (verified === true) {
                verifiedDevices.push(device);
            } else if (verified === false) {
                unverifiedDevices.push(device);
            } else {
                nonCryptoDevices.push(device);
            }
        }

        const { hasRecoveryKey } = this.state;

        const classes = classNames(this.props.className, "mx_DevicesPanel");
        return (
            <div className={classes}>
                <div className="mx_DevicesPanel_header">
                    <div className="mx_DevicesPanel_header_title">
                        { _t("This device") }
                    </div>
                </div>
                { this.isDeviceVerified(myDevice) ?
                    <React.Fragment>
                        <p>
                            { _t("Secure messaging is set up on this device.") }
                            { !hasRecoveryKey ? null :
                                <span> Your recovery key is stored on this device for safe keeping.</span>
                            }
                        </p>
                        { !hasRecoveryKey ? null :
                            <AccessibleButton kind="primary" onClick={this.notImplemented}>
                                { _t("Save recovery key") }
                            </AccessibleButton>
                        }
                        { !hasRecoveryKey ? null :
                            <div>
                                <AccessibleButton kind="link" onClick={this.deleteRecoveryKey}>
                                    { _t("Delete recovery key from this device") }
                                </AccessibleButton>
                            </div>
                        }
                    </React.Fragment>
                    :
                    <React.Fragment>
                        <p>{ _t("Secure messaging is not set up on this device. Set up secure messaging to access past encrypted messages and allow others to trust it.") }</p>
                        <AccessibleButton kind="primary" onClick={this.setupThisDevice}>
                            { _t("Set up now") }
                        </AccessibleButton>
                    </React.Fragment>
                }
                <div className="mx_DevicesPanel_header">
                    <div className="mx_DevicesPanel_header_title">
                        { _t("Other devices") }
                    </div>
                </div>
                { (otherDevices.length > 0) ?
                    <React.Fragment>
                        { verifiedDevices.length === 0 ? null :
                            <p>You have <span title={verifiedDevices.map(x => x.device_id).join(' ')}>{ verifiedDevices.length } other device{ verifiedDevices.length > 1 ? 's' : '' }</span> that are setup for secure messaging.</p>
                        }
                        { unverifiedDevices.length === 0 ? null :
                            <p>You have <span title={unverifiedDevices.map(x => x.device_id).join(' ')}>{ unverifiedDevices.length } other device{ unverifiedDevices.length > 1 ? 's' : '' }</span> that { unverifiedDevices.length > 1 ? 'are' : 'is' } not setup for secure messaging.</p>
                        }
                        { nonCryptoDevices.length === 0 ? null :
                            <p>You have <span title={nonCryptoDevices.map(x => x.device_id).join(' ')}>{ nonCryptoDevices.length } other device{ nonCryptoDevices.length > 1 ? 's' : '' }</span> that do{ nonCryptoDevices.length > 1 ? '' : 'es' } not support secure messaging.</p>
                        }
                    </React.Fragment>
                    :
                    <p>{ _t("You aren't signed in to any other devices.") }</p>
                }
            </div>
        );
    }
}
