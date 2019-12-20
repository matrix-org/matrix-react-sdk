/*
Copyright 2015, 2016 OpenMarket Ltd

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
import createReactClass from 'create-react-class';
import {MatrixClientPeg} from "../../../MatrixClientPeg";
import * as sdk from '../../../index';
import { _t } from '../../../languageHandler';

export default createReactClass({
    displayName: 'ChangeAvatar',
    propTypes: {
        initialAvatarUrl: PropTypes.string,
        room: PropTypes.object,
        // if false, you need to call changeAvatar.onFileSelected yourself.
        showUploadSection: PropTypes.bool,
        width: PropTypes.number,
        height: PropTypes.number,
        className: PropTypes.string,
    },

    Phases: {
        Display: "display",
        Uploading: "uploading",
        Error: "error",
    },

    getDefaultProps: function() {
        return {
            showUploadSection: true,
            className: "",
            width: 80,
            height: 80,
        };
    },

    getInitialState: function() {
        return {
            avatarUrl: this.props.initialAvatarUrl,
            phase: this.Phases.Display,
        };
    },

    componentWillMount: function() {
        MatrixClientPeg.get().on("RoomState.events", this.onRoomStateEvents);
    },

    componentWillReceiveProps: function(newProps) {
        if (this.avatarSet) {
            // don't clobber what the user has just set
            return;
        }
        this.setState({
            avatarUrl: newProps.initialAvatarUrl,
        });
    },

    componentWillUnmount: function() {
        if (MatrixClientPeg.get()) {
            MatrixClientPeg.get().removeListener("RoomState.events", this.onRoomStateEvents);
        }
    },

    onRoomStateEvents: function(ev) {
        if (!this.props.room) {
            return;
        }

        if (ev.getRoomId() !== this.props.room.roomId || ev.getType() !== 'm.room.avatar'
            || ev.getSender() !== MatrixClientPeg.get().getUserId()) {
            return;
        }

        if (!ev.getContent().url) {
            this.avatarSet = false;
            this.setState({}); // force update
        }
    },

    setAvatarFromFile: function(file) {
        let newUrl = null;

        this.setState({
            phase: this.Phases.Uploading,
        });
        const self = this;
        const httpPromise = MatrixClientPeg.get().uploadContent(file).then(function(url) {
            newUrl = url;
            if (self.props.room) {
                return MatrixClientPeg.get().sendStateEvent(
                    self.props.room.roomId,
                    'm.room.avatar',
                    {url: url},
                    '',
                );
            } else {
                return MatrixClientPeg.get().setAvatarUrl(url);
            }
        });

        httpPromise.then(function() {
            self.setState({
                phase: self.Phases.Display,
                avatarUrl: MatrixClientPeg.get().mxcUrlToHttp(newUrl),
            });
        }, function(error) {
            self.setState({
                phase: self.Phases.Error,
            });
            self.onError(error);
        });

        return httpPromise;
    },

    onFileSelected: function(ev) {
        this.avatarSet = true;
        return this.setAvatarFromFile(ev.target.files[0]);
    },

    onError: function(error) {
        this.setState({
            errorText: _t("Failed to upload profile picture!"),
        });
    },

    render: function() {
        let avatarImg;
        // Having just set an avatar we just display that since it will take a little
        // time to propagate through to the RoomAvatar.
        if (this.props.room && !this.avatarSet) {
            const RoomAvatar = sdk.getComponent('avatars.RoomAvatar');
            avatarImg = <RoomAvatar room={this.props.room} width={this.props.width} height={this.props.height} resizeMethod='crop' />;
        } else {
            const BaseAvatar = sdk.getComponent("avatars.BaseAvatar");
            // XXX: FIXME: once we track in the JS what our own displayname is(!) then use it here rather than ?
            avatarImg = <BaseAvatar width={this.props.width} height={this.props.height} resizeMethod='crop'
                        name='?' idName={MatrixClientPeg.get().getUserIdLocalpart()} url={this.state.avatarUrl} />;
        }

        let uploadSection;
        if (this.props.showUploadSection) {
            uploadSection = (
                <div className={this.props.className}>
                    { _t("Upload new:") }
                    <input type="file" accept="image/*" onChange={this.onFileSelected} />
                    { this.state.errorText }
                </div>
            );
        }

        switch (this.state.phase) {
            case this.Phases.Display:
            case this.Phases.Error:
                return (
                    <div>
                        <div className={this.props.className}>
                            { avatarImg }
                        </div>
                        { uploadSection }
                    </div>
                );
            case this.Phases.Uploading:
                var Loader = sdk.getComponent("elements.Spinner");
                return (
                    <Loader />
                );
        }
    },
});
