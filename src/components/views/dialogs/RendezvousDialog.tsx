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

import { _t } from "../../../languageHandler";
import BaseDialog from "./BaseDialog";
import { IDialogProps } from "./IDialogProps";
import AccessibleButton from '../elements/AccessibleButton';
import { Rendezvous, RendezvousCancellationReason } from '../../../utils/Rendezvous';
import { MatrixClientPeg } from '../../../MatrixClientPeg';
import Field from '../elements/Field';
import QRCode from '../elements/QRCode';
import defaultDispatcher from '../../../dispatcher/dispatcher';
import { Action } from '../../../dispatcher/actions';

interface IProps extends IDialogProps {
    device: 'new' | 'existing';
}

interface IState {
    pastedRendezvous: string;
    generatedRendezvous: string;
    rendezvous?: Rendezvous;
    confirmationDigits?: string;
    cancelled?: RendezvousCancellationReason;
}

export default class RendezvousDialog extends React.Component<IProps, IState> {
    constructor(props) {
        super(props);

        this.state = {
            pastedRendezvous: "",
            generatedRendezvous: "",
        };

        if (this.props.device === 'new') {
            void this.generateRendezvous();
        }
    }

    private onPastedRendezvousChange = ev => {
        this.doPastedRendezvous(ev.target.value);
    };

    private approveLogin = async (): Promise<void> => {
        if (!this.state.rendezvous) {
            throw new Error('Rendezvous not found');
        }
        const newDeviceId = await this.state.rendezvous.confirmLoginOnExistingDevice();
        if (!newDeviceId) {
            // user denied
            return;
        }
        const cli = MatrixClientPeg.get();
        if (!cli.crypto) {
            alert(`New device signed in: ${newDeviceId}. Not signing cross-signing as no crypto setup`);
            this.props.onFinished(true);
            return;
        }
        const didCrossSign = await this.state.rendezvous!.crossSign();
        if (didCrossSign) {
            alert(`New device signed in, cross signed and marked as known: ${newDeviceId}`);
        } else {
            alert(`New device signed in, but no keys received for cross signing: ${newDeviceId}`);
        }
        this.props.onFinished(true);
    };

    private generateRendezvous = async () => {
        try {
            const rendezvous = new Rendezvous(this.props.device === 'existing' ? MatrixClientPeg.get() : undefined);
            rendezvous.onConfirmationDigits = this.onConfirmationDigits;
            rendezvous.onCancelled = this.onCancelled;
            const generatedRendezvous = await rendezvous.generateCode();
            this.setState({
                rendezvous,
                generatedRendezvous,
                cancelled: undefined,
            });
            if (this.props.device === 'existing') {
                await rendezvous.startOnExistingDevice();
            } else {
                const res = await rendezvous.completeOnNewDevice();
                if (res) {
                    this.props.onFinished(true);
                    defaultDispatcher.dispatch({
                        action: Action.ViewHomePage,
                    });
                }
            }
        } catch (e) {
            alert(e);
        }
    };

    private onConfirmationDigits = (confirmationDigits: string) => {
        this.setState({ confirmationDigits });
    };

    private onCancelled = (reason: RendezvousCancellationReason) => {
        this.setState({ cancelled: reason });
    };

    reset() {
        this.setState({
            pastedRendezvous: "",
            generatedRendezvous: "",
            rendezvous: undefined,
            confirmationDigits: undefined,
            cancelled: undefined,
        });
    }

    private doPastedRendezvous = async (pastedRendezvous: string) => {
        try {
            const rendezvous = new Rendezvous(this.props.device === 'existing' ? MatrixClientPeg.get() : undefined, pastedRendezvous);
            rendezvous.onConfirmationDigits = this.onConfirmationDigits;
            rendezvous.onCancelled = this.onCancelled;
            this.setState({
                pastedRendezvous,
                rendezvous,
                cancelled: undefined,
            });
            if (this.props.device === 'existing') {
                await rendezvous.startOnExistingDevice();
            } else {
                const res = await rendezvous.completeOnNewDevice();
                if (res) {
                    this.props.onFinished(true);
                    defaultDispatcher.dispatch({
                        action: Action.ViewHomePage,
                    });
                }
            }
        } catch (e) {
            alert(e);
        }
    };

    private cancel = () => {
        if (this.state.rendezvous) {
            if (this.state.confirmationDigits) {
                if (this.props.device === 'existing') {
                    void this.state.rendezvous.declineLoginOnExistingDevice();
                }
            }
            void this.state.rendezvous.userCancelled();
            this.reset();
        }
    };

    private tryAgain = () => {
        if (this.state.generatedRendezvous) {
            this.reset();
            void this.generateRendezvous();
        } else {
            this.reset();
        }
    };

    render() {
        let pasted;
        let generated;
        let confirm;
        let cancelled;

        if (this.state.cancelled) {
            let cancellationMessage: string;
            switch (this.state.cancelled) {
                case RendezvousCancellationReason.Expired:
                    cancellationMessage = _t("The linking wasn't completed in the required time.");
                    break;
                case RendezvousCancellationReason.UserDeclined:
                    cancellationMessage = _t("The request was declined on the other device.");
                    break;
                case RendezvousCancellationReason.OtherDeviceAlreadySignedIn:
                    cancellationMessage = _t("The other device is already signed in.");
                    break;
                case RendezvousCancellationReason.OtherDeviceNotSignedIn:
                    cancellationMessage = _t("The other device isn't signed in.");
                    break;
                case RendezvousCancellationReason.UserCancelled:
                    cancellationMessage = _t("The request was cancelled.");
                    break;
            }
            cancelled = <div>
                <div className="mx_Centre">
                    <p>{ cancellationMessage }</p>
                </div>
                <div className="mx_Centre">
                    <AccessibleButton
                        kind="primary"
                        onClick={this.tryAgain}
                    >
                        { _t("Try again") }
                    </AccessibleButton>
                </div>
            </div>;
        } else {
            if (!this.state.generatedRendezvous && !this.state.confirmationDigits) {
                pasted = <div>
                    <p>{ _t("Use your camera to scan the QR code shown on your other device:") }</p>
                    <div className="mx_Centre">
                        <div className="mx_MockCamera" />
                    </div>
                    <p>{ _t("The camera interaction isn't implemented in this prototype. Instead, please copy and paste the rendezvous code from the other device in the box below below:") }</p>
                    <Field
                        type="text"
                        element="textarea"
                        autoComplete="off"
                        value={this.state.pastedRendezvous}
                        onChange={this.onPastedRendezvousChange}
                    />
                </div>;
            }

            if (!this.state.pastedRendezvous && !this.state.confirmationDigits) {
                generated = <div>
                    { this.state.generatedRendezvous ?
                        <div>
                            <p>{ _t("Scan this QR code using your other device:") }</p>
                            <div>
                                <div className="mx_Centre">
                                    <QRCode data={this.state.generatedRendezvous} className="mx_QRCode" />
                                </div>
                                <p>{ _t("The camera interaction isn't implemented in this prototype. Instead, please copy and paste the code below into the other device:") }</p>
                                <Field
                                    type="text"
                                    element="textarea"
                                    autoComplete="off"
                                    value={this.state.generatedRendezvous}
                                    readOnly={true}
                                    onClick={(e) => (e.target as any).select()}
                                />
                                <div className="mx_Centre">
                                    { this.props.device === 'new' ?
                                        <AccessibleButton
                                            kind="primary"
                                            onClick={this.cancel}
                                        >
                                            { _t("Scan using this device instead") }
                                        </AccessibleButton>
                                        :
                                        <AccessibleButton
                                            kind="danger_outline"
                                            onClick={this.cancel}
                                        >
                                            { _t("Cancel") }
                                        </AccessibleButton>
                                    }
                                </div>
                            </div>
                        </div>
                        :
                        <div className="mx_Centre">
                            <AccessibleButton
                                kind="primary"
                                onClick={this.generateRendezvous}
                            >
                                { _t("Show code on this device instead") }
                            </AccessibleButton>
                        </div>
                    }
                </div>;
            }

            if (this.state.confirmationDigits) {
                confirm =
                <div>
                    <p>Secure connection established.</p>
                    <p>The code { this.state.confirmationDigits } should be displayed on the other device.</p>
                    { this.props.device === 'existing' ?
                        <div>
                            Do you want to sign it in?
                            <div className="mx_Centre">
                                <AccessibleButton
                                    kind="primary"
                                    onClick={this.approveLogin}
                                >
                                    { _t("Confirm") }
                                </AccessibleButton>
                                <AccessibleButton
                                    kind="danger_outline"
                                    onClick={this.cancel}
                                >
                                    { _t("Cancel") }
                                </AccessibleButton>
                            </div>
                        </div>
                        :
                        <div className="mx_Centre">
                            <AccessibleButton
                                kind="danger_outline"
                                onClick={this.cancel}
                            >
                                { _t("Cancel") }
                            </AccessibleButton>
                        </div>
                    }
                </div>;
            }
        }

        const title = this.props.device === 'existing' ? _t("Link another device") : _t("Sign in using another device");

        return (
            <BaseDialog
                // hasCancel={true}
                onFinished={this.props.onFinished}
                title={title}
                className="mx_RendezvousDialog"
                contentId="mx_RendezvousDevice"
            >
                { cancelled }
                { confirm }
                { pasted }
                { generated }
            </BaseDialog>
        );
    }
}
