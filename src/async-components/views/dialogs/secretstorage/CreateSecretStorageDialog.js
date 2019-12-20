/*
Copyright 2018, 2019 New Vector Ltd
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
import * as sdk from '../../../../index';
import {MatrixClientPeg} from '../../../../MatrixClientPeg';
import { scorePassword } from '../../../../utils/PasswordScorer';
import FileSaver from 'file-saver';
import { _t } from '../../../../languageHandler';
import Modal from '../../../../Modal';

const PHASE_PASSPHRASE = 0;
const PHASE_PASSPHRASE_CONFIRM = 1;
const PHASE_SHOWKEY = 2;
const PHASE_KEEPITSAFE = 3;
const PHASE_STORING = 4;
const PHASE_DONE = 5;
const PHASE_OPTOUT_CONFIRM = 6;

const PASSWORD_MIN_SCORE = 4; // So secure, many characters, much complex, wow, etc, etc.
const PASSPHRASE_FEEDBACK_DELAY = 500; // How long after keystroke to offer passphrase feedback, ms.

// XXX: copied from ShareDialog: factor out into utils
function selectText(target) {
    const range = document.createRange();
    range.selectNodeContents(target);

    const selection = window.getSelection();
    selection.removeAllRanges();
    selection.addRange(range);
}

/*
 * Walks the user through the process of creating a passphrase to guard Secure
 * Secret Storage in account data.
 */
export default class CreateSecretStorageDialog extends React.PureComponent {
    constructor(props) {
        super(props);

        this._keyInfo = null;
        this._encodedRecoveryKey = null;
        this._recoveryKeyNode = null;
        this._setZxcvbnResultTimeout = null;

        this.state = {
            phase: PHASE_PASSPHRASE,
            passPhrase: '',
            passPhraseConfirm: '',
            copied: false,
            downloaded: false,
            zxcvbnResult: null,
            setPassPhrase: false,
        };
    }

    componentWillUnmount() {
        if (this._setZxcvbnResultTimeout !== null) {
            clearTimeout(this._setZxcvbnResultTimeout);
        }
    }

    _collectRecoveryKeyNode = (n) => {
        this._recoveryKeyNode = n;
    }

    _onCopyClick = () => {
        selectText(this._recoveryKeyNode);
        const successful = document.execCommand('copy');
        if (successful) {
            this.setState({
                copied: true,
                phase: PHASE_KEEPITSAFE,
            });
        }
    }

    _onDownloadClick = () => {
        const blob = new Blob([this._encodedRecoveryKey], {
            type: 'text/plain;charset=us-ascii',
        });
        FileSaver.saveAs(blob, 'recovery-key.txt');

        this.setState({
            downloaded: true,
            phase: PHASE_KEEPITSAFE,
        });
    }

    _bootstrapSecretStorage = async () => {
        this.setState({
            phase: PHASE_STORING,
            error: null,
        });
        const cli = MatrixClientPeg.get();
        try {
            const InteractiveAuthDialog = sdk.getComponent("dialogs.InteractiveAuthDialog");
            await cli.bootstrapSecretStorage({
                authUploadDeviceSigningKeys: async (makeRequest) => {
                    const { finished } = Modal.createTrackedDialog(
                        'Cross-signing keys dialog', '', InteractiveAuthDialog,
                        {
                            title: _t("Send cross-signing keys to homeserver"),
                            matrixClient: MatrixClientPeg.get(),
                            makeRequest,
                        },
                    );
                    const [confirmed] = await finished;
                    if (!confirmed) {
                        throw new Error("Cross-signing key upload auth canceled");
                    }
                },
                createSecretStorageKey: async () => this._keyInfo,
            });
            this.setState({
                phase: PHASE_DONE,
            });
        } catch (e) {
            this.setState({ error: e });
            console.error("Error bootstrapping secret storage", e);
        }
    }

    _onCancel = () => {
        this.props.onFinished(false);
    }

    _onDone = () => {
        this.props.onFinished(true);
    }

    _onOptOutClick = () => {
        this.setState({phase: PHASE_OPTOUT_CONFIRM});
    }

    _onSetUpClick = () => {
        this.setState({phase: PHASE_PASSPHRASE});
    }

    _onSkipPassPhraseClick = async () => {
        const [keyInfo, encodedRecoveryKey] =
            await MatrixClientPeg.get().createRecoveryKeyFromPassphrase();
        this._keyInfo = keyInfo;
        this._encodedRecoveryKey = encodedRecoveryKey;
        this.setState({
            copied: false,
            downloaded: false,
            phase: PHASE_SHOWKEY,
        });
    }

    _onPassPhraseNextClick = () => {
        this.setState({phase: PHASE_PASSPHRASE_CONFIRM});
    }

    _onPassPhraseKeyPress = async (e) => {
        if (e.key === 'Enter') {
            // If we're waiting for the timeout before updating the result at this point,
            // skip ahead and do it now, otherwise we'll deny the attempt to proceed
            // even if the user entered a valid passphrase
            if (this._setZxcvbnResultTimeout !== null) {
                clearTimeout(this._setZxcvbnResultTimeout);
                this._setZxcvbnResultTimeout = null;
                await new Promise((resolve) => {
                    this.setState({
                        zxcvbnResult: scorePassword(this.state.passPhrase),
                    }, resolve);
                });
            }
            if (this._passPhraseIsValid()) {
                this._onPassPhraseNextClick();
            }
        }
    }

    _onPassPhraseConfirmNextClick = async () => {
        const [keyInfo, encodedRecoveryKey] =
            await MatrixClientPeg.get().createRecoveryKeyFromPassphrase(this.state.passPhrase);
        this._keyInfo = keyInfo;
        this._encodedRecoveryKey = encodedRecoveryKey;
        this.setState({
            setPassPhrase: true,
            copied: false,
            downloaded: false,
            phase: PHASE_SHOWKEY,
        });
    }

    _onPassPhraseConfirmKeyPress = (e) => {
        if (e.key === 'Enter' && this.state.passPhrase === this.state.passPhraseConfirm) {
            this._onPassPhraseConfirmNextClick();
        }
    }

    _onSetAgainClick = () => {
        this.setState({
            passPhrase: '',
            passPhraseConfirm: '',
            phase: PHASE_PASSPHRASE,
            zxcvbnResult: null,
        });
    }

    _onKeepItSafeBackClick = () => {
        this.setState({
            phase: PHASE_SHOWKEY,
        });
    }

    _onPassPhraseChange = (e) => {
        this.setState({
            passPhrase: e.target.value,
        });

        if (this._setZxcvbnResultTimeout !== null) {
            clearTimeout(this._setZxcvbnResultTimeout);
        }
        this._setZxcvbnResultTimeout = setTimeout(() => {
            this._setZxcvbnResultTimeout = null;
            this.setState({
                // precompute this and keep it in state: zxcvbn is fast but
                // we use it in a couple of different places so no point recomputing
                // it unnecessarily.
                zxcvbnResult: scorePassword(this.state.passPhrase),
            });
        }, PASSPHRASE_FEEDBACK_DELAY);
    }

    _onPassPhraseConfirmChange = (e) => {
        this.setState({
            passPhraseConfirm: e.target.value,
        });
    }

    _passPhraseIsValid() {
        return this.state.zxcvbnResult && this.state.zxcvbnResult.score >= PASSWORD_MIN_SCORE;
    }

    _renderPhasePassPhrase() {
        const DialogButtons = sdk.getComponent('views.elements.DialogButtons');

        let strengthMeter;
        let helpText;
        if (this.state.zxcvbnResult) {
            if (this.state.zxcvbnResult.score >= PASSWORD_MIN_SCORE) {
                helpText = _t("Great! This passphrase looks strong enough.");
            } else {
                const suggestions = [];
                for (let i = 0; i < this.state.zxcvbnResult.feedback.suggestions.length; ++i) {
                    suggestions.push(<div key={i}>{this.state.zxcvbnResult.feedback.suggestions[i]}</div>);
                }
                const suggestionBlock = <div>{suggestions.length > 0 ? suggestions : _t("Keep going...")}</div>;

                helpText = <div>
                    {this.state.zxcvbnResult.feedback.warning}
                    {suggestionBlock}
                </div>;
            }
            strengthMeter = <div>
                <progress max={PASSWORD_MIN_SCORE} value={this.state.zxcvbnResult.score} />
            </div>;
        }

        return <div>
            <p>{_t(
                "<b>Warning</b>: You should only set up secret storage from a trusted computer.", {},
                { b: sub => <b>{sub}</b> },
            )}</p>
            <p>{_t(
                "We'll use secret storage to optionally store an encrypted copy of " +
                "your cross-signing identity for verifying other devices and message " +
                "keys on our server. Protect your access to encrypted messages with a " +
                "passphrase to keep it secure.",
            )}</p>
            <p>{_t("For maximum security, this should be different from your account password.")}</p>

            <div className="mx_CreateSecretStorageDialog_primaryContainer">
                <div className="mx_CreateSecretStorageDialog_passPhraseContainer">
                    <input type="password"
                        onChange={this._onPassPhraseChange}
                        onKeyPress={this._onPassPhraseKeyPress}
                        value={this.state.passPhrase}
                        className="mx_CreateSecretStorageDialog_passPhraseInput"
                        placeholder={_t("Enter a passphrase...")}
                        autoFocus={true}
                    />
                    <div className="mx_CreateSecretStorageDialog_passPhraseHelp">
                        {strengthMeter}
                        {helpText}
                    </div>
                </div>
            </div>

            <DialogButtons primaryButton={_t('Next')}
                onPrimaryButtonClick={this._onPassPhraseNextClick}
                hasCancel={false}
                disabled={!this._passPhraseIsValid()}
            />

            <details>
                <summary>{_t("Advanced")}</summary>
                <p><button onClick={this._onSkipPassPhraseClick} >
                    {_t("Set up with a recovery key")}
                </button></p>
            </details>
        </div>;
    }

    _renderPhasePassPhraseConfirm() {
        const AccessibleButton = sdk.getComponent('elements.AccessibleButton');

        let matchText;
        if (this.state.passPhraseConfirm === this.state.passPhrase) {
            matchText = _t("That matches!");
        } else if (!this.state.passPhrase.startsWith(this.state.passPhraseConfirm)) {
            // only tell them they're wrong if they've actually gone wrong.
            // Security concious readers will note that if you left riot-web unattended
            // on this screen, this would make it easy for a malicious person to guess
            // your passphrase one letter at a time, but they could get this faster by
            // just opening the browser's developer tools and reading it.
            // Note that not having typed anything at all will not hit this clause and
            // fall through so empty box === no hint.
            matchText = _t("That doesn't match.");
        }

        let passPhraseMatch = null;
        if (matchText) {
            passPhraseMatch = <div className="mx_CreateSecretStorageDialog_passPhraseMatch">
                <div>{matchText}</div>
                <div>
                    <AccessibleButton element="span" className="mx_linkButton" onClick={this._onSetAgainClick}>
                        {_t("Go back to set it again.")}
                    </AccessibleButton>
                </div>
            </div>;
        }
        const DialogButtons = sdk.getComponent('views.elements.DialogButtons');
        return <div>
            <p>{_t(
                "Please enter your passphrase a second time to confirm.",
            )}</p>
            <div className="mx_CreateSecretStorageDialog_primaryContainer">
                <div className="mx_CreateSecretStorageDialog_passPhraseContainer">
                    <div>
                        <input type="password"
                            onChange={this._onPassPhraseConfirmChange}
                            onKeyPress={this._onPassPhraseConfirmKeyPress}
                            value={this.state.passPhraseConfirm}
                            className="mx_CreateSecretStorageDialog_passPhraseInput"
                            placeholder={_t("Repeat your passphrase...")}
                            autoFocus={true}
                        />
                    </div>
                    {passPhraseMatch}
                </div>
            </div>
            <DialogButtons primaryButton={_t('Next')}
                onPrimaryButtonClick={this._onPassPhraseConfirmNextClick}
                hasCancel={false}
                disabled={this.state.passPhrase !== this.state.passPhraseConfirm}
            />
        </div>;
    }

    _renderPhaseShowKey() {
        let bodyText;
        if (this.state.setPassPhrase) {
            bodyText = _t(
                "As a safety net, you can use it to restore your access to encrypted " +
                "messages if you forget your passphrase.",
            );
        } else {
            bodyText = _t(
                "As a safety net, you can use it to restore your access to encrypted " +
                "messages.",
            );
        }

        return <div>
            <p>{_t(
                "Your recovery key is a safety net - you can use it to restore " +
                "access to your encrypted messages if you forget your passphrase.",
            )}</p>
            <p>{_t(
                "Keep your recovery key somewhere very secure, like a password manager (or a safe).",
            )}</p>
            <p>{bodyText}</p>
            <div className="mx_CreateSecretStorageDialog_primaryContainer">
                <div className="mx_CreateSecretStorageDialog_recoveryKeyHeader">
                    {_t("Your Recovery Key")}
                </div>
                <div className="mx_CreateSecretStorageDialog_recoveryKeyContainer">
                    <div className="mx_CreateSecretStorageDialog_recoveryKey">
                        <code ref={this._collectRecoveryKeyNode}>{this._encodedRecoveryKey}</code>
                    </div>
                    <div className="mx_CreateSecretStorageDialog_recoveryKeyButtons">
                        <button className="mx_Dialog_primary" onClick={this._onCopyClick}>
                            {_t("Copy to clipboard")}
                        </button>
                        <button className="mx_Dialog_primary" onClick={this._onDownloadClick}>
                            {_t("Download")}
                        </button>
                    </div>
                </div>
            </div>
        </div>;
    }

    _renderPhaseKeepItSafe() {
        let introText;
        if (this.state.copied) {
            introText = _t(
                "Your recovery key has been <b>copied to your clipboard</b>, paste it to:",
                {}, {b: s => <b>{s}</b>},
            );
        } else if (this.state.downloaded) {
            introText = _t(
                "Your recovery key is in your <b>Downloads</b> folder.",
                {}, {b: s => <b>{s}</b>},
            );
        }
        const DialogButtons = sdk.getComponent('views.elements.DialogButtons');
        return <div>
            {introText}
            <ul>
                <li>{_t("<b>Print it</b> and store it somewhere safe", {}, {b: s => <b>{s}</b>})}</li>
                <li>{_t("<b>Save it</b> on a USB key or backup drive", {}, {b: s => <b>{s}</b>})}</li>
                <li>{_t("<b>Copy it</b> to your personal cloud storage", {}, {b: s => <b>{s}</b>})}</li>
            </ul>
            <DialogButtons primaryButton={_t("OK")}
                onPrimaryButtonClick={this._bootstrapSecretStorage}
                hasCancel={false}>
                <button onClick={this._onKeepItSafeBackClick}>{_t("Back")}</button>
            </DialogButtons>
        </div>;
    }

    _renderBusyPhase(text) {
        const Spinner = sdk.getComponent('views.elements.Spinner');
        return <div>
            <Spinner />
        </div>;
    }

    _renderPhaseDone() {
        const DialogButtons = sdk.getComponent('views.elements.DialogButtons');
        return <div>
            <p>{_t(
                "Your access to encrypted messages is now protected.",
            )}</p>
            <DialogButtons primaryButton={_t('OK')}
                onPrimaryButtonClick={this._onDone}
                hasCancel={false}
            />
        </div>;
    }

    _renderPhaseOptOutConfirm() {
        const DialogButtons = sdk.getComponent('views.elements.DialogButtons');
        return <div>
            {_t(
                "Without setting up secret storage, you won't be able to restore your " +
                "access to encrypted messages or your cross-signing identity for " +
                "verifying other devices if you log out or use another device.",
        )}
            <DialogButtons primaryButton={_t('Set up secret storage')}
                onPrimaryButtonClick={this._onSetUpClick}
                hasCancel={false}
            >
                <button onClick={this._onCancel}>I understand, continue without</button>
            </DialogButtons>
        </div>;
    }

    _titleForPhase(phase) {
        switch (phase) {
            case PHASE_PASSPHRASE:
                return _t('Secure your encrypted messages with a passphrase');
            case PHASE_PASSPHRASE_CONFIRM:
                return _t('Confirm your passphrase');
            case PHASE_OPTOUT_CONFIRM:
                return _t('Warning!');
            case PHASE_SHOWKEY:
                return _t('Recovery key');
            case PHASE_KEEPITSAFE:
                return _t('Keep it safe');
            case PHASE_STORING:
                return _t('Storing secrets...');
            case PHASE_DONE:
                return _t('Success!');
            default:
                return null;
        }
    }

    render() {
        const BaseDialog = sdk.getComponent('views.dialogs.BaseDialog');

        let content;
        if (this.state.error) {
            const DialogButtons = sdk.getComponent('views.elements.DialogButtons');
            content = <div>
                <p>{_t("Unable to set up secret storage")}</p>
                <div className="mx_Dialog_buttons">
                    <DialogButtons primaryButton={_t('Retry')}
                        onPrimaryButtonClick={this._bootstrapSecretStorage}
                        hasCancel={true}
                        onCancel={this._onCancel}
                    />
                </div>
            </div>;
        } else {
            switch (this.state.phase) {
                case PHASE_PASSPHRASE:
                    content = this._renderPhasePassPhrase();
                    break;
                case PHASE_PASSPHRASE_CONFIRM:
                    content = this._renderPhasePassPhraseConfirm();
                    break;
                case PHASE_SHOWKEY:
                    content = this._renderPhaseShowKey();
                    break;
                case PHASE_KEEPITSAFE:
                    content = this._renderPhaseKeepItSafe();
                    break;
                case PHASE_STORING:
                    content = this._renderBusyPhase();
                    break;
                case PHASE_DONE:
                    content = this._renderPhaseDone();
                    break;
                case PHASE_OPTOUT_CONFIRM:
                    content = this._renderPhaseOptOutConfirm();
                    break;
            }
        }

        return (
            <BaseDialog className='mx_CreateSecretStorageDialog'
                onFinished={this.props.onFinished}
                title={this._titleForPhase(this.state.phase)}
                hasCancel={[PHASE_PASSPHRASE, PHASE_DONE].includes(this.state.phase)}
            >
            <div>
                {content}
            </div>
            </BaseDialog>
        );
    }
}
