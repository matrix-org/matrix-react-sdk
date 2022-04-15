/*
Copyright 2018, 2019 New Vector Ltd
Copyright 2019, 2020 The Matrix.org Foundation C.I.C.

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

import React, { createRef } from 'react';
import FileSaver from 'file-saver';
// import { logger } from 'matrix-js-sdk/src/logger';
// import { ISecretStorageKeyInfo } from 'matrix-js-sdk/src/crypto/api';

import { _t } from '../../../languageHandler';
import { copyNode } from "../../../utils/strings";
import { IDialogProps } from "../../../components/views/dialogs/IDialogProps";
import BaseDialog from "../../../components/views/dialogs/BaseDialog";
import DialogButtons from "../../../components/views/elements/DialogButtons";
import { MatrixClientPeg } from '../../../MatrixClientPeg';
import dis from '../../../dispatcher/dispatcher';
import Spinner from '../elements/Spinner';
import QuestionDialog from './QuestionDialog';

enum Phase {
    ShowKey = "show_key",
    KeepItSafe = "keep_it_safe",
    OptOutConfirm = "opt_out_confirm",
}

interface IProps extends IDialogProps {
    noConfirm: boolean;
}

interface IState {
    loading: boolean;
    phase: Phase;
    copied: boolean;
    downloaded: boolean;
    recoveryKey: string | null;
    hasUnsavedRecoveryKey: boolean;
}

export default class LogoutDialog extends React.Component<IProps, IState> {
    private recoveryKeyNode = createRef<HTMLElement>();

    static defaultProps = {
        onFinished: function() {},
    };

    constructor(props: IProps) {
        super(props);

        this.state = {
            loading: true,
            phase: Phase.ShowKey,
            copied: false,
            downloaded: false,
            recoveryKey: null,
            hasUnsavedRecoveryKey: false,
        };
    }

    async componentDidMount() {
        await this.checkRecoveryKeyState();
    }

    private onCopyClick = async (): Promise<void> => {
        const successful = copyNode(this.recoveryKeyNode.current);
        if (successful) {
            this.setState({
                copied: true,
                phase: Phase.KeepItSafe,
            });
        }
    };

    private onDownloadClick = async (): Promise<void> => {
        const blob = new Blob([this.state.recoveryKey], {
            type: 'text/plain;charset=us-ascii',
        });
        FileSaver.saveAs(blob, `${MatrixClientPeg.get().credentials.userId}-recovery-key.txt`);

        this.setState({
            downloaded: true,
            phase: Phase.KeepItSafe,
        });
    };

    private onOptOutConfirm = (): void => {
        this.onFinished(true);
    };

    private onDone = async (): Promise<void> => {
        const cli = MatrixClientPeg.get();
        const { copied, downloaded } = this.state;
        await cli.setAccountData('m.secret_storage.key.export', {
            ts: Date.now(), device: cli.deviceId, copied, downloaded,
        });
        dis.dispatch({ action: 'logout' });
        this.props.onFinished(true);
    };

    private onSetUpClick = (): void => {
        this.setState({ phase: Phase.ShowKey });
    };

    private onKeepItSafeBackClick = (): void => {
        this.setState({
            phase: Phase.ShowKey,
        });
    };

    private renderPhaseShowKey(): JSX.Element {
        return <div>
            <p>{ _t(
                "Your recovery key is a safety net - you can use it to restore " +
                "access to your encrypted messages if you forget you lose access to your devices.",
            ) }</p>
            <p>{ _t(
                "Keep a copy of it somewhere secure, like a password manager or even a safe.",
            ) }</p>
            <div className="mx_CreateKeyBackupDialog_primaryContainer">
                <div className="mx_CreateKeyBackupDialog_recoveryKeyHeader">
                    { _t("Your recovery key") }
                </div>
                <div className="mx_CreateKeyBackupDialog_recoveryKeyContainer">
                    <div className="mx_CreateKeyBackupDialog_recoveryKey">
                        <code ref={this.recoveryKeyNode}>{ this.state.recoveryKey }</code>
                    </div>
                    <div className="mx_CreateKeyBackupDialog_recoveryKeyButtons">
                        <button className="mx_Dialog_primary" onClick={this.onCopyClick}>
                            { _t("Copy") }
                        </button>
                        <button className="mx_Dialog_primary" onClick={this.onDownloadClick}>
                            { _t("Download") }
                        </button>
                    </div>
                </div>
            </div>
        </div>;
    }

    private renderPhaseKeepItSafe(): JSX.Element {
        let introText;
        if (this.state.copied) {
            introText = _t(
                "Your recovery key has been <b>copied to your clipboard</b>, paste it to:",
                {}, { b: s => <b>{ s }</b> },
            );
        } else if (this.state.downloaded) {
            introText = _t(
                "Your recovery key is in your <b>Downloads</b> folder.",
                {}, { b: s => <b>{ s }</b> },
            );
        }
        return <div>
            { introText }
            <ul>
                <li>{ _t("<b>Print it</b> and store it somewhere safe", {}, { b: s => <b>{ s }</b> }) }</li>
                <li>{ _t("<b>Save it</b> on a USB key or backup drive", {}, { b: s => <b>{ s }</b> }) }</li>
                <li>{ _t("<b>Copy it</b> to your personal cloud storage", {}, { b: s => <b>{ s }</b> }) }</li>
            </ul>
            <DialogButtons primaryButton={_t("Continue")}
                onPrimaryButtonClick={this.onDone}
                hasCancel={false}>
                <button onClick={this.onKeepItSafeBackClick}>{ _t("Back") }</button>
            </DialogButtons>
        </div>;
    }

    private renderPhaseOptOutConfirm(): JSX.Element {
        return <div>
            { _t(
                "Without saving your secure messaging recovey key, you won't be able to restore your " +
                "encrypted message history if you log out or use another session.",
            ) }
            <DialogButtons primaryButton={_t('Back')}
                onPrimaryButtonClick={this.onSetUpClick}
                hasCancel={false}
            >
                <button onClick={this.onOptOutConfirm}>I understand, continue</button>
            </DialogButtons>
        </div>;
    }

    private titleForPhase(phase: Phase): string {
        switch (phase) {
            case Phase.OptOutConfirm:
                return _t('Warning!');
            case Phase.ShowKey:
            case Phase.KeepItSafe:
            default:
                return _t('Save your secure messaging recovery key');
        }
    }

    private async checkRecoveryKeyState() {
        const cli = MatrixClientPeg.get();
        const recoveryKey = localStorage.getItem('mx_4s_key');
        const hasUnsavedRecoveryKey = recoveryKey &&
            !(await cli.getAccountDataFromServer('m.secret_storage.key.export'));
        this.setState({ recoveryKey, hasUnsavedRecoveryKey, loading: false });
    }

    private onFinished = (confirmed: boolean): void => {
        if (confirmed) {
            dis.dispatch({ action: 'logout' });
        }
        // close dialog
        this.props.onFinished(confirmed);
    };

    public render(): JSX.Element {
        if (this.state.loading) {
            return (
                <BaseDialog className='mx_CreateKeyBackupDialog'
                    onFinished={this.onFinished}
                    title={_t("Checking secure messaging backup state")}
                >
                    <div>
                        <Spinner />
                    </div>
                </BaseDialog>
            );
        } else if (this.state.hasUnsavedRecoveryKey) {
            let content;
            switch (this.state.phase) {
                case Phase.ShowKey:
                    content = this.renderPhaseShowKey();
                    break;
                case Phase.KeepItSafe:
                    content = this.renderPhaseKeepItSafe();
                    break;
                case Phase.OptOutConfirm:
                    content = this.renderPhaseOptOutConfirm();
                    break;
            }
            return (
                <BaseDialog className='mx_CreateKeyBackupDialog'
                    onFinished={this.props.onFinished}
                    title={this.titleForPhase(this.state.phase)}
                    hasCancel={true}
                >
                    <div>
                        { content }
                    </div>
                </BaseDialog>
            );
        } else if (this.props.noConfirm) {
            // log out without user prompt if they have no local megolm sessions
            dis.dispatch({ action: 'logout' });
        } else {
            return (
                <QuestionDialog
                    hasCancelButton={true}
                    title={_t("Sign out")}
                    description={_t(
                        "Are you sure you want to sign out?",
                    )}
                    button={_t("Sign out")}
                    onFinished={this.onFinished}
                />
            );
        }
    }
}
