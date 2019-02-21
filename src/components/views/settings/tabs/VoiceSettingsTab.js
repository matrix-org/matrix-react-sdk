/*
Copyright 2019 New Vector Ltd

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
import {_t} from "../../../../languageHandler";
import CallMediaHandler from "../../../../CallMediaHandler";
import Field from "../../elements/Field";
import AccessibleButton from "../../elements/AccessibleButton";
import ToggleSwitch from "../../elements/ToggleSwitch";
import SettingsStore, {SettingLevel} from "../../../../settings/SettingsStore";
const Modal = require("../../../../Modal");
const sdk = require("../../../../index");
const MatrixClientPeg = require("../../../../MatrixClientPeg");
const PlatformPeg = require("../../../../PlatformPeg");

let listenKeydown = null;
let listenKeyup = null;

export default class VoiceSettingsTab extends React.Component {
    constructor() {
        super();

        this.state = {
            mediaDevices: null,
            activeAudioOutput: null,
            activeAudioInput: null,
            activeVideoInput: null,
            pushToTalkAscii: SettingsStore.getValue('pushToTalk').ascii,
            pushToTalkKeybinding: SettingsStore.getValue('pushToTalk').keybinding,
            pushToTalkEnabled: SettingsStore.getValue('pushToTalk').enabled,
        };
    }

    componentWillMount(): void {
        this._refreshMediaDevices();
    }

    componentWillUnmount(): void {
        if (PlatformPeg.get().supportsAutoLaunch()) {
            //ipcRenderer.get().removeListener('settings', this._electronSettings);

            // Stop recording push-to-talk shortcut if Settings or tab is closed
            this._stopRecordingGlobalShortcut();
        }
    }

    _translateKeybinding = (key) => {
        // Custom translations to make keycodes look nicer

        // KeyA -> A
        if (key.startsWith('Key')) {
            key = key.substring(3);
        }

        return key;
    }

    _startRecordingGlobalShortcut = (asciiStateKey, codeStateKey) => {
        const keyAscii = [];
        const keyCodes = [];
        const self = this;

        // Record keypresses using KeyboardEvent
        // Used for displaying ascii-representation of current keys
        // in the UI
        listenKeydown = (event) => {
            // TODO: Show RightShift and things
            const key = self._translateKeybinding(event.code);
            const index = keyAscii.indexOf(key);
            if (index === -1) {
                keyAscii.push(key);
                self.setState({pushToTalkAscii: keyAscii.join(' + ')});
            }
            event.preventDefault();
        };

        listenKeyup = (event) => {
            const index = keyAscii.indexOf(self._translateKeybinding(event.code));
            if (index !== -1) {
                keyAscii.splice(index, 1);
            }
            event.preventDefault();
        };

        window.addEventListener("keydown", listenKeydown);
        window.addEventListener("keyup", listenKeyup);

        // Record keypresses using iohook
        // Used for getting keycode-representation of current keys
        // for later global shortcut registration
        PlatformPeg.get().startListeningKeys();

        // When a key is pressed, add all current pressed keys to the shortcut
        // When a key is lifted, don't remove it from the shortcut

        // This enables a nicer shortcut-recording experience, as the user can
        // press down their desired keys, release them, and then save the
        // shortcut without all the keys disappearing
        PlatformPeg.get().onKeypress(this, (ev, event) => {
            if (event.keydown) {
                const index = keyCodes.indexOf(event.keycode);
                if (index === -1) {
                    keyCodes.push(event.keycode);
                    // slice is needed here to save a new copy of the keycodes
                    // array to the state, else if we update keycodes later, it
                    // still updates the state since the state has a ref to this array
                    this.setState({pushToTalkKeybinding: keyCodes.slice()});
                }
            } else {
                const index = keyCodes.indexOf(event.keycode);
                if (index !== -1) {
                    keyCodes.splice(index, 1);
                }
            }
        });

        // Stop recording shortcut if window loses focus
        PlatformPeg.get().onWindowBlurred(() => {
            if (this.state.settingKeybinding) {
                // TODO: Figure out why listener is not a function
                //this._stopRecordingGlobalShortcut();
            }
        });
    }

    _stopRecordingGlobalShortcut = () => {
        // Stop recording KeyboardEvent keypresses
        window.removeEventListener("keydown", listenKeydown);
        window.removeEventListener("keyup", listenKeyup);

        // Stop recording iohook keypresses
        PlatformPeg.get().stopListeningKeys();

        this.setState({settingKeybinding: false});
    }

    _onSetPushToTalkClicked = () => {
        // Either record or save a new shortcut
        const PushToTalk = require('../../../../PushToTalk');
        const id = 'pushToTalk';
        const currentPTTState = SettingsStore.getValue(id);

        // Determine if we're reading shortcuts or setting them
        if (!this.state.settingKeybinding) {
            // Start listening for keypresses and show current
            // held shortcut on screen
            // Run some sort of function that just loops until the state changes back to
            // not setting
            this.state.pushToTalkAscii = 'Press Keys';
            this._startRecordingGlobalShortcut('pushToTalkAscii', 'pushToTalkKeybinding');
        } else {
            this._stopRecordingGlobalShortcut();

            // Disable and unregister old shortcut
            PushToTalk.disable();

            // Set the keybinding they've currently selected
            currentPTTState.keybinding = this.state.pushToTalkKeybinding;
            currentPTTState.ascii = this.state.pushToTalkAscii;

            // Update push to talk keybinding
            SettingsStore.setValue(id, null, SettingLevel.DEVICE, currentPTTState);

            // Enable and register new shortcut
            PushToTalk.enable(currentPTTState.keybinding);
        }

        // Toggle setting state
        this.setState({settingKeybinding: !this.state.settingKeybinding});
    }

    _onTogglePushToTalkClicked = (e) => {
        // Enable or disable push to talk functionality
        const PushToTalk = require('../../../../PushToTalk');
        const id = 'pushToTalk';
        const currentPTTState = SettingsStore.getValueAt(SettingLevel.DEVICE, id);

        if (e.target.checked) {
            // Enable push to talk

            this.setState({pushToTalkEnabled: true});
            currentPTTState.enabled = true;
            SettingsStore.setValue(id, null, SettingLevel.DEVICE, currentPTTState);

            PushToTalk.enable(currentPTTState.keybinding);
        } else {
            // Disable push to talk

            this.setState({pushToTalkEnabled: false});
            currentPTTState.enabled = false;
            SettingsStore.setValue(id, null, SettingLevel.DEVICE, currentPTTState);
            this.setState({pushToTalkKeybinding: []});

            PushToTalk.disable();
        }
    }

    _renderPushToTalkSettings = () => {
        const id = "pushToTalk";
        const buttonLabel = this.state.settingKeybinding ? 'Stop' : 'Set';
        const activated = SettingsStore.getValueAt(SettingLevel.DEVICE, id).enabled;

        return (
            <div>
            <table>
            <tbody>
                <tr>
                    <td>
                        <input type="checkbox"
                            name={id}
                            defaultChecked={activated}
                            onChange={this._onTogglePushToTalkClicked}
                        />
                        <label htmlFor={id}>{SettingsStore.getDisplayName(id)}</label>
                    </td>
                    <td>{"Shortcut: " + this.state.pushToTalkAscii}</td>
                    <td>
                        <button key={id} className="mx_Dialog_primary"
                                onClick={this._onSetPushToTalkClicked}
                                disabled={!this.state.pushToTalkEnabled}>
                        {buttonLabel}
                        </button>
                    </td>
                </tr>
            </tbody>
            </table>
            </div>
        );
    }

    _refreshMediaDevices = async (stream) => {
        if (stream) {
            // kill stream so that we don't leave it lingering around with webcam enabled etc
            // as here we called gUM to ask user for permission to their device names only
            stream.getTracks().forEach((track) => track.stop());
        }

        this.setState({
            mediaDevices: await CallMediaHandler.getDevices(),
            activeAudioOutput: CallMediaHandler.getAudioOutput(),
            activeAudioInput: CallMediaHandler.getAudioInput(),
            activeVideoInput: CallMediaHandler.getVideoInput(),
        });
    };

    _requestMediaPermissions = () => {
        const getUserMedia = (
            window.navigator.getUserMedia || window.navigator.webkitGetUserMedia || window.navigator.mozGetUserMedia
        );
        if (getUserMedia) {
            return getUserMedia.apply(window.navigator, [
                { video: true, audio: true },
                this._refreshMediaDevices,
                function() {
                    const ErrorDialog = sdk.getComponent('dialogs.ErrorDialog');
                    Modal.createTrackedDialog('No media permissions', '', ErrorDialog, {
                        title: _t('No media permissions'),
                        description: _t('You may need to manually permit Riot to access your microphone/webcam'),
                    });
                },
            ]);
        }
    };

    _setAudioOutput = (e) => {
        CallMediaHandler.setAudioOutput(e.target.value);
    };

    _setAudioInput = (e) => {
        CallMediaHandler.setAudioInput(e.target.value);
    };

    _setVideoInput = (e) => {
        CallMediaHandler.setVideoInput(e.target.value);
    };

    _changeWebRtcMethod = (p2p) => {
        MatrixClientPeg.get().setForceTURN(!p2p);
    };

    _renderDeviceOptions(devices, category) {
        return devices.map((d) => <option key={`${category}-${d.deviceId}`} value={d.deviceId}>{d.label}</option>);
    }

    render() {
        const SettingsFlag = sdk.getComponent("views.elements.SettingsFlag");

        let requestButton = null;
        let speakerDropdown = null;
        let microphoneDropdown = null;
        let webcamDropdown = null;
        let pushToTalk = null;
        if (this.state.mediaDevices === false) {
            requestButton = (
                <div className='mx_VoiceSettingsTab_missingMediaPermissions'>
                    <p>{_t("Missing media permissions, click the button below to request.")}</p>
                    <AccessibleButton onClick={this._requestMediaPermissions} kind="primary">
                        {_t("Request media permissions")}
                    </AccessibleButton>
                </div>
            );
        } else if (this.state.mediaDevices) {
            speakerDropdown = <p>{ _t('No Audio Outputs detected') }</p>;
            microphoneDropdown = <p>{ _t('No Microphones detected') }</p>;
            webcamDropdown = <p>{ _t('No Webcams detected') }</p>;

            const defaultOption = {
                deviceId: '',
                label: _t('Default Device'),
            };
            const getDefaultDevice = (devices) => {
                if (!devices.some((i) => i.deviceId === 'default')) {
                    devices.unshift(defaultOption);
                    return '';
                } else {
                    return 'default';
                }
            };

            const audioOutputs = this.state.mediaDevices.audiooutput.slice(0);
            if (audioOutputs.length > 0) {
                const defaultDevice = getDefaultDevice(audioOutputs);
                speakerDropdown = (
                    <Field element="select" label={_t("Audio Output")} id="audioOutput"
                           value={this.state.activeAudioOutput || defaultDevice}
                           onChange={this._setAudioOutput}>
                        {this._renderDeviceOptions(audioOutputs, 'audioOutput')}
                    </Field>
                );
            }

            const audioInputs = this.state.mediaDevices.audioinput.slice(0);
            if (audioInputs.length > 0) {
                const defaultDevice = getDefaultDevice(audioInputs);
                microphoneDropdown = (
                    <Field element="select" label={_t("Microphone")} id="audioInput"
                           value={this.state.activeAudioInput || defaultDevice}
                           onChange={this._setAudioInput}>
                        {this._renderDeviceOptions(audioInputs, 'audioInput')}
                    </Field>
                );
            }

            const videoInputs = this.state.mediaDevices.videoinput.slice(0);
            if (videoInputs.length > 0) {
                const defaultDevice = getDefaultDevice(videoInputs);
                webcamDropdown = (
                    <Field element="select" label={_t("Camera")} id="videoInput"
                           value={this.state.activeVideoInput || defaultDevice}
                           onChange={this._setVideoInput}>
                        {this._renderDeviceOptions(videoInputs, 'videoInput')}
                    </Field>
                );
            }
        }

        if (PlatformPeg.get().supportsAutoLaunch()) {
            const id = "pushToTalk";
            const buttonLabel = this.state.settingKeybinding ? _t('Stop') : _t('Set');
            const activated = SettingsStore.getValueAt(SettingLevel.DEVICE, id).enabled;

            pushToTalk = (
                <div className="mx_UserSettings_toggle" key={id}>
                    <span>
                        <input type="checkbox"
                            name={id}
                            defaultChecked={activated}
                            onChange={this._onTogglePushToTalkClicked}
                        />
                        <label htmlFor={id}>{SettingsStore.getDisplayName(id)}</label>
                    </span>
                    <span>{" | Shortcut: " + this.state.pushToTalkAscii + " "}</span>
                    <span>
                        <button key={id} className="mx_textButton"
                                onClick={this._onSetPushToTalkClicked}
                                disabled={!this.state.pushToTalkEnabled}>
                        {buttonLabel}
                        </button>
                    </span>
                </div>
            );
        }

        return (
            <div className="mx_SettingsTab mx_VoiceSettingsTab">
                <div className="mx_SettingsTab_heading">{_t("Voice & Video")}</div>
                <div className="mx_SettingsTab_section">
                    {requestButton}
                    {speakerDropdown}
                    {microphoneDropdown}
                    {webcamDropdown}
                    {pushToTalk}
                    <SettingsFlag name='VideoView.flipVideoHorizontally' level={SettingLevel.ACCOUNT} />
                    <SettingsFlag name='webRtcAllowPeerToPeer' level={SettingLevel.DEVICE} onChange={this._changeWebRtcMethod} />
                </div>
            </div>
        );
    }
}
