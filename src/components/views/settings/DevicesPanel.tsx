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
import DevicesPanelEntry from "./DevicesPanelEntry";
import Spinner from "../elements/Spinner";
import AccessibleButton from "../elements/AccessibleButton";
import { deleteDevicesWithInteractiveAuth } from './devices/deleteDevices';

interface IProps {
    className?: string;
}

interface IState {
    devices: IMyDevice[];
    crossSigningInfo?: CrossSigningInfo;
    deviceLoadError?: string;
    selectedDevices: string[];
    deleting?: boolean;
}

export default class DevicesPanel extends React.Component<IProps, IState> {
    private unmounted = false;

    constructor(props: IProps) {
        super(props);
        this.state = {
            devices: [],
            selectedDevices: [],
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

    private onDeviceSelectionToggled = (device: IMyDevice): void => {
        if (this.unmounted) { return; }

        const deviceId = device.device_id;
        this.setState((state, props) => {
            // Make a copy of the selected devices, then add or remove the device
            const selectedDevices = state.selectedDevices.slice();

            const i = selectedDevices.indexOf(deviceId);
            if (i === -1) {
                selectedDevices.push(deviceId);
            } else {
                selectedDevices.splice(i, 1);
            }

            return { selectedDevices };
        });
    };

    private selectAll = (devices: IMyDevice[]): void => {
        this.setState((state, props) => {
            const selectedDevices = state.selectedDevices.slice();

            for (const device of devices) {
                const deviceId = device.device_id;
                if (!selectedDevices.includes(deviceId)) {
                    selectedDevices.push(deviceId);
                }
            }

            return { selectedDevices };
        });
    };

    private deselectAll = (devices: IMyDevice[]): void => {
        this.setState((state, props) => {
            const selectedDevices = state.selectedDevices.slice();

            for (const device of devices) {
                const deviceId = device.device_id;
                const i = selectedDevices.indexOf(deviceId);
                if (i !== -1) {
                    selectedDevices.splice(i, 1);
                }
            }

            return { selectedDevices };
        });
    };

    private onDeleteClick = async (): Promise<void> => {
        if (this.state.selectedDevices.length === 0) { return; }

        this.setState({
            deleting: true,
        });

        try {
            await deleteDevicesWithInteractiveAuth(
                MatrixClientPeg.get(),
                this.state.selectedDevices,
                (success) => {
                    if (success) {
                        // Reset selection to [], update device list
                        this.setState({
                            selectedDevices: [],
                        });
                        this.loadDevices();
                    }
                    this.setState({
                        deleting: false,
                    });
                },
            );
        } catch (error) {
            logger.error("Error deleting sessions", error);
            this.setState({
                deleting: false,
            });
        }
    };

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
            selected={this.state.selectedDevices.includes(device.device_id)}
            isOwnDevice={isOwnDevice}
            verified={this.isDeviceVerified(device)}
            canBeVerified={canBeVerified}
            onDeviceChange={this.loadDevices}
            onDeviceToggled={this.onDeviceSelectionToggled}
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

        const verifiedDevices = [];
        const unverifiedDevices = [];
        const nonCryptoDevices = [];
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

        const section = (trustIcon: JSX.Element, title: string, deviceList: IMyDevice[]): JSX.Element => {
            if (deviceList.length === 0) {
                return <React.Fragment />;
            }

            let selectButton: JSX.Element;
            if (deviceList.length > 1) {
                const anySelected = deviceList.some((device) => this.state.selectedDevices.includes(device.device_id));
                const buttonAction = anySelected ?
                    () => { this.deselectAll(deviceList); } :
                    () => { this.selectAll(deviceList); };
                const buttonText = anySelected ? _t("Deselect all") : _t("Select all");
                selectButton = <div className="mx_DevicesPanel_header_button">
                    <AccessibleButton
                        className="mx_DevicesPanel_selectButton"
                        kind="secondary"
                        onClick={buttonAction}
                    >
                        { buttonText }
                    </AccessibleButton>
                </div>;
            }

            return <React.Fragment>
                <hr />
                <div className="mx_DevicesPanel_header">
                    <div className="mx_DevicesPanel_header_trust">
                        { trustIcon }
                    </div>
                    <div className="mx_DevicesPanel_header_title">
                        { title }
                    </div>
                    { selectButton }
                </div>
                { deviceList.map(this.renderDevice) }
            </React.Fragment>;
        };

        const verifiedDevicesSection = section(
            <span className="mx_DevicesPanel_header_icon mx_E2EIcon mx_E2EIcon_verified" />,
            _t("Verified devices"),
            verifiedDevices,
        );

        const unverifiedDevicesSection = section(
            <span className="mx_DevicesPanel_header_icon mx_E2EIcon mx_E2EIcon_warning" />,
            _t("Unverified devices"),
            unverifiedDevices,
        );

        const nonCryptoDevicesSection = section(
            <React.Fragment />,
            _t("Devices without encryption support"),
            nonCryptoDevices,
        );

        const deleteButton = this.state.deleting ?
            <Spinner w={22} h={22} /> :
            <AccessibleButton
                className="mx_DevicesPanel_deleteButton"
                onClick={this.onDeleteClick}
                kind="danger_outline"
                disabled={this.state.selectedDevices.length === 0}
                data-testid='sign-out-devices-btn'
            >
                { _t("Sign out %(count)s selected devices", { count: this.state.selectedDevices.length }) }
            </AccessibleButton>;

        const otherDevicesSection = (otherDevices.length > 0) ?
            <React.Fragment>
                { verifiedDevicesSection }
                { unverifiedDevicesSection }
                { nonCryptoDevicesSection }
                { deleteButton }
            </React.Fragment> :
            <React.Fragment>
                <hr />
                <div className="mx_DevicesPanel_noOtherDevices">
                    { _t("You aren't signed into any other devices.") }
                </div>
            </React.Fragment>;

        const classes = classNames(this.props.className, "mx_DevicesPanel");
        return (
            <div className={classes}>
                <div className="mx_DevicesPanel_header">
                    <div className="mx_DevicesPanel_header_title">
                        { _t("This device") }
                    </div>
                </div>
                { this.renderDevice(myDevice) }
                { otherDevicesSection }
            </div>
        );
    }
}
