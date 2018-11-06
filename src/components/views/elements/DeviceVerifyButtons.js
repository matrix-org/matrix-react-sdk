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
import PropTypes from 'prop-types';
import MatrixClientPeg from '../../../MatrixClientPeg';
import sdk from '../../../index';
import Modal from '../../../Modal';
import { _t } from '../../../languageHandler';

export default React.createClass({
    displayName: 'DeviceVerifyButtons',

    propTypes: {
        userId: PropTypes.string.isRequired,
        device: PropTypes.object.isRequired,
    },

    getInitialState: function() {
        return {
            device: this.props.device,
        };
    },

    componentWillMount: function() {
        const cli = MatrixClientPeg.get();
        cli.on("deviceVerificationChanged", this.onDeviceVerificationChanged);
    },

    componentWillUnmount: function() {
        const cli = MatrixClientPeg.get();
        cli.removeListener("deviceVerificationChanged", this.onDeviceVerificationChanged);
    },

    onDeviceVerificationChanged: function(userId, deviceId, deviceInfo) {
        if (userId === this.props.userId && deviceId === this.props.device.deviceId) {
            this.setState({ device: deviceInfo });
        }
    },

    onVerifyClick: function() {
        const DeviceVerifyDialog = sdk.getComponent('views.dialogs.DeviceVerifyDialog');
        Modal.createTrackedDialog('Device Verify Dialog', '', DeviceVerifyDialog, {
            userId: this.props.userId,
            device: this.state.device,
        });
    },

    onUnverifyClick: function() {
        MatrixClientPeg.get().setDeviceVerified(
            this.props.userId, this.state.device.deviceId, false,
        );
    },

    onBlacklistClick: function() {
        MatrixClientPeg.get().setDeviceBlocked(
            this.props.userId, this.state.device.deviceId, true,
        );
    },

    onUnblacklistClick: function() {
        MatrixClientPeg.get().setDeviceBlocked(
            this.props.userId, this.state.device.deviceId, false,
        );
    },

    render: function() {
        let blacklistButton = null; let verifyButton = null;

        if (this.state.device.isBlocked()) {
            blacklistButton = (
                <button className="mx_MemberDeviceInfo_textButton mx_MemberDeviceInfo_unblacklist"
                  onClick={this.onUnblacklistClick}>
                    { _t("Unblacklist") }
                </button>
            );
        } else {
            blacklistButton = (
                <button className="mx_MemberDeviceInfo_textButton mx_MemberDeviceInfo_blacklist"
                  onClick={this.onBlacklistClick}>
                    { _t("Blacklist") }
                </button>
            );
        }

        if (this.state.device.isVerified()) {
            verifyButton = (
                <button className="mx_MemberDeviceInfo_textButton mx_MemberDeviceInfo_unverify"
                  onClick={this.onUnverifyClick}>
                    { _t("Unverify") }
                </button>
            );
        } else {
            verifyButton = (
                <button className="mx_MemberDeviceInfo_textButton mx_MemberDeviceInfo_verify"
                  onClick={this.onVerifyClick}>
                    { _t("Verify...") }
                </button>
            );
        }

        // mx_MemberDeviceInfo because the vector's CSS on EncryptedEventDialog is awful
        return (
            <div className="mx_MemberDeviceInfo mx_DeviceVerifyButtons" >
                { verifyButton }
                { blacklistButton }
            </div>
        );
    },
});
