/*
Copyright 2017 Vector Creations Ltd

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

import FileSaver from 'file-saver';
import React from 'react';
import { _t } from '../../../languageHandler';

import * as Matrix from 'matrix-js-sdk';
import * as MegolmExportEncryption from '../../../utils/MegolmExportEncryption';
import sdk from '../../../index';

const PHASE_EDIT = 1;
const PHASE_EXPORTING = 2;

export default React.createClass({
    displayName: 'ExportE2eKeysDialog',

    propTypes: {
        matrixClient: React.PropTypes.instanceOf(Matrix.MatrixClient).isRequired,
        onFinished: React.PropTypes.func.isRequired,
    },

    getInitialState: function() {
        return {
            phase: PHASE_EDIT,
            errStr: null,
        };
    },

    componentWillMount: function() {
        this._unmounted = false;
    },

    componentWillUnmount: function() {
        this._unmounted = true;
    },

    _onPassphraseFormSubmit: function(ev) {
        ev.preventDefault();

        const passphrase = this.refs.passphrase1.value;
        if (passphrase !== this.refs.passphrase2.value) {
            this.setState({errStr: _t('Passphrases must match')});
            return false;
        }
        if (!passphrase) {
            this.setState({errStr: _t('Passphrase must not be empty')});
            return false;
        }

        this._startExport(passphrase);
        return false;
    },

    _startExport: function(passphrase) {
        // extra Promise.resolve() to turn synchronous exceptions into
        // asynchronous ones.
        Promise.resolve().then(() => {
            return this.props.matrixClient.exportRoomKeys();
        }).then((k) => {
            return MegolmExportEncryption.encryptMegolmKeyFile(
                JSON.stringify(k), passphrase,
            );
        }).then((f) => {
            const blob = new Blob([f], {
                type: 'text/plain;charset=us-ascii',
            });
            FileSaver.saveAs(blob, 'riot-keys.txt');
            this.props.onFinished(true);
        }).catch((e) => {
            console.error("Error exporting e2e keys:", e);
            if (this._unmounted) {
                return;
            }
            const msg = e.friendlyText || _t('Unknown error');
            this.setState({
                errStr: msg,
                phase: PHASE_EDIT,
            });
        });

        this.setState({
            errStr: null,
            phase: PHASE_EXPORTING,
        });
    },

    _onCancelClick: function(ev) {
        ev.preventDefault();
        this.props.onFinished(false);
        return false;
    },

    render: function() {
        const BaseDialog = sdk.getComponent('views.dialogs.BaseDialog');

        const disableForm = (this.state.phase === PHASE_EXPORTING);

        return (
            <BaseDialog className='mx_exportE2eKeysDialog'
                onFinished={this.props.onFinished}
                title={_t("Export room keys")}
            >
                <form onSubmit={this._onPassphraseFormSubmit}>
                    <div className="mx_Dialog_content">
                        <p>
                            { _t(
                                'This process allows you to export the keys for messages ' +
                                'you have received in encrypted rooms to a local file. You ' +
                                'will then be able to import the file into another Matrix ' +
                                'client in the future, so that client will also be able to ' +
                                'decrypt these messages.',
                            ) }
                        </p>
                        <p>
                            { _t(
                                'The exported file will allow anyone who can read it to decrypt ' +
                                'any encrypted messages that you can see, so you should be ' +
                                'careful to keep it secure. To help with this, you should enter ' +
                                'a passphrase below, which will be used to encrypt the exported ' +
                                'data. It will only be possible to import the data by using the ' +
                                'same passphrase.',
                            ) }
                        </p>
                        <div className='error'>
                            { this.state.errStr }
                        </div>
                        <div className='mx_E2eKeysDialog_inputTable'>
                            <div className='mx_E2eKeysDialog_inputRow'>
                                <div className='mx_E2eKeysDialog_inputLabel'>
                                    <label htmlFor='passphrase1'>
                                        { _t("Enter passphrase") }
                                    </label>
                                </div>
                                <div className='mx_E2eKeysDialog_inputCell'>
                                    <input ref='passphrase1' id='passphrase1'
                                        autoFocus={true} size='64' type='password'
                                        disabled={disableForm}
                                    />
                                </div>
                            </div>
                            <div className='mx_E2eKeysDialog_inputRow'>
                                <div className='mx_E2eKeysDialog_inputLabel'>
                                    <label htmlFor='passphrase2'>
                                        { _t("Confirm passphrase") }
                                    </label>
                                </div>
                                <div className='mx_E2eKeysDialog_inputCell'>
                                    <input ref='passphrase2' id='passphrase2'
                                        size='64' type='password'
                                        disabled={disableForm}
                                    />
                                </div>
                            </div>
                        </div>
                    </div>
                    <div className='mx_Dialog_buttons'>
                        <input className='mx_Dialog_primary' type='submit' value={_t('Export')}
                             disabled={disableForm}
                        />
                        <button onClick={this._onCancelClick} disabled={disableForm}>
                            { _t("Cancel") }
                        </button>
                    </div>
                </form>
            </BaseDialog>
        );
    },
});
