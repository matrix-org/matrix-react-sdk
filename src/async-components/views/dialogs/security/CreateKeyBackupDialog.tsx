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
    secureSecretStorage: boolean | null;
    phase: Phase;
    passPhrase: string;
    passPhraseValid: boolean;
    passPhraseConfirm: string;
    copied: boolean;
    downloaded: boolean;
    error?: string;
}

/*
 * Walks the user through the process of creating an e2e key backup
 * on the server.
 */
export default class CreateKeyBackupDialog extends React.PureComponent<IProps, IState> {
    public constructor(props: IProps) {
        super(props);

        this.state = {
            secureSecretStorage: null,
            phase: Phase.BackingUp,
            passPhrase: "",
            passPhraseValid: false,
            passPhraseConfirm: "",
            copied: false,
            downloaded: false,
        };
    }

    public async componentDidMount(): Promise<void> {
        const cli = MatrixClientPeg.get();
        const secureSecretStorage = await cli.doesServerSupportUnstableFeature("org.matrix.e2e_cross_signing");
        this.setState({ secureSecretStorage });

        // If we're using secret storage, skip ahead to the backing up step, as
        // `accessSecretStorage` will handle passphrases as needed.
        if (secureSecretStorage) {
            this.setState({ phase: Phase.BackingUp });
            this.createBackup();
        }
    }

    private createBackup = async (): Promise<void> => {
        const { secureSecretStorage } = this.state;
        this.setState({
            phase: Phase.BackingUp,
            error: undefined,
        });
        let info;
        try {
            if (secureSecretStorage) {
                await accessSecretStorage(async (): Promise<void> => {
                    info = await MatrixClientPeg.get().prepareKeyBackupVersion(null /* random key */, {
                        secureSecretStorage: true,
                    });
                    info = await MatrixClientPeg.get().createKeyBackupVersion(info);
                });
            }
            await MatrixClientPeg.get().scheduleAllGroupSessionsForBackup();
            this.setState({
                phase: Phase.Done,
            });
        } catch (e) {
            logger.error("Error creating key backup", e);
            // TODO: If creating a version succeeds, but backup fails, should we
            // delete the version, disable backup, or do nothing?  If we just
            // disable without deleting, we'll enable on next app reload since
            // it is trusted.
            if (info) {
                MatrixClientPeg.get().deleteKeyBackupVersion(info.version);
            }
            this.setState({
                error: e,
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
                <p>{_t("Your keys are being backed up (the first backup could take a few minutes).")}</p>
                <DialogButtons primaryButton={_t("OK")} onPrimaryButtonClick={this.onDone} hasCancel={false} />
            </div>
        );
    }

    private titleForPhase(phase: Phase): string {
        switch (phase) {
            case Phase.BackingUp:
                return _t("Starting backup…");
            case Phase.Done:
                return _t("Success!");
            default:
                return _t("Create key backup");
        }
    }

    public render(): React.ReactNode {
        let content;
        if (this.state.error) {
            content = (
                <div>
                    <p>{_t("Unable to create key backup")}</p>
                    <DialogButtons
                        primaryButton={_t("Retry")}
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
