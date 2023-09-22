/*
Copyright 2018 New Vector Ltd
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

import React, { ReactNode } from "react";
import { CryptoEvent } from "matrix-js-sdk/src/crypto";
import { logger } from "matrix-js-sdk/src/logger";
import { BackupTrustInfo, KeyBackupInfo } from "matrix-js-sdk/src/crypto-api";

import type CreateKeyBackupDialog from "../../../async-components/views/dialogs/security/CreateKeyBackupDialog";
import { MatrixClientPeg } from "../../../MatrixClientPeg";
import { _t } from "../../../languageHandler";
import Modal from "../../../Modal";
import { isSecureBackupRequired } from "../../../utils/WellKnownUtils";
import Spinner from "../elements/Spinner";
import AccessibleButton from "../elements/AccessibleButton";
import QuestionDialog from "../dialogs/QuestionDialog";
import RestoreKeyBackupDialog from "../dialogs/security/RestoreKeyBackupDialog";
import { accessSecretStorage } from "../../../SecurityManager";
import { SettingsSubsectionText } from "./shared/SettingsSubsection";

interface IState {
    loading: boolean;
    error: boolean;
    backupKeyStored: boolean | null;
    backupKeyCached: boolean | null;
    backupKeyWellFormed: boolean | null;
    secretStorageKeyInAccount: boolean | null;
    secretStorageReady: boolean | null;

    /** Information on the current key backup version, as returned by the server.
     *
     * `null` could mean any of:
     *    * we haven't yet requested the data from the server.
     *    * we were unable to reach the server.
     *    * the server returned key backup version data we didn't understand or was malformed.
     *    * there is actually no backup on the server.
     */
    backupInfo: KeyBackupInfo | null;

    /**
     * Information on whether the backup in `backupInfo` is correctly signed, and whether we have the right key to
     * decrypt it.
     *
     * `undefined` if `backupInfo` is null, or if crypto is not enabled in the client.
     */
    backupTrustInfo: BackupTrustInfo | undefined;

    /**
     * If key backup is currently enabled, the backup version we are backing up to.
     */
    activeBackupVersion: string | null;

    /**
     * Number of sessions remaining to be backed up. `null` if we have no information on this.
     */
    sessionsRemaining: number | null;
}

export default class SecureBackupPanel extends React.PureComponent<{}, IState> {
    private unmounted = false;

    public constructor(props: {}) {
        super(props);

        this.state = {
            loading: true,
            error: false,
            backupKeyStored: null,
            backupKeyCached: null,
            backupKeyWellFormed: null,
            secretStorageKeyInAccount: null,
            secretStorageReady: null,
            backupInfo: null,
            backupTrustInfo: undefined,
            activeBackupVersion: null,
            sessionsRemaining: null,
        };
    }

    public componentDidMount(): void {
        this.loadBackupStatus();

        MatrixClientPeg.safeGet().on(CryptoEvent.KeyBackupStatus, this.onKeyBackupStatus);
        MatrixClientPeg.safeGet().on(CryptoEvent.KeyBackupSessionsRemaining, this.onKeyBackupSessionsRemaining);
    }

    public componentWillUnmount(): void {
        this.unmounted = true;

        if (MatrixClientPeg.get()) {
            MatrixClientPeg.get()!.removeListener(CryptoEvent.KeyBackupStatus, this.onKeyBackupStatus);
            MatrixClientPeg.get()!.removeListener(
                CryptoEvent.KeyBackupSessionsRemaining,
                this.onKeyBackupSessionsRemaining,
            );
        }
    }

    private onKeyBackupSessionsRemaining = (sessionsRemaining: number): void => {
        this.setState({
            sessionsRemaining,
        });
    };

    private onKeyBackupStatus = (): void => {
        // This just loads the current backup status rather than forcing
        // a re-check otherwise we risk causing infinite loops
        this.loadBackupStatus();
    };

    private async loadBackupStatus(): Promise<void> {
        this.setState({ loading: true });
        this.getUpdatedDiagnostics();
        try {
            const cli = MatrixClientPeg.safeGet();
            const backupInfo = await cli.getKeyBackupVersion();
            const backupTrustInfo = backupInfo ? await cli.getCrypto()?.isKeyBackupTrusted(backupInfo) : undefined;

            const activeBackupVersion = (await cli.getCrypto()?.getActiveSessionBackupVersion()) ?? null;

            if (this.unmounted) return;
            this.setState({
                loading: false,
                error: false,
                backupInfo,
                backupTrustInfo,
                activeBackupVersion,
            });
        } catch (e) {
            logger.log("Unable to fetch key backup status", e);
            if (this.unmounted) return;
            this.setState({
                loading: false,
                error: true,
                backupInfo: null,
                backupTrustInfo: undefined,
                activeBackupVersion: null,
            });
        }
    }

    private async getUpdatedDiagnostics(): Promise<void> {
        const cli = MatrixClientPeg.safeGet();
        const crypto = cli.getCrypto();
        if (!crypto) return;

        const secretStorage = cli.secretStorage;

        const backupKeyStored = !!(await cli.isKeyBackupKeyStored());
        const backupKeyFromCache = await crypto.getSessionBackupPrivateKey();
        const backupKeyCached = !!backupKeyFromCache;
        const backupKeyWellFormed = backupKeyFromCache instanceof Uint8Array;
        const secretStorageKeyInAccount = await secretStorage.hasKey();
        const secretStorageReady = await crypto.isSecretStorageReady();

        if (this.unmounted) return;
        this.setState({
            backupKeyStored,
            backupKeyCached,
            backupKeyWellFormed,
            secretStorageKeyInAccount,
            secretStorageReady,
        });
    }

    private startNewBackup = (): void => {
        Modal.createDialogAsync(
            import("../../../async-components/views/dialogs/security/CreateKeyBackupDialog") as unknown as Promise<
                typeof CreateKeyBackupDialog
            >,
            {
                onFinished: () => {
                    this.loadBackupStatus();
                },
            },
            undefined,
            /* priority = */ false,
            /* static = */ true,
        );
    };

    private deleteBackup = (): void => {
        Modal.createDialog(QuestionDialog, {
            title: _t("Delete Backup"),
            description: _t(
                "Are you sure? You will lose your encrypted messages if your keys are not backed up properly.",
            ),
            button: _t("Delete Backup"),
            danger: true,
            onFinished: (proceed) => {
                if (!proceed) return;
                this.setState({ loading: true });
                const versionToDelete = this.state.backupInfo!.version!;
                MatrixClientPeg.safeGet()
                    .getCrypto()
                    ?.deleteKeyBackupVersion(versionToDelete)
                    .then(() => {
                        this.loadBackupStatus();
                    });
            },
        });
    };

    private restoreBackup = async (): Promise<void> => {
        Modal.createDialog(RestoreKeyBackupDialog, undefined, undefined, /* priority = */ false, /* static = */ true);
    };

    private resetSecretStorage = async (): Promise<void> => {
        this.setState({ error: false });
        try {
            await accessSecretStorage(async (): Promise<void> => {}, /* forceReset = */ true);
        } catch (e) {
            logger.error("Error resetting secret storage", e);
            if (this.unmounted) return;
            this.setState({ error: true });
        }
        if (this.unmounted) return;
        this.loadBackupStatus();
    };

    public render(): React.ReactNode {
        const {
            loading,
            error,
            backupKeyStored,
            backupKeyCached,
            backupKeyWellFormed,
            secretStorageKeyInAccount,
            secretStorageReady,
            backupInfo,
            backupTrustInfo,
            sessionsRemaining,
        } = this.state;

        let statusDescription: JSX.Element;
        let extraDetailsTableRows: JSX.Element | undefined;
        let extraDetails: JSX.Element | undefined;
        const actions: JSX.Element[] = [];
        if (error) {
            statusDescription = (
                <SettingsSubsectionText className="error">
                    {_t("Unable to load key backup status")}
                </SettingsSubsectionText>
            );
        } else if (loading) {
            statusDescription = <Spinner />;
        } else if (backupInfo) {
            let restoreButtonCaption = _t("Restore from Backup");

            if (this.state.activeBackupVersion !== null) {
                statusDescription = (
                    <SettingsSubsectionText>✅ {_t("This session is backing up your keys.")}</SettingsSubsectionText>
                );
            } else {
                statusDescription = (
                    <>
                        <SettingsSubsectionText>
                            {_t(
                                "This session is <b>not backing up your keys</b>, but you do have an existing backup you can restore from and add to going forward.",
                                {},
                                { b: (sub) => <b>{sub}</b> },
                            )}
                        </SettingsSubsectionText>
                        <SettingsSubsectionText>
                            {_t(
                                "Connect this session to key backup before signing out to avoid losing any keys that may only be on this session.",
                            )}
                        </SettingsSubsectionText>
                    </>
                );
                restoreButtonCaption = _t("Connect this session to Key Backup");
            }

            let uploadStatus: ReactNode;
            if (sessionsRemaining === null) {
                // No upload status to show when backup disabled.
                uploadStatus = "";
            } else if (sessionsRemaining > 0) {
                uploadStatus = (
                    <div>
                        {_t("Backing up %(sessionsRemaining)s keys…", { sessionsRemaining })} <br />
                    </div>
                );
            } else {
                uploadStatus = (
                    <div>
                        {_t("All keys backed up")} <br />
                    </div>
                );
            }

            let trustedLocally: string | undefined;
            if (backupTrustInfo?.matchesDecryptionKey) {
                trustedLocally = _t("This backup can be restored on this session");
            }

            extraDetailsTableRows = (
                <>
                    <tr>
                        <th scope="row">{_t("Latest backup version on server:")}</th>
                        <td>
                            {backupInfo.version} ({_t("Algorithm:")} <code>{backupInfo.algorithm}</code>)
                        </td>
                    </tr>
                    <tr>
                        <th scope="row">{_t("Active backup version:")}</th>
                        <td>{this.state.activeBackupVersion === null ? _t("None") : this.state.activeBackupVersion}</td>
                    </tr>
                </>
            );

            extraDetails = (
                <>
                    {uploadStatus}
                    <div>{trustedLocally}</div>
                </>
            );

            actions.push(
                <AccessibleButton key="restore" kind="primary" onClick={this.restoreBackup}>
                    {restoreButtonCaption}
                </AccessibleButton>,
            );

            if (!isSecureBackupRequired(MatrixClientPeg.safeGet())) {
                actions.push(
                    <AccessibleButton key="delete" kind="danger" onClick={this.deleteBackup}>
                        {_t("Delete Backup")}
                    </AccessibleButton>,
                );
            }
        } else {
            statusDescription = (
                <>
                    <SettingsSubsectionText>
                        {_t(
                            "Your keys are <b>not being backed up from this session</b>.",
                            {},
                            { b: (sub) => <b>{sub}</b> },
                        )}
                    </SettingsSubsectionText>
                    <SettingsSubsectionText>
                        {_t("Back up your keys before signing out to avoid losing them.")}
                    </SettingsSubsectionText>
                </>
            );
            actions.push(
                <AccessibleButton key="setup" kind="primary" onClick={this.startNewBackup}>
                    {_t("Set up")}
                </AccessibleButton>,
            );
        }

        if (secretStorageKeyInAccount) {
            actions.push(
                <AccessibleButton key="reset" kind="danger" onClick={this.resetSecretStorage}>
                    {_t("action|reset")}
                </AccessibleButton>,
            );
        }

        let backupKeyWellFormedText = "";
        if (backupKeyCached) {
            backupKeyWellFormedText = ", ";
            if (backupKeyWellFormed) {
                backupKeyWellFormedText += _t("well formed");
            } else {
                backupKeyWellFormedText += _t("unexpected type");
            }
        }

        let actionRow: JSX.Element | undefined;
        if (actions.length) {
            actionRow = <div className="mx_SecureBackupPanel_buttonRow">{actions}</div>;
        }

        return (
            <>
                <SettingsSubsectionText>
                    {_t(
                        "Back up your encryption keys with your account data in case you lose access to your sessions. Your keys will be secured with a unique Security Key.",
                    )}
                </SettingsSubsectionText>
                {statusDescription}
                <details>
                    <summary>{_t("Advanced")}</summary>
                    <table className="mx_SecureBackupPanel_statusList">
                        <tr>
                            <th scope="row">{_t("Backup key stored:")}</th>
                            <td>
                                {backupKeyStored === true
                                    ? _t("settings|security|cross_signing_in_4s")
                                    : _t("not stored")}
                            </td>
                        </tr>
                        <tr>
                            <th scope="row">{_t("Backup key cached:")}</th>
                            <td>
                                {backupKeyCached
                                    ? _t("settings|security|cross_signing_cached")
                                    : _t("settings|security|cross_signing_not_cached")}
                                {backupKeyWellFormedText}
                            </td>
                        </tr>
                        <tr>
                            <th scope="row">{_t("Secret storage public key:")}</th>
                            <td>
                                {secretStorageKeyInAccount
                                    ? _t("in account data")
                                    : _t("settings|security|cross_signing_not_found")}
                            </td>
                        </tr>
                        <tr>
                            <th scope="row">{_t("Secret storage:")}</th>
                            <td>{secretStorageReady ? _t("ready") : _t("not ready")}</td>
                        </tr>
                        {extraDetailsTableRows}
                    </table>
                    {extraDetails}
                </details>
                {actionRow}
            </>
        );
    }
}
