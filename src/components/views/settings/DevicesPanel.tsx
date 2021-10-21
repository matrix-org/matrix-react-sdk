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

import { MatrixClientPeg } from '../../../MatrixClientPeg';
import { _t } from '../../../languageHandler';
import Modal from '../../../Modal';
import { SSOAuthEntry } from "../auth/InteractiveAuthEntryComponents";
import { replaceableComponent } from "../../../utils/replaceableComponent";
import InteractiveAuthDialog from "../dialogs/InteractiveAuthDialog";
import DevicesPanelEntry from "./DevicesPanelEntry";
import Spinner from "../elements/Spinner";
import AccessibleButton from "../elements/AccessibleButton";
import { CrossSigningInfo } from "matrix-js-sdk/src/crypto/CrossSigning";

import { logger } from "matrix-js-sdk/src/logger";

interface IProps {
    className?: string;
}

interface IState {
    devices: IMyDevice[];
    crossSigningInfo?: CrossSigningInfo;
    deviceLoadError?: string;
    deleting?: boolean;
}

@replaceableComponent("views.settings.DevicesPanel")
export default class DevicesPanel extends React.Component<IProps, IState> {
    private unmounted = false;

    constructor(props: IProps) {
        super(props);
        this.state = {
            devices: [],
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
                this.setState({
                    devices: resp.devices || [],
                    crossSigningInfo: crossSigningInfo,
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

    private onDeviceSignOut = (device: IMyDevice): void => {
        this.deleteDevices([device]);
    };

    private deleteDevices = (devices: IMyDevice[]): void => {
        this.setState({
            deleting: true,
        });

        const deleteRequest = this.generateDeleteRequest(devices.map((device) => device.device_id));

        deleteRequest(null).catch((error) => {
            if (this.unmounted) { return; }
            if (error.httpStatus !== 401 || !error.data || !error.data.flows) {
                // doesn't look like an interactive-auth failure
                throw error;
            }

            // pop up an interactive auth dialog

            const numDevices = devices.length;
            const dialogAesthetics = {
                [SSOAuthEntry.PHASE_PREAUTH]: {
                    title: _t("Use Single Sign On to continue"),
                    body: _t("Confirm logging out these devices by using Single Sign On to prove your identity.", {
                        count: numDevices,
                    }),
                    continueText: _t("Single Sign On"),
                    continueKind: "primary",
                },
                [SSOAuthEntry.PHASE_POSTAUTH]: {
                    title: _t("Confirm signing out these devices"),
                    body: _t("Click the button below to confirm signing out these devices.", {
                        count: numDevices,
                    }),
                    continueText: _t("Sign out devices", { count: numDevices }),
                    continueKind: "danger",
                },
            };
            Modal.createTrackedDialog('Delete Device Dialog', '', InteractiveAuthDialog, {
                title: _t("Authentication"),
                matrixClient: MatrixClientPeg.get(),
                authData: error.data,
                makeRequest: deleteRequest,
                aestheticsForStagePhases: {
                    [SSOAuthEntry.LOGIN_TYPE]: dialogAesthetics,
                    [SSOAuthEntry.UNSTABLE_LOGIN_TYPE]: dialogAesthetics,
                },
            });
        }).catch((e) => {
            logger.error("Error deleting sessions", e);
            if (this.unmounted) { return; }
        }).finally(() => {
            this.setState({
                deleting: false,
            });
        });
    };

    // TODO: proper typing for auth
    private generateDeleteRequest(devices: string[]): (auth?: any) => Promise<any> {
        return (auth?: any): Promise<any> => {
            return MatrixClientPeg.get().deleteMultipleDevices(devices, auth).then(this.loadDevices);
        };
    }

    private renderDevice = (device: IMyDevice): JSX.Element => {
        const myDeviceId = MatrixClientPeg.get().getDeviceId();
        const myDevice = this.state.devices.find((device) => (device.device_id === myDeviceId));

        const isOwnDevice = device.device_id === myDeviceId;

        // If our own device is unverified, it can't verify other
        // devices, it can only request verification for itself
        const canBeVerified = (myDevice && this.isDeviceVerified(myDevice)) || isOwnDevice;

        return <DevicesPanelEntry
            key={device.device_id}
            device={device}
            isOwnDevice={isOwnDevice}
            verified={this.isDeviceVerified(device)}
            canBeVerified={canBeVerified}
            onDeviceChange={this.loadDevices}
            onDeviceSignOut={this.onDeviceSignOut}
        />;
    };

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

        const deleteButton = this.state.deleting ?
            <Spinner w={22} h={22} /> :
            <AccessibleButton className="mx_DevicesPanel_deleteOthersButton" onClick={() => { this.deleteDevices(otherDevices); }} kind="danger_sm">
                { _t("Sign out all other devices") }
            </AccessibleButton>;

        const otherDevicesSection = (otherDevices.length > 0) ?
            <React.Fragment>
                <div className="mx_DevicesPanel_header">{ _t("Other devices") }</div>
                { otherDevices.map(this.renderDevice) }
                { deleteButton }
            </React.Fragment> :
            <div className="mx_DevicesPanel_header">{ _t("No other devices") }</div>;

        const classes = classNames(this.props.className, "mx_DevicesPanel");
        return (
            <div className={classes}>
                <div className="mx_DevicesPanel_header">{ _t("This device") }</div>
                { this.renderDevice(myDevice) }
                { otherDevicesSection }
            </div>
        );
    }
}
