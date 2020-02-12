/*
Copyright 2019 The Matrix.org Foundation C.I.C.

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
import * as sdk from "../../../index";
import { _t } from '../../../languageHandler';
import {MatrixClientPeg} from '../../../MatrixClientPeg';
import {RIGHT_PANEL_PHASES} from "../../../stores/RightPanelStorePhases";
import {userLabelForEventRoom} from "../../../utils/KeyVerificationStateObserver";
import dis from "../../../dispatcher";
import ToastStore from "../../../stores/ToastStore";
import Modal from "../../../Modal";

export default class VerificationRequestToast extends React.PureComponent {
    constructor(props) {
        super(props);
        this.state = {counter: Math.ceil(props.request.timeout / 1000)};
    }

    componentDidMount() {
        const {request} = this.props;
        if (request.timeout && request.timeout > 0) {
            this._intervalHandle = setInterval(() => {
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
    }

    componentWillUnmount() {
        clearInterval(this._intervalHandle);
        const {request} = this.props;
        request.off("change", this._checkRequestIsPending);
    }

    _checkRequestIsPending = () => {
        const {request} = this.props;
        if (request.ready || request.done || request.cancelled || request.observeOnly) {
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
    }

    accept = async () => {
        ToastStore.sharedInstance().dismissToast(this.props.toastKey);
        const {request} = this.props;
        // no room id for to_device requests
        const cli = MatrixClientPeg.get();
        try {
            await request.accept();
            if (request.channel.roomId) {
                dis.dispatch({
                    action: 'view_room',
                    room_id: request.channel.roomId,
                    should_peek: false,
                });
                dis.dispatch({
                    action: "set_right_panel_phase",
                    phase: RIGHT_PANEL_PHASES.EncryptionPanel,
                    refireParams: {
                        verificationRequest: request,
                        member: cli.getUser(request.otherUserId),
                    },
                });
            } else {
                const VerificationRequestDialog = sdk.getComponent("views.dialogs.VerificationRequestDialog");
                Modal.createTrackedDialog('Incoming Verification', '', VerificationRequestDialog, {
                    verificationRequest: request,
                }, null, /* priority = */ false, /* static = */ true);
            }
        } catch (err) {
            console.error(err.message);
        }
    };

    render() {
        const FormButton = sdk.getComponent("elements.FormButton");
        const {request} = this.props;
        const userId = request.otherUserId;
        const roomId = request.channel.roomId;
        let nameLabel = roomId ? userLabelForEventRoom(userId, roomId) : userId;
        // for legacy to_device verification requests
        if (nameLabel === userId) {
            const client = MatrixClientPeg.get();
            const user = client.getUser(userId);
            if (user && user.displayName) {
                nameLabel = _t("%(name)s (%(userId)s)", {name: user.displayName, userId});
            }
        }
        const declineLabel = this.state.counter == 0 ?
            _t("Decline") :
            _t("Decline (%(counter)s)", {counter: this.state.counter});
        return (<div>
            <div className="mx_Toast_description">{nameLabel}</div>
            <div className="mx_Toast_buttons" aria-live="off">
                <FormButton label={declineLabel} kind="danger" onClick={this.cancel} />
                <FormButton label={_t("Accept")} onClick={this.accept} />
            </div>
        </div>);
    }
}

VerificationRequestToast.propTypes = {
    request: PropTypes.object.isRequired,
    toastKey: PropTypes.string.isRequired,
};
