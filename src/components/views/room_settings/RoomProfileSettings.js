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
import {_t} from "../../../languageHandler";
import {MatrixClientPeg} from "../../../MatrixClientPeg";
import Field from "../elements/Field";
import * as sdk from "../../../index";
import {replaceableComponent} from "../../../utils/replaceableComponent";
import {mediaFromMxc} from "../../../customisations/Media";

// TODO: Merge with ProfileSettings?
@replaceableComponent("views.room_settings.RoomProfileSettings")
export default class RoomProfileSettings extends React.Component {
    static propTypes = {
        roomId: PropTypes.string.isRequired,
    };

    constructor(props) {
        super(props);

        const client = MatrixClientPeg.get();
        const room = client.getRoom(props.roomId);
        if (!room) throw new Error("Expected a room for ID: ", props.roomId);

        const avatarEvent = room.currentState.getStateEvents("m.room.avatar", "");
        let avatarUrl = avatarEvent && avatarEvent.getContent() ? avatarEvent.getContent()["url"] : null;
        if (avatarUrl) avatarUrl = mediaFromMxc(avatarUrl).getSquareThumbnailHttp(96);

        const topicEvent = room.currentState.getStateEvents("m.room.topic", "");
        const topic = topicEvent && topicEvent.getContent() ? topicEvent.getContent()['topic'] : '';

        const nameEvent = room.currentState.getStateEvents('m.room.name', '');
        const name = nameEvent && nameEvent.getContent() ? nameEvent.getContent()['name'] : '';

        this.state = {
            originalDisplayName: name,
            displayName: name,
            originalAvatarUrl: avatarUrl,
            avatarUrl: avatarUrl,
            avatarFile: null,
            originalTopic: topic,
            topic: topic,
            enableProfileSave: false,
            canSetName: room.currentState.maySendStateEvent('m.room.name', client.getUserId()),
            canSetTopic: room.currentState.maySendStateEvent('m.room.topic', client.getUserId()),
            canSetAvatar: room.currentState.maySendStateEvent('m.room.avatar', client.getUserId()),
        };

        this._avatarUpload = createRef();
    }

    _uploadAvatar = () => {
        this._avatarUpload.current.click();
    };

    _removeAvatar = () => {
        // clear file upload field so same file can be selected
        this._avatarUpload.current.value = "";
        this.setState({
            avatarUrl: null,
            avatarFile: null,
            enableProfileSave: true,
        });
    };

    _cancelProfileChanges = async (e) => {
        e.stopPropagation();
        e.preventDefault();

        if (!this.state.enableProfileSave) return;
        this.setState({
            enableProfileSave: false,
            displayName: this.state.originalDisplayName,
            topic: this.state.originalTopic,
            avatarUrl: this.state.originalAvatarUrl,
            avatarFile: null,
        });
    };

    _saveProfile = async (e) => {
        e.stopPropagation();
        e.preventDefault();

        if (!this.state.enableProfileSave) return;
        this.setState({enableProfileSave: false});

        const client = MatrixClientPeg.get();
        const newState = {};

        // TODO: What do we do about errors?
        const displayName = this.state.displayName.trim();
        if (this.state.originalDisplayName !== this.state.displayName) {
            await client.setRoomName(this.props.roomId, displayName);
            newState.originalDisplayName = displayName;
            newState.displayName = displayName;
        }

        if (this.state.avatarFile) {
            const uri = await client.uploadContent(this.state.avatarFile);
            await client.sendStateEvent(this.props.roomId, 'm.room.avatar', {url: uri}, '');
            newState.avatarUrl = mediaFromMxc(uri).getSquareThumbnailHttp(96);
            newState.originalAvatarUrl = newState.avatarUrl;
            newState.avatarFile = null;
        } else if (this.state.originalAvatarUrl !== this.state.avatarUrl) {
            await client.sendStateEvent(this.props.roomId, 'm.room.avatar', {}, '');
        }

        if (this.state.originalTopic !== this.state.topic) {
            await client.setRoomTopic(this.props.roomId, this.state.topic);
            newState.originalTopic = this.state.topic;
        }

        this.setState(newState);
    };

    _onDisplayNameChanged = (e) => {
        this.setState({displayName: e.target.value});
        if (this.state.originalDisplayName === e.target.value) {
            this.setState({enableProfileSave: false});
        } else {
            this.setState({enableProfileSave: true});
        }
    };

    _onTopicChanged = (e) => {
        this.setState({topic: e.target.value});
        if (this.state.originalTopic === e.target.value) {
            this.setState({enableProfileSave: false});
        } else {
            this.setState({enableProfileSave: true});
        }
    };

    _onAvatarChanged = (e) => {
        if (!e.target.files || !e.target.files.length) {
            this.setState({
                avatarUrl: this.state.originalAvatarUrl,
                avatarFile: null,
                enableProfileSave: false,
            });
            return;
        }

        const file = e.target.files[0];
        const reader = new FileReader();
        reader.onload = (ev) => {
            this.setState({
                avatarUrl: ev.target.result,
                avatarFile: file,
                enableProfileSave: true,
            });
        };
        reader.readAsDataURL(file);
    };

    render() {
        const AccessibleButton = sdk.getComponent('elements.AccessibleButton');
        const AvatarSetting = sdk.getComponent('settings.AvatarSetting');

        let profileSettingsButtons;
        if (
            this.state.canSetName ||
            this.state.canSetTopic ||
            this.state.canSetAvatar
        ) {
            profileSettingsButtons = (
                <div className="mx_ProfileSettings_buttons">
                    <AccessibleButton
                        onClick={this._cancelProfileChanges}
                        kind="link"
                        disabled={!this.state.enableProfileSave}
                    >
                        {_t("Cancel")}
                    </AccessibleButton>
                    <AccessibleButton
                        onClick={this._saveProfile}
                        kind="primary"
                        disabled={!this.state.enableProfileSave}
                    >
                        {_t("Save")}
                    </AccessibleButton>
                </div>
            );
        }

        return (
            <form
                onSubmit={this._saveProfile}
                autoComplete="off"
                noValidate={true}
                className="mx_ProfileSettings_profileForm"
            >
                <input
                    type="file"
                    ref={this._avatarUpload}
                    className="mx_ProfileSettings_avatarUpload"
                    onChange={this._onAvatarChanged}
                    accept="image/*"
                />
                <div className="mx_ProfileSettings_profile">
                    <div className="mx_ProfileSettings_controls">
                        <Field
                            label={_t("Room Name")}
                            type="text"
                            value={this.state.displayName}
                            autoComplete="off"
                            onChange={this._onDisplayNameChanged}
                            disabled={!this.state.canSetName}
                        />
                        <Field
                            className="mx_ProfileSettings_controls_topic"
                            id="profileTopic"
                            label={_t("Room Topic")}
                            disabled={!this.state.canSetTopic}
                            type="text"
                            value={this.state.topic}
                            autoComplete="off"
                            onChange={this._onTopicChanged}
                            element="textarea"
                        />
                    </div>
                    <AvatarSetting
                        avatarUrl={this.state.avatarUrl}
                        avatarName={this.state.displayName || this.props.roomId}
                        avatarAltText={_t("Room avatar")}
                        uploadAvatar={this.state.canSetAvatar ? this._uploadAvatar : undefined}
                        removeAvatar={this.state.canSetAvatar ? this._removeAvatar : undefined} />
                </div>
                { profileSettingsButtons }
            </form>
        );
    }
}
