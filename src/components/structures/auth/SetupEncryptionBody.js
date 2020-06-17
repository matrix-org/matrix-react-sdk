/*
Copyright 2020 The Matrix.org Foundation C.I.C.

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

import { debounce } from 'lodash';
import classNames from 'classnames';
import React from 'react';
import PropTypes from 'prop-types';
import { _t } from '../../../languageHandler';
import { MatrixClientPeg } from '../../../MatrixClientPeg';
import * as sdk from '../../../index';
import withValidation from '../../views/elements/Validation';
import { decodeRecoveryKey } from 'matrix-js-sdk/src/crypto/recoverykey';
import {
    SetupEncryptionStore,
    PHASE_INTRO,
    PHASE_RECOVERY_KEY,
    PHASE_BUSY,
    PHASE_DONE,
    PHASE_CONFIRM_SKIP,
    PHASE_FINISHED,
} from '../../../stores/SetupEncryptionStore';

function keyHasPassphrase(keyInfo) {
    return (
        keyInfo.passphrase &&
        keyInfo.passphrase.salt &&
        keyInfo.passphrase.iterations
    );
}

// Maximum acceptable size of a key file. It's 59 characters including the spaces we encode,
// so this should be plenty and allow for people putting extra whitespace in the file because
// maybe that's a thing people would do?
const KEY_FILE_MAX_SIZE = 128;

// Don't shout at the user that their key is invalid every time they type a key: wait a short time
const VALIDATION_THROTTLE_MS = 200;

export default class SetupEncryptionBody extends React.Component {
    static propTypes = {
        onFinished: PropTypes.func.isRequired,
    };

    constructor() {
        super();

        this._fileUpload = null;

        const store = SetupEncryptionStore.sharedInstance();
        store.on("update", this._onStoreUpdate);
        store.start();
        this.state = {
            phase: store.phase,
            // this serves dual purpose as the object for the request logic and
            // the presence of it indicating that we're in 'verify mode'.
            // Because of the latter, it lives in the state.
            verificationRequest: store.verificationRequest,
            backupInfo: store.backupInfo,
            recoveryKey: '',

            // whether the recovery key is a valid recovery key
            recoveryKeyValid: null,
            // whether the recovery key is the correct key or not
            recoveryKeyCorrect: null,
            recoveryKeyFileError: null,
        };
    }

    _onStoreUpdate = () => {
        const store = SetupEncryptionStore.sharedInstance();
        if (store.phase === PHASE_FINISHED) {
            this.props.onFinished();
            return;
        }
        this.setState({
            phase: store.phase,
            verificationRequest: store.verificationRequest,
            backupInfo: store.backupInfo,
        });
    };

    componentWillUnmount() {
        const store = SetupEncryptionStore.sharedInstance();
        store.off("update", this._onStoreUpdate);
        store.stop();
    }

    _collectFileUpload = n => {
        this._fileUpload = n;
    }

    _onResetClick = () => {
        const store = SetupEncryptionStore.sharedInstance();
        store.startKeyReset();
    }

    _onUseRecoveryKeyClick = async () => {
        const store = SetupEncryptionStore.sharedInstance();
        store.useRecoveryKey();
    }

    _onRecoveryKeyFileUploadClick = () => {
        this._fileUpload.click();
    }

    _onRecoveryKeyFileChange = async e => {
        if (e.target.files.length === 0) return;

        const f = e.target.files[0];

        if (f.size > KEY_FILE_MAX_SIZE) {
            this.setState({
                recoveryKeyFileError: true,
                recoveryKeyCorrect: false,
                recoveryKeyValid: false,
            });
        } else {
            const contents = await f.text();
            // test it's within the base58 alphabet. We could be more strict here, eg. require the
            // right number of characters, but it's really just to make sure that what we're reading is
            // text because we'll put it in the text field.
            if (/^[123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz\s]+$/.test(contents)) {
                this.setState({
                    recoveryKeyFileError: null,
                    recoveryKey: contents.trim(),
                });
                this._validateRecoveryKey();
            } else {
                this.setState({
                    recoveryKeyFileError: true,
                    recoveryKeyCorrect: false,
                    recoveryKeyValid: false,
                    recoveryKey: '',
                });
            }
        }
    }

    _onRecoveryKeyCancelClick() {
        const store = SetupEncryptionStore.sharedInstance();
        store.cancelUseRecoveryKey();
    }

    onSkipClick = () => {
        const store = SetupEncryptionStore.sharedInstance();
        store.skip();
    }

    onSkipConfirmClick = () => {
        const store = SetupEncryptionStore.sharedInstance();
        store.skipConfirm();
    }

    onSkipBackClick = () => {
        const store = SetupEncryptionStore.sharedInstance();
        store.returnAfterSkip();
    }

    onDoneClick = () => {
        const store = SetupEncryptionStore.sharedInstance();
        store.done();
    }

    _onUsePassphraseClick = () => {
        const store = SetupEncryptionStore.sharedInstance();
        store.usePassPhrase();
    }

    _onRecoveryKeyChange = (e) => {
        this.setState({
            recoveryKey: e.target.value,
            recoveryKeyFileError: null,
        });
        // also clear the file upload control so that the user can upload the same file
        // the did before (otherwise the onchange wouldn't fire)
        this._fileUpload.value = null;


        // We don't use Field's validation here because a) we want it in a separate place rather
        // than in a tooltip and b) we want it to display feedback based on the uploaded file
        // as well as the text box. Ideally we would refactor Field's validation logic so we could
        // re-use some of it.
        this._validateRecoveryKeyOnChange();
    }

    _validateRecoveryKeyOnChange = debounce(() => {
        this._validateRecoveryKey();
    }, VALIDATION_THROTTLE_MS);


    async _validateRecoveryKey() {
        if (this.state.recoveryKey === '') {
            this.setState({
                recoveryKeyValid: null,
                recoveryKeyCorrect: null,
            });
            return;
        }

        try {
            const decodedKey = decodeRecoveryKey(this.state.recoveryKey);
            const correct = await MatrixClientPeg.get().checkSecretStorageKey(
                decodedKey, SetupEncryptionStore.sharedInstance().keyInfo,
            );
            this.setState({
                recoveryKeyValid: true,
                recoveryKeyCorrect: correct,
            });
        } catch (e) {
            this.setState({
                recoveryKeyValid: false,
                recoveryKeyCorrect: false,
            });
        }
    }

    getKeyValidationText() {
        if (this.state.recoveryKeyFileError) {
            return _t("Wrong file type");
        } else if (this.state.recoveryKeyCorrect) {
            return _t("Looks good!");
        } else if (this.state.recoveryKeyValid) {
            return _t("Wrong Recovery Key");
        } else if (this.state.recoveryKeyValid === null) {
            return '';
        } else {
            return _t("Invalid Recovery Key");
        }
    }

    _onRecoveryKeyFormSubmit = (e) => {
        e.preventDefault();
        if (!this.state.recoveryKeyCorrect) return;

        const store = SetupEncryptionStore.sharedInstance();
        store.setupWithRecoveryKey(decodeRecoveryKey(this.state.recoveryKey));
    }

    render() {
        const AccessibleButton = sdk.getComponent("elements.AccessibleButton");

        const {
            phase,
        } = this.state;

        if (this.state.verificationRequest) {
            const EncryptionPanel = sdk.getComponent("views.right_panel.EncryptionPanel");
            return <EncryptionPanel
                layout="dialog"
                verificationRequest={this.state.verificationRequest}
                onClose={this.props.onFinished}
                member={MatrixClientPeg.get().getUser(this.state.verificationRequest.otherUserId)}
            />;
        } else if (phase === PHASE_INTRO) {
            const store = SetupEncryptionStore.sharedInstance();
            let recoveryKeyPrompt;
            if (keyHasPassphrase(store.keyInfo)) {
                recoveryKeyPrompt = _t("Use Recovery Key or Passphrase");
            } else {
                recoveryKeyPrompt = _t("Use Recovery Key");
            }
            return (
                <div>
                    <p>{_t(
                        "Confirm your identity by verifying this login from one of your other sessions, " +
                        "granting it access to encrypted messages.",
                    )}</p>
                    <p>{_t(
                        "This requires the latest Riot on your other devices:",
                    )}</p>

                    <div className="mx_CompleteSecurity_clients">
                        <div className="mx_CompleteSecurity_clients_desktop">
                            <div>Riot Web</div>
                            <div>Riot Desktop</div>
                        </div>
                        <div className="mx_CompleteSecurity_clients_mobile">
                            <div>Riot iOS</div>
                            <div>Riot X for Android</div>
                        </div>
                        <p>{_t("or another cross-signing capable Matrix client")}</p>
                    </div>

                    <div className="mx_CompleteSecurity_actionRow">
                        <AccessibleButton kind="link" onClick={this._onUseRecoveryKeyClick}>
                            {recoveryKeyPrompt}
                        </AccessibleButton>
                        <AccessibleButton kind="danger" onClick={this.onSkipClick}>
                            {_t("Skip")}
                        </AccessibleButton>
                    </div>
                    <div className="mx_CompleteSecurity_resetText">{_t(
                        "If you've forgotten your recovery key you can " +
                        "<button>set up new recovery options</button>", {}, {
                            button: sub => <AccessibleButton
                                element="span" className="mx_linkButton" onClick={this._onResetClick}
                            >
                                {sub}
                            </AccessibleButton>,
                        },
                    )}</div>
                </div>
            );
        } else if (phase === PHASE_RECOVERY_KEY) {
            const store = SetupEncryptionStore.sharedInstance();
            let keyPrompt;
            if (keyHasPassphrase(store.keyInfo)) {
                keyPrompt = _t(
                    "Enter your Recovery Key or enter a <a>Recovery Passphrase</a> to continue.", {},
                    {
                        a: sub => <AccessibleButton
                            element="span"
                            className="mx_linkButton"
                            onClick={this._onUsePassphraseClick}
                        >{sub}</AccessibleButton>,
                    },
                );
            } else {
                keyPrompt = _t("Enter your Recovery Key to continue.");
            }

            const feedbackClasses = classNames({
                'mx_CompleteSecurity_recoveryKeyFeedback': true,
                'mx_CompleteSecurity_recoveryKeyFeedback_valid': this.state.recoveryKeyCorrect === true,
                'mx_CompleteSecurity_recoveryKeyFeedback_invalid': this.state.recoveryKeyCorrect === false,
            });
            const recoveryKeyFeedback = <div className={feedbackClasses}>
                {this.getKeyValidationText()}
            </div>;

            const Field = sdk.getComponent('elements.Field');
            return <form onSubmit={this._onRecoveryKeyFormSubmit}>
                <p>{keyPrompt}</p>
                <div className="mx_CompleteSecurity_recoveryKeyEntry">
                    <div className="mx_CompleteSecurity_recoveryKeyEntry_textInput">
                        <Field
                            type="text"
                            label={_t('Recovery Key')}
                            value={this.state.recoveryKey}
                            onChange={this._onRecoveryKeyChange}
                        />
                    </div>
                    <span className="mx_CompleteSecurity_recoveryKeyEntry_entryControlSeparatorText">
                        {_t("or")}
                    </span>
                    <div>
                        <input type="file"
                            className="mx_CompleteSecurity_recoveryKeyEntry_fileInput"
                            ref={this._collectFileUpload}
                            onChange={this._onRecoveryKeyFileChange}
                        />
                        <AccessibleButton kind="primary" onClick={this._onRecoveryKeyFileUploadClick}>
                            {_t("Upload")}
                        </AccessibleButton>
                    </div>
                </div>
                {recoveryKeyFeedback}
                <div className="mx_CompleteSecurity_actionRow">
                    <AccessibleButton kind="secondary" onClick={this._onRecoveryKeyCancelClick}>
                        {_t("Cancel")}
                    </AccessibleButton>
                    <AccessibleButton kind="primary"
                        disabled={!this.state.recoveryKeyCorrect}
                        onClick={this._onRecoveryKeyFormSubmit}
                    >
                        {_t("Continue")}
                    </AccessibleButton>
                </div>
            </form>;
        } else if (phase === PHASE_DONE) {
            let message;
            if (this.state.backupInfo) {
                message = <p>{_t(
                    "Your new session is now verified. It has access to your " +
                    "encrypted messages, and other users will see it as trusted.",
                )}</p>;
            } else {
                message = <p>{_t(
                    "Your new session is now verified. Other users will see it as trusted.",
                )}</p>;
            }
            return (
                <div>
                    <div className="mx_CompleteSecurity_heroIcon mx_E2EIcon_verified" />
                    {message}
                    <div className="mx_CompleteSecurity_actionRow">
                        <AccessibleButton
                            kind="primary"
                            onClick={this.onDoneClick}
                        >
                            {_t("Done")}
                        </AccessibleButton>
                    </div>
                </div>
            );
        } else if (phase === PHASE_CONFIRM_SKIP) {
            return (
                <div>
                    <p>{_t(
                        "Without completing security on this session, it won’t have " +
                        "access to encrypted messages.",
                    )}</p>
                    <div className="mx_CompleteSecurity_actionRow">
                        <AccessibleButton
                            className="warning"
                            kind="secondary"
                            onClick={this.onSkipConfirmClick}
                        >
                            {_t("Skip")}
                        </AccessibleButton>
                        <AccessibleButton
                            kind="danger"
                            onClick={this.onSkipBackClick}
                        >
                            {_t("Go Back")}
                        </AccessibleButton>
                    </div>
                </div>
            );
        } else if (phase === PHASE_BUSY) {
            const Spinner = sdk.getComponent('views.elements.Spinner');
            return <Spinner />;
        } else {
            console.log(`SetupEncryptionBody: Unknown phase ${phase}`);
        }
    }
}
