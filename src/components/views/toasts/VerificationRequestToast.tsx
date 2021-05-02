/*
Copyright 2019-2021 The Matrix.org Foundation C.I.C.

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

import React from "react";

import * as sdk from "../../../index";
import { _t } from '../../../languageHandler';
import {MatrixClientPeg} from '../../../MatrixClientPeg';
import {RightPanelPhases} from "../../../stores/RightPanelStorePhases";
import {SetRightPanelPhasePayload} from "../../../dispatcher/payloads/SetRightPanelPhasePayload"
import {userLabelForEventRoom} from "../../../utils/KeyVerificationStateObserver";
import dis from "../../../dispatcher/dispatcher";
import ToastStore from "../../../stores/ToastStore";
import Modal from "../../../Modal";
import GenericToast from "./GenericToast";
import {VerificationRequest} from "matrix-js-sdk/src/crypto/verification/request/VerificationRequest";
import {DeviceInfo} from "matrix-js-sdk/src/crypto/deviceinfo";
import {Action} from "../../../dispatcher/actions";
import {replaceableComponent} from "../../../utils/replaceableComponent";

interface IProps {
    toastKey: string;
    request: VerificationRequest;
}

interface IState {
    counter: number;
    device?: DeviceInfo;
    ip?: string;
}

@replaceableComponent("views.toasts.VerificationRequestToast")
export default class VerificationRequestToast extends React.PureComponent<IProps, IState> {
    private intervalHandle: NodeJS.Timeout;

    constructor(props) {
        super(props);
        this.state = {counter: Math.ceil(props.request.timeout / 1000)};
    }

    async componentDidMount() {
        const {request} = this.props;
        if (request.timeout && request.timeout > 0) {
            this.intervalHandle = setInterval(() => {
                let {counter} = this.state;
                counter = Math.max(0, counter - 1);
                this.setState({counter});
            }, 1000);
        }
        request.on("change", this._checkRequestIsPending);
        // We should probably have a separate class managing the active verification toasts,
        // rather than monitoring this in the toast component itself, since we'll get problems
        // like the toasdt not going away when the verification is cancelled unless it's the
        // one on the top (ie. the one that's mounted).
        // As a quick & dirty fix, check the toast is still relevant when it mounts (this prevents
        // a toast hanging around after logging in if you did a verification as part of login).
        this._checkRequestIsPending();


        if (request.isSelfVerification) {
            const cli = MatrixClientPeg.get();
            const device = await cli.getDevice(request.channel.deviceId);
            const ip = device.last_seen_ip;
            this.setState({
                device: cli.getStoredDevice(cli.getUserId(), request.channel.deviceId),
                ip,
            });
        }
    }

    componentWillUnmount() {
        clearInterval(this.intervalHandle);
        const {request} = this.props;
        request.off("change", this._checkRequestIsPending);
    }

    _checkRequestIsPending = () => {
        const {request} = this.props;
        if (!request.canAccept) {
            ToastStore.sharedInstance().dismissToast(this.props.toastKey);
        }
    };

    cancel = () => {
        ToastStore.sharedInstance().dismissToast(this.props.toastKey);
        try {
            this.props.request.cancel();
        } catch (err) {
            console.error("Error while cancelling verification request", err);
        }
    };

    accept = async () => {
        ToastStore.sharedInstance().dismissToast(this.props.toastKey);
        const {request} = this.props;
        // no room id for to_device requests
        const cli = MatrixClientPeg.get();
        try {
            if (request.channel.roomId) {
                dis.dispatch({
                    action: 'view_room',
                    room_id: request.channel.roomId,
                    should_peek: false,
                });
                dis.dispatch<SetRightPanelPhasePayload>({
                    action: Action.SetRightPanelPhase,
                    phase: RightPanelPhases.EncryptionPanel,
                    refireParams: {
                        verificationRequest: request,
                        member: cli.getUser(request.otherUserId),
                    },
                });
            } else {
                const VerificationRequestDialog = sdk.getComponent("views.dialogs.VerificationRequestDialog");
                Modal.createTrackedDialog('Incoming Verification', '', VerificationRequestDialog, {
                    verificationRequest: request,
                    onFinished: () => {
                        request.cancel();
                    },
                }, null, /* priority = */ false, /* static = */ true);
            }
            await request.accept();
        } catch (err) {
            console.error(err.message);
        }
    };

    render() {
        const {request} = this.props;
        let description;
        let detail;
        if (request.isSelfVerification) {
            if (this.state.device) {
                description = this.state.device.getDisplayName();
                detail = _t("%(deviceId)s from %(ip)s", {
                    deviceId: this.state.device.deviceId,
                    ip: this.state.ip,
                });
            }
        } else {
            const userId = request.otherUserId;
            const roomId = request.channel.roomId;
            description = roomId ? userLabelForEventRoom(userId, roomId) : userId;
            // for legacy to_device verification requests
            if (description === userId) {
                const client = MatrixClientPeg.get();
                const user = client.getUser(userId);
                if (user && user.displayName) {
                    description = _t("%(name)s (%(userId)s)", {name: user.displayName, userId});
                }
            }
        }
        const declineLabel = this.state.counter === 0 ?
            _t("Decline") :
            _t("Decline (%(counter)s)", {counter: this.state.counter});

        return <GenericToast
            description={description}
            detail={detail}
            acceptLabel={_t("Accept")}
            onAccept={this.accept}
            rejectLabel={declineLabel}
            onReject={this.cancel}
        />;
    }
}
