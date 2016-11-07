/*
Copyright 2016 OpenMarket Ltd

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

import * as Matrix from 'matrix-js-sdk';
import q from 'q';
import React from 'react';

import sdk from '../../../index';
import verifyDevice from '../../../utils/verifyDevice';
import WithMatrixClient from '../../../wrappers/WithMatrixClient';

const DeviceTile = React.createClass({
    displayName: 'VerifyOwnNewDevicesDialogTile',

    propTypes: {
        userId: React.PropTypes.string.isRequired,
        deviceId: React.PropTypes.string.isRequired,
        device: React.PropTypes.object,
    },

    render: function() {
        const DeviceVerifyButtons = sdk.getComponent('views.elements.DeviceVerifyButtons');
        const dev = this.props.device;
        let deviceName = "(unknown)";
        let buttons = null;
        if (dev) {
            deviceName = dev.getDisplayName();
            buttons = <DeviceVerifyButtons userId={this.props.userId} device={this.props.device}/>;
        }

        return (
            <div>
                {deviceName} ({this.props.deviceId}) {buttons}
            </div>
        );
    },
});

export default React.createClass({
    displayName: 'VerifyOwnNewDevicesDialog',

    propTypes: {
        matrixClient: React.PropTypes.instanceOf(Matrix.MatrixClient).isRequired,
        deviceIds: React.PropTypes.array.isRequired,
        onFinished: React.PropTypes.func.isRequired,
    },

    childContextTypes: {
        matrixClient: React.PropTypes.instanceOf(Matrix.MatrixClient),
    },

    getInitialState: function() {
        return {
            deviceMap: {},
            devicesLoading: false,
        };
    },

    getChildContext: function() {
        return {
            matrixClient: this.props.matrixClient,
        };
    },

    componentWillMount: function() {
        this._cancelDeviceList = null;
    },

    componentDidMount: function() {
        this._updateDeviceMap();

        // if we have any unknown devices, download them now
        this._downloadDeviceListIfNeeded();

        const cli = this.props.matrixClient;
        cli.on("deviceVerificationChanged", this._onDeviceVerificationChanged);
    },

    componentWillUnmount: function() {
        if (this._cancelDeviceList) {
            this._cancelDeviceList();
        }
        var cli = this.props.matrixClient;
        cli.removeListener("deviceVerificationChanged", this._onDeviceVerificationChanged);
    },

    _onDeviceVerificationChanged: function() {
        this._updateDeviceMap();
    },

    _updateDeviceMap: function() {
        const deviceMap = {};
        const client = this.props.matrixClient;
        const myUserId = client.credentials.userId;
        let hasUnverifiedDevices = false;

        for (const d of this.props.deviceIds) {
            const dev = client.getStoredDevice(myUserId, d) || null;
            if (dev && (dev.isVerified() || dev.isBlocked())) {
                continue;
            }
            deviceMap[d] = dev;
            hasUnverifiedDevices = true;
        }

        this.setState({deviceMap: deviceMap});

        // if we no longer have any unverified devices, we're done (but calling
        // onFinished directly will cause problems, because it means we will be
        // unmounted before we have finished being mounted).
        if (!hasUnverifiedDevices) {
            console.log("All devices verified; we are done here");
            setTimeout(this.props.onFinished, 0);
        }
    },

    _downloadDeviceListIfNeeded: function() {
        let needsDownload = false;
        const client = this.props.matrixClient;
        const myUserId = client.credentials.userId;
        for (const d of this.props.deviceIds) {
            const dev = client.getStoredDevice(myUserId, d);
            if (!dev) {
                needsDownload = true;
                break;
            }
        }

        if (!needsDownload) return;

        if (this._cancelDeviceList) {
            this._cancelDeviceList();
        }

        let cancelled = false;
        this._cancelDeviceList = function() { cancelled = true; };

        client.downloadKeys([myUserId], true).then(() => {
            if (cancelled) return;
            this._updateDeviceMap();
        },(err) => {
            console.log("Error downloading devices", err);
        }).finally(() => {
            this._cancelDeviceList = null;
        }).done();
    },

    render: function() {
        var tiles = [];
        // deviceMap contains entries (possibly null) for the devices which
        // are still unverified; iterate over the keys of that rather than
        // props.deviceIds which contains all the devices which were unverified
        // when we started.
        const myUserId = this.props.matrixClient.credentials.userId;

        for (const deviceId of Object.keys(this.state.deviceMap)) {
            tiles.push(
                <DeviceTile key={deviceId}
                    userId={myUserId} deviceId={deviceId}
                    device={this.state.deviceMap[deviceId]}
                />
            );
        }
        return (
            <div>
                {tiles}
            </div>
        );
    },
});
