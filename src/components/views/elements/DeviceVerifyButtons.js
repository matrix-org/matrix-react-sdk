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

import React from 'react';
import sdk from '../../../index';
import verifyDevice from '../../../utils/verifyDevice';
import WithMatrixClient from '../../../wrappers/WithMatrixClient';

export default WithMatrixClient(React.createClass({
    displayName: 'DeviceVerifyButtons',

    propTypes: {
        matrixClient: React.PropTypes.object.isRequired,
        userId: React.PropTypes.string.isRequired,
        device: React.PropTypes.object.isRequired,
    },

    onVerifyClick: function() {
        verifyDevice(this.props.matrixClient, this.props.userId, this.props.device);
    },

    onUnverifyClick: function() {
        this.props.matrixClient.setDeviceVerified(
            this.props.userId, this.props.device.deviceId, false
        );
    },

    onBlockClick: function() {
        this.props.matrixClient.setDeviceBlocked(
            this.props.userId, this.props.device.deviceId, true
        );
    },

    onUnblockClick: function() {
        this.props.matrixClient.setDeviceBlocked(
            this.props.userId, this.props.device.deviceId, false
        );
    },

    render: function() {
        var blockButton = null, verifyButton = null;

        if (this.props.device.isBlocked()) {
            blockButton = (
                <button className="mx_MemberDeviceInfo_textButton mx_MemberDeviceInfo_unblock"
                  onClick={this.onUnblockClick}>
                    Unblock
                </button>
            );
        } else {
            blockButton = (
                <button className="mx_MemberDeviceInfo_textButton mx_MemberDeviceInfo_block"
                  onClick={this.onBlockClick}>
                    Block
                </button>
            );
        }

        if (this.props.device.isVerified()) {
            verifyButton = (
                <button className="mx_MemberDeviceInfo_textButton mx_MemberDeviceInfo_unverify"
                  onClick={this.onUnverifyClick}>
                    Unverify
                </button>
            );
        } else {
            verifyButton = (
                <button className="mx_MemberDeviceInfo_textButton mx_MemberDeviceInfo_verify"
                  onClick={this.onVerifyClick}>
                    Verify
                </button>
            );
        }

        // mx_MemberDeviceInfo because the vector's CSS on EncryptedEventDialog is awful
        return (
            <div className="mx_MemberDeviceInfo mx_DeviceVerifyButtons" >
                { verifyButton }
                { blockButton }
            </div>
        );
    },
}));
