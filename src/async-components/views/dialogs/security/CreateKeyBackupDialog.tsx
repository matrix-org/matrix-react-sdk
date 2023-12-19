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

import React from "react";
import { logger } from "matrix-js-sdk/src/logger";

import { MatrixClientPeg } from "../../../../MatrixClientPeg";
import { _t } from "../../../../languageHandler";
import { accessSecretStorage } from "../../../../SecurityManager";
import Spinner from "../../../../components/views/elements/Spinner";
import BaseDialog from "../../../../components/views/dialogs/BaseDialog";
import DialogButtons from "../../../../components/views/elements/DialogButtons";

enum Phase {
    BackingUp = "backing_up",
    Done = "done",
}

interface IProps {
    onFinished(done?: boolean): void;
}

interface IState {
    phase: Phase;
    passPhrase: string;
    passPhraseValid: boolean;
    passPhraseConfirm: string;
    copied: boolean;
    downloaded: boolean;
    error?: boolean;
}

/**
 * Walks the user through the process of setting up e2e key backups to a new backup, and storing the decryption key in
 * SSSS.
 *
 * Uses {@link accessSecretStorage}, which means that if 4S is not already configured, it will be bootstrapped (which
 * involves displaying an {@link CreateSecretStorageDialog} so the user can enter a passphrase and/or download the 4S
 * key).
 */
export default class CreateKeyBackupDialog extends React.PureComponent<IProps, IState> {
    public constructor(props: IProps) {
        super(props);

        this.state = {
            phase: Phase.BackingUp,
            passPhrase: "",
            passPhraseValid: false,
            passPhraseConfirm: "",
            copied: false,
            downloaded: false,
        };
    }

    public componentDidMount(): void {
        this.createBackup();
    }

    private createBackup = async (): Promise<void> => {
        this.setState({
            error: undefined,
        });
        const cli = MatrixClientPeg.safeGet();
        try {
            // We don't want accessSecretStorage to create a backup for us - we
            // will create one ourselves in the closure we pass in by calling
            // resetKeyBackup.
            const setupNewKeyBackup = false;
            const forceReset = false;

            await accessSecretStorage(
                async (): Promise<void> => {
                    const crypto = cli.getCrypto();
                    if (!crypto) {
                        throw new Error("End-to-end encryption is disabled - unable to create backup.");
                    }
                    await crypto.resetKeyBackup();
                },
                forceReset,
                setupNewKeyBackup,
            );
            this.setState({
                phase: Phase.Done,
            });
        } catch (e) {
            logger.error("Error creating key backup", e);
            // TODO: If creating a version succeeds, but backup fails, should we
            // delete the version, disable backup, or do nothing?  If we just
            // disable without deleting, we'll enable on next app reload since
            // it is trusted.
            this.setState({
                error: true,
            });
        }
    };

    private onCancel = (): void => {
        this.props.onFinished(false);
    };

    private onDone = (): void => {
        this.props.onFinished(true);
    };

    private renderBusyPhase(): JSX.Element {
        return (
            <div>
                <Spinner />
            </div>
        );
    }

    private renderPhaseDone(): JSX.Element {
        return (
            <div>
                <p>{_t("settings|key_backup|backup_in_progress")}</p>
                <DialogButtons primaryButton={_t("action|ok")} onPrimaryButtonClick={this.onDone} hasCancel={false} />
            </div>
        );
    }

    private titleForPhase(phase: Phase): string {
        switch (phase) {
            case Phase.BackingUp:
                return _t("settings|key_backup|backup_starting");
            case Phase.Done:
                return _t("settings|key_backup|backup_success");
            default:
                return _t("settings|key_backup|create_title");
        }
    }

    public render(): React.ReactNode {
        let content;
        if (this.state.error) {
            content = (
                <div>
                    <p>{_t("settings|key_backup|cannot_create_backup")}</p>
                    <DialogButtons
                        primaryButton={_t("action|retry")}
                        onPrimaryButtonClick={this.createBackup}
                        hasCancel={true}
                        onCancel={this.onCancel}
                    />
                </div>
            );
        } else {
            switch (this.state.phase) {
                case Phase.BackingUp:
                    content = this.renderBusyPhase();
                    break;
                case Phase.Done:
                    content = this.renderPhaseDone();
                    break;
            }
        }

        return (
            <BaseDialog
                className="mx_CreateKeyBackupDialog"
                onFinished={this.props.onFinished}
                title={this.titleForPhase(this.state.phase)}
                hasCancel={[Phase.Done].includes(this.state.phase)}
            >
                <div>{content}</div>
            </BaseDialog>
        );
    }
}
