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
import React from 'react';

import Modal from '../../../Modal';
import sdk from '../../../index';
import WithMatrixClient from '../../../wrappers/WithMatrixClient';


const VerifyOwnNewDevicesPanel = WithMatrixClient(React.createClass({
    displayName: 'VerifyOwnNewDevicesPanel',

    propTypes: {
        matrixClient: React.PropTypes.instanceOf(Matrix.MatrixClient).isRequired,
        deviceIds: React.PropTypes.array.isRequired,
    },

    _openVerifyDialog: function() {
        const VerifyOwnNewDevicesDialog = sdk.getComponent('views.dialogs.VerifyOwnNewDevicesDialog');
        Modal.createDialog(VerifyOwnNewDevicesDialog, {
            matrixClient: this.props.matrixClient,
            deviceIds: this.props.deviceIds,
        });
    },

    render: function() {
        const link = <a onClick={this._openVerifyDialog}>Click here</a>;

        let msg = null;
        if (this.props.deviceIds.length > 1) {
            return (
                <div>
                    You added new devices. {link} to verify them so
                    that you can share keys with them.
                </div>
            );
        } else {
            return (
                <div>
                    You added a new device. {link} to verify it so
                    that you can share keys with it.
                </div>
            );
        }
    },
}));

const KeyRequestTile = WithMatrixClient(React.createClass({
    displayName: 'KeyRequestTile',

    propTypes: {
        userId: React.PropTypes.string.isRequired,
        deviceId: React.PropTypes.string.isRequired,
        requests: React.PropTypes.array.isRequired,
        matrixClient: React.PropTypes.instanceOf(Matrix.MatrixClient).isRequired,
    },

    getInitialState: function () {
        var result = {
            deviceVerified: false,
            deviceBlocked: false,
        };

        const props = this.props;

        const dev = this.props.matrixClient.getStoredDevice(props.userId, props.deviceId);
        if (!dev) { return result; }

        result['deviceVerified'] = dev.isVerified();
        result['deviceBlocked'] = dev.isBlocked();
        return result;
    },

    render: function() {
        return (
            <div>
                {this.props.userId} {this.props.deviceId}
                requests: {JSON.stringify(this.props.requests)}
            </div>
        );
    },
}));

export default WithMatrixClient(React.createClass({
    displayName: 'KeyRequestPanel',

    propTypes: {
        room: React.PropTypes.instanceOf(Matrix.Room).isRequired,
        matrixClient: React.PropTypes.instanceOf(Matrix.MatrixClient).isRequired,
    },

    getInitialState: function() {
        // list of deviceids
        return {
            unverifiedOwnDevices: [],
        };
    },

    componentWillMount: function() {
        const cli = this.props.matrixClient;
        cli.on("deviceVerificationChanged", this._onDeviceVerificationChanged);

        this._updateDeviceList();
    },

    componentWillUnmount: function() {
        var cli = this.props.matrixClient;
        cli.removeListener("deviceVerificationChanged", this._onDeviceVerificationChanged);
    },

    _onDeviceVerificationChanged: function() {
        this._updateDeviceList();
    },

    _updateDeviceList: function() {
        const client = this.props.matrixClient;
        const requests = this.props.room.getKeyRequests();

        const unverifiedOwnDevices = [];

        for (const userId of Object.keys(requests)) {
            // only do our own devices for now.
            if (userId !== client.credentials.userId) {
                continue;
            }

            for (const deviceId of Object.keys(requests[userId])) {
                const dev = client.getStoredDevice(userId, deviceId) || null;

                if (dev && dev.isBlocked()) {
                    // ignore blocked devices
                    continue;
                }

                if (!dev || !dev.isVerified()) {
                    unverifiedOwnDevices.push(deviceId);
                    continue;
                }
            }
        }

        this.setState({unverifiedOwnDevices: unverifiedOwnDevices});
    },

    render: function() {
        let verifyPanel = null;
        if (this.state.unverifiedOwnDevices.length > 0) {
            verifyPanel = <VerifyOwnNewDevicesPanel deviceIds={this.state.unverifiedOwnDevices}/>;
        }

        return (
            <div className='mx_KeyRequestPanel'>
                {verifyPanel}
            </div>
        );
    },
}));
