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
import { IKeyBackupInfo } from "matrix-js-sdk/src/crypto/keybackup";
import { TrustInfo } from "matrix-js-sdk/src/crypto/backup";
import { IRecoveryKey } from "matrix-js-sdk/src/crypto/api";
import * as sdk from '../../../../index';
import { MatrixClientPeg } from '../../../../MatrixClientPeg';
import FileSaver from 'file-saver';
import { _t, _td } from '../../../../languageHandler';
import Modal from '../../../../Modal';
import { promptForBackupPassphrase } from '../../../../SecurityManager';
import { copyNode } from "../../../../utils/strings";
import { SSOAuthEntry } from "../../../../components/views/auth/InteractiveAuthEntryComponents";
import PassphraseField from "../../../../components/views/auth/PassphraseField";
import StyledRadioButton from '../../../../components/views/elements/StyledRadioButton';
import AccessibleButton from "../../../../components/views/elements/AccessibleButton";
import DialogButtons from "../../../../components/views/elements/DialogButtons";
import InlineSpinner from "../../../../components/views/elements/InlineSpinner";
import RestoreKeyBackupDialog from "../../../../components/views/dialogs/security/RestoreKeyBackupDialog";
import {
    getSecureBackupSetupMethods,
    isSecureBackupRequired,
    SecureBackupSetupMethod,
} from '../../../../utils/WellKnownUtils';
import SecurityCustomisations from "../../../../customisations/Security";
import { IValidationResult } from '../../../../components/views/elements/Validation';
import Field from '../../../../components/views/elements/Field';

enum CreateSecretStoragePhases {
    Loading = 0,
    LoadError = 1,
    ChooseKeyPassphrase = 2,
    Migrate = 3,
    Passphrase = 4,
    PassphraseConfirm = 5,
    ShowKey = 6,
    Storing = 8,
    ConfirmSkip = 10,
}

const PASSWORD_MIN_SCORE = 4; // So secure, many characters, much complex, wow, etc, etc.

interface IProps {
    hasCancel?: boolean;
    accountPassword?: string;
    forceReset?: boolean;
    onFinished: (success: boolean) => void;
}

interface IState {
    phase: CreateSecretStoragePhases;
    passPhrase: string;
    passPhraseValid: boolean;
    passPhraseConfirm: string;
    passPhraseKeySelected?: SecureBackupSetupMethod;
    copied: boolean;
    downloaded: boolean;
    setPassphrase: boolean;
    backupInfo: IKeyBackupInfo;
    backupSigStatus: TrustInfo;
    // does the server offer a UI auth flow with just m.login.password
    // for /keys/device_signing/upload?
    canUploadKeysWithPasswordOnly: boolean;
    accountPassword: string;
    accountPasswordCorrect: boolean;
    canSkip: boolean;
    error?: string | null;
}

/*
 * Walks the user through the process of creating a passphrase to guard Secure
 * Secret Storage in account data.
 */
export default class CreateSecretStorageDialog extends React.PureComponent<IProps, IState> {
    static defaultProps = {
        hasCancel: true,
        forceReset: false,
    };

    private recoveryKey: IRecoveryKey = null;
    private recoveryKeyNode: HTMLElement = null;
    private backupKey: Uint8Array = null;

    private passphraseField: React.RefObject<Field> = createRef();

    constructor(props: IProps) {
        super(props);

        const initialState: IState = {
            phase: CreateSecretStoragePhases.Loading,
            passPhrase: '',
            passPhraseValid: false,
            passPhraseConfirm: '',
            copied: false,
            downloaded: false,
            setPassphrase: false,
            backupInfo: null,
            backupSigStatus: null,
            // does the server offer a UI auth flow with just m.login.password
            // for /keys/device_signing/upload?
            canUploadKeysWithPasswordOnly: null,
            accountPassword: props.accountPassword || "",
            accountPasswordCorrect: null,
            canSkip: !isSecureBackupRequired(),
        };

        const setupMethods = getSecureBackupSetupMethods();
        if (setupMethods.includes(SecureBackupSetupMethod.Key)) {
            initialState.passPhraseKeySelected = SecureBackupSetupMethod.Key;
        } else {
            initialState.passPhraseKeySelected = SecureBackupSetupMethod.Passphrase;
        }

        MatrixClientPeg.get().on('crypto.keyBackupStatus', this.onKeyBackupStatusChange);

        if (this.state.accountPassword) {
            // If we have an account password in memory, let's simplify and
            // assume it means password auth is also supported for device
            // signing key upload as well. This avoids hitting the server to
            // test auth flows, which may be slow under high load.
            initialState.canUploadKeysWithPasswordOnly = true;
        } else {
            this.queryKeyUploadAuth();
        }

        this.state = initialState;

        this.getInitialPhase();
    }

    public componentWillUnmount(): void {
        MatrixClientPeg.get().removeListener('crypto.keyBackupStatus', this.onKeyBackupStatusChange);
    }

    private getInitialPhase(): void {
        const keyFromCustomisations = SecurityCustomisations.createSecretStorageKey?.();
        if (keyFromCustomisations) {
            console.log("Created key via customisations, jumping to bootstrap step");
            this.recoveryKey = {
                privateKey: keyFromCustomisations,
            };
            this.bootstrapSecretStorage();
            return;
        }

        this.fetchBackupInfo();
    }

    private async fetchBackupInfo(): Promise<{ backupInfo: IKeyBackupInfo, backupSigStatus: TrustInfo }> {
        try {
            const backupInfo = await MatrixClientPeg.get().getKeyBackupVersion();
            const backupSigStatus = (
                // we may not have started crypto yet, in which case we definitely don't trust the backup
                MatrixClientPeg.get().isCryptoEnabled() && await MatrixClientPeg.get().isKeyBackupTrusted(backupInfo)
            );

            const { forceReset } = this.props;
            const phase = (backupInfo && !forceReset)
                ? CreateSecretStoragePhases.Migrate
                : CreateSecretStoragePhases.Passphrase;

            this.setState({
                phase,
                backupInfo,
                backupSigStatus,
            });

            return {
                backupInfo,
                backupSigStatus,
            };
        } catch (e) {
            this.setState({ phase: CreateSecretStoragePhases.LoadError });
        }
    }

    private async queryKeyUploadAuth(): Promise<void> {
        try {
            await MatrixClientPeg.get().uploadDeviceSigningKeys(null);
            // We should never get here: the server should always require
            // UI auth to upload device signing keys. If we do, we upload
            // no keys which would be a no-op.
            console.log("uploadDeviceSigningKeys unexpectedly succeeded without UI auth!");
        } catch (error) {
            if (!error.data || !error.data.flows) {
                console.log("uploadDeviceSigningKeys advertised no flows!");
                return;
            }
            const canUploadKeysWithPasswordOnly = error.data.flows.some(f => {
                return f.stages.length === 1 && f.stages[0] === 'm.login.password';
            });
            this.setState({
                canUploadKeysWithPasswordOnly,
            });
        }
    }

    private onKeyBackupStatusChange = (): void => {
        if (this.state.phase === CreateSecretStoragePhases.Migrate) this.fetchBackupInfo();
    };

    private onKeyPassphraseChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        this.setState({
            passPhraseKeySelected: e.target.value as SecureBackupSetupMethod,
        });
    };

    private collectRecoveryKeyNode = (n: HTMLElement) => {
        this.recoveryKeyNode = n;
    };

    private onChooseKeyPassphraseFormSubmit = async (): Promise<void> => {
        if (this.state.passPhraseKeySelected === SecureBackupSetupMethod.Key) {
            this.recoveryKey =
                await MatrixClientPeg.get().createRecoveryKeyFromPassphrase();
            this.setState({
                copied: false,
                downloaded: false,
                setPassphrase: false,
                phase: CreateSecretStoragePhases.ShowKey,
            });
        } else {
            this.setState({
                copied: false,
                downloaded: false,
                phase: CreateSecretStoragePhases.Passphrase,
            });
        }
    };

    private onMigrateFormSubmit = (e: React.FormEvent): void => {
        e.preventDefault();
        if (this.state.backupSigStatus.usable) {
            this.bootstrapSecretStorage();
        } else {
            this.restoreBackup();
        }
    };

    private onCopyClick = (): void => {
        const successful = copyNode(this.recoveryKeyNode);
        if (successful) {
            this.setState({
                copied: true,
            });
        }
    };

    private onDownloadClick = (): void => {
        const blob = new Blob([this.recoveryKey.encodedPrivateKey], {
            type: 'text/plain;charset=us-ascii',
        });
        FileSaver.saveAs(blob, 'security-key.txt');

        this.setState({
            downloaded: true,
        });
    };

    private doBootstrapUIAuth = async (makeRequest: (authData: any) => {}): Promise<void> => {
        if (this.state.canUploadKeysWithPasswordOnly && this.state.accountPassword) {
            await makeRequest({
                type: 'm.login.password',
                identifier: {
                    type: 'm.id.user',
                    user: MatrixClientPeg.get().getUserId(),
                },
                // TODO: Remove `user` once servers support proper UIA
                // See https://github.com/matrix-org/synapse/issues/5665
                user: MatrixClientPeg.get().getUserId(),
                password: this.state.accountPassword,
            });
        } else {
            const InteractiveAuthDialog = sdk.getComponent("dialogs.InteractiveAuthDialog");

            const dialogAesthetics = {
                [SSOAuthEntry.PHASE_PREAUTH]: {
                    title: _t("Use Single Sign On to continue"),
                    body: _t("To continue, use Single Sign On to prove your identity."),
                    continueText: _t("Single Sign On"),
                    continueKind: "primary",
                },
                [SSOAuthEntry.PHASE_POSTAUTH]: {
                    title: _t("Confirm encryption setup"),
                    body: _t("Click the button below to confirm setting up encryption."),
                    continueText: _t("Confirm"),
                    continueKind: "primary",
                },
            };

            const { finished } = Modal.createTrackedDialog(
                'Cross-signing keys dialog', '', InteractiveAuthDialog,
                {
                    title: _t("Setting up keys"),
                    matrixClient: MatrixClientPeg.get(),
                    makeRequest,
                    aestheticsForStagePhases: {
                        [SSOAuthEntry.LOGIN_TYPE]: dialogAesthetics,
                        [SSOAuthEntry.UNSTABLE_LOGIN_TYPE]: dialogAesthetics,
                    },
                },
            );
            const [confirmed] = await finished;
            if (!confirmed) {
                throw new Error("Cross-signing key upload auth canceled");
            }
        }
    };

    private bootstrapSecretStorage = async (): Promise<void> => {
        this.setState({
            phase: CreateSecretStoragePhases.Storing,
            error: null,
        });

        const cli = MatrixClientPeg.get();

        const { forceReset } = this.props;

        try {
            if (forceReset) {
                console.log("Forcing secret storage reset");
                await cli.bootstrapSecretStorage({
                    createSecretStorageKey: async () => this.recoveryKey,
                    setupNewKeyBackup: true,
                    setupNewSecretStorage: true,
                });
            } else {
                // For password authentication users after 2020-09, this cross-signing
                // step will be a no-op since it is now setup during registration or login
                // when needed. We should keep this here to cover other cases such as:
                //   * Users with existing sessions prior to 2020-09 changes
                //   * SSO authentication users which require interactive auth to upload
                //     keys (and also happen to skip all post-authentication flows at the
                //     moment via token login)
                await cli.bootstrapCrossSigning({
                    authUploadDeviceSigningKeys: this.doBootstrapUIAuth,
                });
                await cli.bootstrapSecretStorage({
                    createSecretStorageKey: async () => this.recoveryKey,
                    keyBackupInfo: this.state.backupInfo,
                    setupNewKeyBackup: !this.state.backupInfo,
                    getKeyBackupPassphrase: async () => {
                        // We may already have the backup key if we earlier went
                        // through the restore backup path, so pass it along
                        // rather than prompting again.
                        if (this.backupKey) {
                            return this.backupKey;
                        }
                        return promptForBackupPassphrase();
                    },
                });
            }
            this.props.onFinished(true);
        } catch (e) {
            if (this.state.canUploadKeysWithPasswordOnly && e.httpStatus === 401 && e.data.flows) {
                this.setState({
                    accountPassword: '',
                    accountPasswordCorrect: false,
                    phase: CreateSecretStoragePhases.Migrate,
                });
            } else {
                this.setState({ error: e });
            }
            console.error("Error bootstrapping secret storage", e);
        }
    };

    private onCancel = (): void => {
        this.props.onFinished(false);
    };

    private onDone = (): void => {
        this.props.onFinished(true);
    };

    private restoreBackup = async (): Promise<void> => {
        // It's possible we'll need the backup key later on for bootstrapping,
        // so let's stash it here, rather than prompting for it twice.
        const keyCallback = k => this.backupKey = k;

        const { finished } = Modal.createTrackedDialog(
            'Restore Backup', '', RestoreKeyBackupDialog,
            {
                showSummary: false,
                keyCallback,
            },
            null, /* priority = */ false, /* static = */ false,
        );

        await finished;
        const { backupSigStatus } = await this.fetchBackupInfo();
        if (
            backupSigStatus.usable &&
            this.state.canUploadKeysWithPasswordOnly &&
            this.state.accountPassword
        ) {
            this.bootstrapSecretStorage();
        }
    };

    private onLoadRetryClick = (): void => {
        this.setState({ phase: CreateSecretStoragePhases.Loading });
        this.fetchBackupInfo();
    };

    private onShowKeyContinueClick = (): void => {
        this.bootstrapSecretStorage();
    };

    private onCancelClick = (): void => {
        this.setState({ phase: CreateSecretStoragePhases.ConfirmSkip });
    };

    private onGoBackClick = (): void => {
        this.setState({ phase: CreateSecretStoragePhases.Passphrase });
    };

    onPassPhraseNextClick = async (e: React.MouseEvent | React.FormEvent): Promise<void> => {
        e.preventDefault();
        if (!this.passphraseField.current) return; // unmounting

        await this.passphraseField.current.validate({ allowEmpty: false });
        if (!this.passphraseField.current.state.valid) { // TODO: FIXME
            // this.passphraseField.current.props.fieldRef.
            //     this.passphraseField.current.validate({ allowEmpty: false, focused: true });
            return;
        }

        this.setState({ phase: CreateSecretStoragePhases.PassphraseConfirm });
    };

    private onPassPhraseConfirmNextClick = async (e: React.MouseEvent | React.FormEvent): Promise<void> => {
        e.preventDefault();

        if (this.state.passPhrase !== this.state.passPhraseConfirm) return;

        this.recoveryKey =
            await MatrixClientPeg.get().createRecoveryKeyFromPassphrase(this.state.passPhrase);
        this.setState({
            copied: false,
            downloaded: false,
            setPassphrase: true,
            phase: CreateSecretStoragePhases.ShowKey,
        });
    };

    private onSetAgainClick = (): void => {
        this.setState({
            passPhrase: '',
            passPhraseValid: false,
            passPhraseConfirm: '',
            phase: CreateSecretStoragePhases.Passphrase,
        });
    };

    private onPassPhraseValidate = (result: IValidationResult): void => {
        this.setState({
            passPhraseValid: result.valid,
        });
    };

    private onPassPhraseChange = (e: React.ChangeEvent<HTMLInputElement>): void => {
        this.setState({
            passPhrase: e.target.value,
        });
    };

    private onPassPhraseConfirmChange = (e: React.ChangeEvent<HTMLInputElement>): void => {
        this.setState({
            passPhraseConfirm: e.target.value,
        });
    };

    private onAccountPasswordChange = (e: React.ChangeEvent<HTMLInputElement>): void => {
        this.setState({
            accountPassword: e.target.value,
        });
    };

    private renderOptionKey(): JSX.Element {
        return (
            <StyledRadioButton
                key={SecureBackupSetupMethod.Key}
                value={SecureBackupSetupMethod.Key}
                name="keyPassphrase"
                checked={this.state.passPhraseKeySelected === SecureBackupSetupMethod.Key}
                onChange={this.onKeyPassphraseChange}
                outlined
            >
                <div className="mx_CreateSecretStorageDialog_optionTitle">
                    <span className="mx_CreateSecretStorageDialog_optionIcon mx_CreateSecretStorageDialog_optionIcon_secureBackup" />
                    { _t("Generate a Security Key") }
                </div>
                <div>{ _t("We’ll generate a Security Key for you to store somewhere safe, like a password manager or a safe.") }</div>
            </StyledRadioButton>
        );
    }

    private renderOptionPassphrase(): JSX.Element {
        return (
            <StyledRadioButton
                key={SecureBackupSetupMethod.Passphrase}
                value={SecureBackupSetupMethod.Passphrase}
                name="keyPassphrase"
                checked={this.state.passPhraseKeySelected === SecureBackupSetupMethod.Passphrase}
                onChange={this.onKeyPassphraseChange}
                outlined
            >
                <div className="mx_CreateSecretStorageDialog_optionTitle">
                    <span className="mx_CreateSecretStorageDialog_optionIcon mx_CreateSecretStorageDialog_optionIcon_securePhrase" />
                    { _t("Enter a Security Phrase") }
                </div>
                <div>{ _t("Use a secret phrase only you know, and optionally save a Security Key to use for backup.") }</div>
            </StyledRadioButton>
        );
    }

    private renderPhaseChooseKeyPassphrase(): JSX.Element {
        const setupMethods = getSecureBackupSetupMethods();
        const optionKey = setupMethods.includes(SecureBackupSetupMethod.Key)
            ? this.renderOptionKey()
            : null;
        const optionPassphrase = setupMethods.includes(SecureBackupSetupMethod.Passphrase)
            ? this.renderOptionPassphrase()
            : null;

        return <form onSubmit={this.onChooseKeyPassphraseFormSubmit}>
            <p className="mx_CreateSecretStorageDialog_centeredBody">{ _t(
                "Safeguard against losing access to encrypted messages & data by " +
                "backing up encryption keys on your server.",
            ) }</p>
            <div className="mx_CreateSecretStorageDialog_primaryContainer" role="radiogroup">
                { optionKey }
                { optionPassphrase }
            </div>
            <DialogButtons
                primaryButton={_t("Continue")}
                onPrimaryButtonClick={this.onChooseKeyPassphraseFormSubmit}
                onCancel={this.onCancelClick}
                hasCancel={this.state.canSkip}
            />
        </form>;
    }

    private renderPhaseMigrate(): JSX.Element {
        // TODO: This is a temporary screen so people who have the labs flag turned on and
        // click the button are aware they're making a change to their account.
        // Once we're confident enough in this (and it's supported enough) we can do
        // it automatically.
        // https://github.com/vector-im/element-web/issues/11696
        const Field = sdk.getComponent('views.elements.Field');

        let authPrompt;
        let nextCaption = _t("Next");
        if (this.state.canUploadKeysWithPasswordOnly) {
            authPrompt = <div>
                <div>{ _t("Enter your account password to confirm the upgrade:") }</div>
                <div><Field
                    type="password"
                    label={_t("Password")}
                    value={this.state.accountPassword}
                    onChange={this.onAccountPasswordChange}
                    forceValidity={this.state.accountPasswordCorrect === false ? false : null}
                    autoFocus={true}
                /></div>
            </div>;
        } else if (!this.state.backupSigStatus.usable) {
            authPrompt = <div>
                <div>{ _t("Restore your key backup to upgrade your encryption") }</div>
            </div>;
            nextCaption = _t("Restore");
        } else {
            authPrompt = <p>
                { _t("You'll need to authenticate with the server to confirm the upgrade.") }
            </p>;
        }

        return <form onSubmit={this.onMigrateFormSubmit}>
            <p>{ _t(
                "Upgrade this session to allow it to verify other sessions, " +
                "granting them access to encrypted messages and marking them " +
                "as trusted for other users.",
            ) }</p>
            <div>{ authPrompt }</div>
            <DialogButtons
                primaryButton={nextCaption}
                onPrimaryButtonClick={this.onMigrateFormSubmit}
                hasCancel={false}
                primaryDisabled={this.state.canUploadKeysWithPasswordOnly && !this.state.accountPassword}
            >
                <button type="button" className="danger" onClick={this.onCancelClick}>
                    { _t('Skip') }
                </button>
            </DialogButtons>
        </form>;
    }

    private renderPhasePassPhrase(): JSX.Element {
        return <form onSubmit={this.onPassPhraseNextClick}>
            <p>{ _t(
                "Enter a security phrase only you know, as it’s used to safeguard your data. " +
                "To be secure, you shouldn’t re-use your account password.",
            ) }</p>

            <div className="mx_CreateSecretStorageDialog_passPhraseContainer">
                <PassphraseField
                    className="mx_CreateSecretStorageDialog_passPhraseField"
                    onChange={this.onPassPhraseChange}
                    minScore={PASSWORD_MIN_SCORE}
                    value={this.state.passPhrase}
                    onValidate={this.onPassPhraseValidate}
                    fieldRef={this.passphraseField}
                    autoFocus={true}
                    label={_td("Enter a Security Phrase")}
                    labelEnterPassword={_td("Enter a Security Phrase")}
                    labelStrongPassword={_td("Great! This Security Phrase looks strong enough.")}
                    labelAllowedButUnsafe={_td("Great! This Security Phrase looks strong enough.")}
                />
            </div>

            <DialogButtons
                primaryButton={_t('Continue')}
                onPrimaryButtonClick={this.onPassPhraseNextClick}
                hasCancel={false}
                disabled={!this.state.passPhraseValid}
            >
                <button type="button"
                    onClick={this.onCancelClick}
                    className="danger"
                >{ _t("Cancel") }</button>
            </DialogButtons>
        </form>;
    }

    private renderPhasePassPhraseConfirm(): JSX.Element {
        const Field = sdk.getComponent('views.elements.Field');

        let matchText;
        let changeText;
        if (this.state.passPhraseConfirm === this.state.passPhrase) {
            matchText = _t("That matches!");
            changeText = _t("Use a different passphrase?");
        } else if (!this.state.passPhrase.startsWith(this.state.passPhraseConfirm)) {
            // only tell them they're wrong if they've actually gone wrong.
            // Security concious readers will note that if you left element-web unattended
            // on this screen, this would make it easy for a malicious person to guess
            // your passphrase one letter at a time, but they could get this faster by
            // just opening the browser's developer tools and reading it.
            // Note that not having typed anything at all will not hit this clause and
            // fall through so empty box === no hint.
            matchText = _t("That doesn't match.");
            changeText = _t("Go back to set it again.");
        }

        let passPhraseMatch = null;
        if (matchText) {
            passPhraseMatch = <div>
                <div>{ matchText }</div>
                <div>
                    <AccessibleButton element="span" className="mx_linkButton" onClick={this.onSetAgainClick}>
                        { changeText }
                    </AccessibleButton>
                </div>
            </div>;
        }
        return <form onSubmit={this.onPassPhraseConfirmNextClick}>
            <p>{ _t(
                "Enter your Security Phrase a second time to confirm it.",
            ) }</p>
            <div className="mx_CreateSecretStorageDialog_passPhraseContainer">
                <Field
                    type="password"
                    onChange={this.onPassPhraseConfirmChange}
                    value={this.state.passPhraseConfirm}
                    className="mx_CreateSecretStorageDialog_passPhraseField"
                    label={_t("Confirm your Security Phrase")}
                    autoFocus={true}
                    autoComplete="new-password"
                />
                <div className="mx_CreateSecretStorageDialog_passPhraseMatch">
                    { passPhraseMatch }
                </div>
            </div>
            <DialogButtons
                primaryButton={_t('Continue')}
                onPrimaryButtonClick={this.onPassPhraseConfirmNextClick}
                hasCancel={false}
                disabled={this.state.passPhrase !== this.state.passPhraseConfirm}
            >
                <button type="button"
                    onClick={this.onCancelClick}
                    className="danger"
                >{ _t("Skip") }</button>
            </DialogButtons>
        </form>;
    }

    private renderPhaseShowKey(): JSX.Element {
        let continueButton;
        if (this.state.phase === CreateSecretStoragePhases.ShowKey) {
            continueButton = <DialogButtons primaryButton={_t("Continue")}
                disabled={!this.state.downloaded && !this.state.copied && !this.state.setPassphrase}
                onPrimaryButtonClick={this.onShowKeyContinueClick}
                hasCancel={false}
            />;
        } else {
            continueButton = <div className="mx_CreateSecretStorageDialog_continueSpinner">
                <InlineSpinner />
            </div>;
        }
        return <div>
            <p>{ _t(
                "Store your Security Key somewhere safe, like a password manager or a safe, " +
                "as it’s used to safeguard your encrypted data.",
            ) }</p>
            <div className="mx_CreateSecretStorageDialog_primaryContainer">
                <div className="mx_CreateSecretStorageDialog_recoveryKeyContainer">
                    <div className="mx_CreateSecretStorageDialog_recoveryKey">
                        <code ref={this.collectRecoveryKeyNode}>{ this.recoveryKey.encodedPrivateKey }</code>
                    </div>
                    <div className="mx_CreateSecretStorageDialog_recoveryKeyButtons">
                        <AccessibleButton kind='primary'
                            className="mx_Dialog_primary"
                            onClick={this.onDownloadClick}
                            disabled={this.state.phase === CreateSecretStoragePhases.Storing}
                        >
                            { _t("Download") }
                        </AccessibleButton>
                        <span>{ _t("or") }</span>
                        <AccessibleButton
                            kind='primary'
                            className="mx_Dialog_primary mx_CreateSecretStorageDialog_recoveryKeyButtons_copyBtn"
                            onClick={this.onCopyClick}
                            disabled={this.state.phase === CreateSecretStoragePhases.Storing}
                        >
                            { this.state.copied ? _t("Copied!") : _t("Copy") }
                        </AccessibleButton>
                    </div>
                </div>
            </div>
            { continueButton }
        </div>;
    }

    private renderBusyPhase(): JSX.Element {
        const Spinner = sdk.getComponent('views.elements.Spinner');
        return <div>
            <Spinner />
        </div>;
    }

    private renderPhaseLoadError(): JSX.Element {
        return <div>
            <p>{ _t("Unable to query secret storage status") }</p>
            <div className="mx_Dialog_buttons">
                <DialogButtons primaryButton={_t('Retry')}
                    onPrimaryButtonClick={this.onLoadRetryClick}
                    hasCancel={this.state.canSkip}
                    onCancel={this.onCancel}
                />
            </div>
        </div>;
    }

    private renderPhaseSkipConfirm(): JSX.Element {
        return <div>
            <p>{ _t(
                "If you cancel now, you may lose encrypted messages & data if you lose access to your logins.",
            ) }</p>
            <p>{ _t(
                "You can also set up Secure Backup & manage your keys in Settings.",
            ) }</p>
            <DialogButtons primaryButton={_t('Go back')}
                onPrimaryButtonClick={this.onGoBackClick}
                hasCancel={false}
            >
                <button type="button" className="danger" onClick={this.onCancel}>{ _t('Cancel') }</button>
            </DialogButtons>
        </div>;
    }

    private titleForPhase(phase: CreateSecretStoragePhases): string {
        switch (phase) {
            case CreateSecretStoragePhases.ChooseKeyPassphrase:
                return _t('Set up Secure Backup');
            case CreateSecretStoragePhases.Migrate:
                return _t('Upgrade your encryption');
            case CreateSecretStoragePhases.Passphrase:
                return _t('Set a Security Phrase');
            case CreateSecretStoragePhases.PassphraseConfirm:
                return _t('Confirm Security Phrase');
            case CreateSecretStoragePhases.ConfirmSkip:
                return _t('Are you sure?');
            case CreateSecretStoragePhases.ShowKey:
                return _t('Save your Security Key');
            case CreateSecretStoragePhases.Storing:
                return _t('Setting up keys');
            default:
                return '';
        }
    }

    public render(): JSX.Element {
        const BaseDialog = sdk.getComponent('views.dialogs.BaseDialog');

        let content;
        if (this.state.error) {
            content = <div>
                <p>{ _t("Unable to set up secret storage") }</p>
                <div className="mx_Dialog_buttons">
                    <DialogButtons primaryButton={_t('Retry')}
                        onPrimaryButtonClick={this.bootstrapSecretStorage}
                        hasCancel={this.state.canSkip}
                        onCancel={this.onCancel}
                    />
                </div>
            </div>;
        } else {
            switch (this.state.phase) {
                case CreateSecretStoragePhases.Loading:
                    content = this.renderBusyPhase();
                    break;
                case CreateSecretStoragePhases.LoadError:
                    content = this.renderPhaseLoadError();
                    break;
                case CreateSecretStoragePhases.ChooseKeyPassphrase:
                    content = this.renderPhaseChooseKeyPassphrase();
                    break;
                case CreateSecretStoragePhases.Migrate:
                    content = this.renderPhaseMigrate();
                    break;
                case CreateSecretStoragePhases.Passphrase:
                    content = this.renderPhasePassPhrase();
                    break;
                case CreateSecretStoragePhases.PassphraseConfirm:
                    content = this.renderPhasePassPhraseConfirm();
                    break;
                case CreateSecretStoragePhases.ShowKey:
                    content = this.renderPhaseShowKey();
                    break;
                case CreateSecretStoragePhases.Storing:
                    content = this.renderBusyPhase();
                    break;
                case CreateSecretStoragePhases.ConfirmSkip:
                    content = this.renderPhaseSkipConfirm();
                    break;
            }
        }

        let titleClass = null;
        switch (this.state.phase) {
            case CreateSecretStoragePhases.Passphrase:
            case CreateSecretStoragePhases.PassphraseConfirm:
                titleClass = [
                    'mx_CreateSecretStorageDialog_titleWithIcon',
                    'mx_CreateSecretStorageDialog_securePhraseTitle',
                ];
                break;
            case CreateSecretStoragePhases.ShowKey:
                titleClass = [
                    'mx_CreateSecretStorageDialog_titleWithIcon',
                    'mx_CreateSecretStorageDialog_secureBackupTitle',
                ];
                break;
            case CreateSecretStoragePhases.ChooseKeyPassphrase:
                titleClass = 'mx_CreateSecretStorageDialog_centeredTitle';
                break;
        }

        return (
            <BaseDialog className='mx_CreateSecretStorageDialog'
                onFinished={this.props.onFinished}
                title={this.titleForPhase(this.state.phase)}
                titleClass={titleClass}
                hasCancel={this.props.hasCancel && [CreateSecretStoragePhases.Passphrase].includes(this.state.phase)}
                fixedWidth={false}
            >
                <div>
                    { content }
                </div>
            </BaseDialog>
        );
    }
}
