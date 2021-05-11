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

import React, {createRef} from 'react';
import PropTypes from 'prop-types';
import {_t} from "../../../../../languageHandler";
import {MatrixClientPeg} from "../../../../../MatrixClientPeg";
import AccessibleButton from "../../../elements/AccessibleButton";
import Notifier from "../../../../../Notifier";
import SettingsStore from '../../../../../settings/SettingsStore';
import {SettingLevel} from "../../../../../settings/SettingLevel";
import {replaceableComponent} from "../../../../../utils/replaceableComponent";
import Field from "../../../elements/Field";
import Modal from '../../../../../Modal';
import * as sdk from '../../../../../index';

@replaceableComponent("views.settings.tabs.room.NotificationsSettingsTab")
export default class NotificationsSettingsTab extends React.Component {
    static propTypes = {
        roomId: PropTypes.string.isRequired,
    };

    _soundUpload = createRef();

    constructor() {
        super();

        this.state = {
            currentSound: "default",
            currentSoundReplaced: false,
            selected: null,
            soundLibrary: {},
        };
    }

    // TODO: [REACT-WARNING] Replace component with real class, use constructor for refs
    UNSAFE_componentWillMount() { // eslint-disable-line camelcase
        const soundData = SettingsStore.getValue("notificationSound", this.props.roomId);
        const soundLibrary = SettingsStore.getValue("soundLibrary", null);
        console.log(soundLibrary);
        const selected = (soundData === null) ? "default" : soundData.name;
        this.setState({
            currentSound:  soundData.name || soundData.url,
            selected:      selected,
            soundLibrary:  soundLibrary,
        });
    }

    async _triggerUploader() {
        this._soundUpload.current.click();
    }

    async _onSoundUploadChanged(e) {
        if (!e.target.files || !e.target.files.length) {
            return;
        }

        const file = e.target.files[0];
        let soundLibrary = this.state.soundLibrary;

        if (file.name in soundLibrary) {
            const QuestionDialog = sdk.getComponent('dialogs.QuestionDialog');
            Modal.createDialog(QuestionDialog, {
                title: _t("Replace File"),
                description: _t("There already exists a file with this name. " +
                    "Are you sure, you want to replace it?"),
                button: _t("Replace"),
                onFinished: () => {
                    this.setState({currentSoundReplaced: true});
                    this._uploadSound(file);
                },
            });

            return;
        }
        this._uploadSound(file);

    }

    async _uploadSound(file) {

        let type = file.type;
        if (type === "video/ogg") {
            // XXX: I've observed browsers allowing users to pick a audio/ogg files,
            // and then calling it a video/ogg. This is a lame hack, but man browsers
            // suck at detecting mimetypes.
            type = "audio/ogg";
        }

        const url = await MatrixClientPeg.get().uploadContent(
            file, {
                type,
            },
        );

        const soundJSON = {
            name: file.name,
            type: type,
            size: file.size,
            url,
        };

        let soundLibrary = this.state.soundLibrary;
        soundLibrary[soundJSON.name] = soundJSON;

        await SettingsStore.setValue(
            "soundLibrary",
            null,
            SettingLevel.ACCOUNT,
            soundLibrary,
        );

        this.setState({
            soundLibrary: soundLibrary,
            selected:     soundJSON.name,
        });

    }

    async _onClickSaveSound(e) {
        e.stopPropagation();
        e.preventDefault();

        try {
            await this._saveSound();
        } catch (ex) {
            console.error(
                `Unable to save notification sound for ${this.props.roomId}`,
            );
            console.error(ex);
        }
    }

    async _saveSound() {
        if (!this.state.selected) {
            return;
        }

        if (this.state.selected == "default") {
            this._clearSound();
            return;
        }

        const soundJSON = this.state.soundLibrary[this.state.selected];

        await SettingsStore.setValue(
            "notificationSound",
            this.props.roomId,
            SettingLevel.ROOM_ACCOUNT,
            soundJSON,
        );

        this.setState({
            currentSound: soundJSON.name,
        });
    }

    _clearSound() {
        SettingsStore.setValue(
            "notificationSound",
            this.props.roomId,
            SettingLevel.ROOM_ACCOUNT,
            null,
        );

        this.setState({
            currentSound: "default",
        });
    }

    _onReset() {
        this.setState({
            selected: this.state.currentSound,
        });
    }

    _onChangeSelection(e) {
        e.stopPropagation();
        e.preventDefault();

        if (e.target.value === "upload") {
            this._triggerUploader();
            return;
        }

        this.setState({
            selected: e.target.value,
        });
    }


    render() {

        const notChanged = this.state.currentSound == this.state.selected && !this.state.currentSoundReplaced;

        return (
            <div className="mx_SettingsTab">
                <div className="mx_SettingsTab_heading">{_t("Notifications")}</div>
                <div className='mx_SettingsTab_section mx_SettingsTab_subsectionText'>
                    <span className='mx_SettingsTab_subheading'>{_t("Sounds")}</span>
                    <div>
                        <span>{_t("Notification sound")}: <code>{this.state.currentSound}</code></span><br />
                    </div>
                    <div>
                        <h3>{_t("Select a custom sound")}</h3>
                        <Field
                            id="soundLibrary"
                            element="select"
                            label="custom sound"
                            value={this.state.selected}
                            onChange={this._onChangeSelection.bind(this)}
                        >
                            <option key="default" value="default">{_t("Default")}</option>
                            {Object.keys(this.state.soundLibrary).map((sound, i) => <option key={i} value={sound}>{sound}</option>)}
                            <option key="uplod" value="upload">{_t("upload")}</option>
                        </Field>
                        <form autoComplete="off" noValidate={true}>
                            <input ref={this._soundUpload} className="mx_NotificationSound_soundUpload" type="file" onChange={this._onSoundUploadChanged.bind(this)} accept="audio/*" />
                        </form>

                        <AccessibleButton className="mx_NotificationSound_resetSound" disabled={notChanged} onClick={this._onReset.bind(this)} kind="primary">
                            {_t("Reset")}
                        </AccessibleButton>
                        <AccessibleButton className="mx_NotificationSound_save" disabled={notChanged} onClick={this._onClickSaveSound.bind(this)} kind="primary">
                            {_t("Save")}
                        </AccessibleButton>
                        <br />
                    </div>
                </div>
            </div>
        );
    }
}
