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
import PropTypes from 'prop-types';
import {_t} from "../../../languageHandler";
import MatrixClientPeg from "../../../MatrixClientPeg";
import Field from "../elements/Field";
import AccessibleButton from "../elements/AccessibleButton";
import classNames from 'classnames';
import LabelledToggleSwitch from "../elements/LabelledToggleSwitch";
const sdk = require("../../../index");
import Modal from '../../../Modal';
import Tchap from '../../../Tchap';

// TODO: Merge with ProfileSettings?
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
        if (avatarUrl) avatarUrl = client.mxcUrlToHttp(avatarUrl, 96, 96, 'crop', false);

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
            access_rules: Tchap.getAccessRules(props.roomId),
            join_rules: this._getJoinRules(props.roomId),
        };
    }

    _uploadAvatar = (e) => {
        e.stopPropagation();
        e.preventDefault();

        this.refs.avatarUpload.click();
    };

    _saveProfile = async (e) => {
        e.stopPropagation();
        e.preventDefault();

        if (!this.state.enableProfileSave) return;
        this.setState({enableProfileSave: false});

        const client = MatrixClientPeg.get();
        const newState = {};

        // TODO: What do we do about errors?

        if (this.state.originalDisplayName !== this.state.displayName) {
            await client.setRoomName(this.props.roomId, this.state.displayName);
            newState.originalDisplayName = this.state.displayName;
        }

        if (this.state.avatarFile) {
            const uri = await client.uploadContent(this.state.avatarFile);
            await client.sendStateEvent(this.props.roomId, 'm.room.avatar', {url: uri}, '');
            newState.avatarUrl = client.mxcUrlToHttp(uri, 96, 96, 'crop', false);
            newState.originalAvatarUrl = newState.avatarUrl;
            newState.avatarFile = null;
        }

        if (this.state.originalTopic !== this.state.topic) {
            await client.setRoomTopic(this.props.roomId, this.state.topic);
            newState.originalTopic = this.state.topic;
        }

        this.setState(newState);
    };

    _onDisplayNameChanged = (e) => {
        this.setState({
            displayName: e.target.value,
            enableProfileSave: true,
        });
    };

    _onTopicChanged = (e) => {
        this.setState({
            topic: e.target.value,
            enableProfileSave: true,
        });
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

    _getJoinRules = (roomId) => {
        const stateEventType = "m.room.join_rules";
        const keyName = "join_rule";
        const defaultValue = "public";
        const room = MatrixClientPeg.get().getRoom(roomId);
        const event = room.currentState.getStateEvents(stateEventType, '');
        if (!event) {
            return defaultValue;
        }
        const content = event.getContent();
        return keyName in content ? content[keyName] : defaultValue;
    };

    _onExternAllowedSwitchChange = () => {
        const self = this;
        const access_rules = this.state.access_rules;
        const QuestionDialog = sdk.getComponent("dialogs.QuestionDialog");
        Modal.createTrackedDialog('Allow the externals to join this room', '', QuestionDialog, {
            title: _t('Allow the externals to join this room'),
            description: ( _t('This action is irreversible.') + " " + _t('Are you sure you want to allow the externals to join this room ?')),
            onFinished: (confirm) => {
                if (confirm) {
                    self.setState({
                        access_rules: 'unrestricted'
                    });
                    MatrixClientPeg.get().sendStateEvent(
                        self.props.roomId, "im.vector.room.access_rules",
                        { rule: 'unrestricted' },
                        "",
                    )
                } else {
                    self.setState({
                        access_rules
                    });
                }
            },
        });
    };

    render() {
        // TODO: Why is rendering a box with an overlay so complicated? Can the DOM be reduced?
        const client = MatrixClientPeg.get();
        const room = client.getRoom(this.props.roomId);
        const isCurrentUserAdmin = room.getMember(client.getUserId()).powerLevelNorm >= 100;

        let showOverlayAnyways = true;
        let avatarElement = <div className="mx_ProfileSettings_avatarPlaceholder" />;
        if (this.state.avatarUrl) {
            showOverlayAnyways = false;
            avatarElement = <img src={this.state.avatarUrl}
                                 alt={_t("Room avatar")} />;
        }

        const avatarOverlayClasses = classNames({
            "mx_ProfileSettings_avatarOverlay": true,
            "mx_ProfileSettings_avatarOverlay_show": showOverlayAnyways,
        });
        let avatarHoverElement = (
            <div className={avatarOverlayClasses} onClick={this._uploadAvatar}>
                <span className="mx_ProfileSettings_avatarOverlayText">{_t("Upload room avatar")}</span>
                <div className="mx_ProfileSettings_avatarOverlayImgContainer">
                    <div className="mx_ProfileSettings_avatarOverlayImg" />
                </div>
            </div>
        );
        if (!this.state.canSetAvatar) {
            if (!showOverlayAnyways) {
                avatarHoverElement = null;
            } else {
                const disabledOverlayClasses = classNames({
                    "mx_ProfileSettings_avatarOverlay": true,
                    "mx_ProfileSettings_avatarOverlay_show": true,
                    "mx_ProfileSettings_avatarOverlay_disabled": true,
                });
                avatarHoverElement = (
                    <div className={disabledOverlayClasses}>
                        <span className="mx_ProfileSettings_noAvatarText">{_t("No room avatar")}</span>
                    </div>
                );
            }
        }
        let accessRule = null;
        if (isCurrentUserAdmin && this.state.join_rules !== "public") {
            accessRule = (
                <LabelledToggleSwitch value={this.state.access_rules === "unrestricted"}
                                      onChange={ this._onExternAllowedSwitchChange }
                                      label={ _t('Allow the externals to join this room') }
                                      disabled={ this.state.access_rules === "unrestricted" } />
            );
        }

        return (
            <form onSubmit={this._saveProfile} autoComplete={false} noValidate={true}>
                <input type="file" ref="avatarUpload" className="mx_ProfileSettings_avatarUpload"
                       onChange={this._onAvatarChanged} accept="image/*" />
                <div className="mx_ProfileSettings_profile">
                    <div className="mx_ProfileSettings_controls">
                        <Field id="profileDisplayName" label={_t("Room Name")}
                               type="text" value={this.state.displayName} autoComplete="off"
                               onChange={this._onDisplayNameChanged} disabled={!this.state.canSetName} />
                        <Field id="profileTopic" label={_t("Room Topic")} disabled={!this.state.canSetTopic}
                               type="text" value={this.state.topic} autoComplete="off"
                               onChange={this._onTopicChanged} element="textarea" />
                    </div>
                    <div className="mx_ProfileSettings_avatar">
                        {avatarElement}
                        {avatarHoverElement}
                    </div>
                </div>
                { accessRule }
                <AccessibleButton onClick={this._saveProfile} kind="primary"
                                  disabled={!this.state.enableProfileSave}>
                    {_t("Save")}
                </AccessibleButton>
            </form>
        );
    }
}
