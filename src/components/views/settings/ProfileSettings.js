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
import {_t} from "../../../languageHandler";
import MatrixClientPeg from "../../../MatrixClientPeg";
import Field from "../elements/Field";
import AccessibleButton from "../elements/AccessibleButton";
import classNames from 'classnames';
import {User} from "matrix-js-sdk";
import { getHostingLink } from '../../../utils/HostingLink';

export default class ProfileSettings extends React.Component {
    constructor() {
        super();

        const client = MatrixClientPeg.get();
        let user = client.getUser(client.getUserId());
        if (!user) {
            // XXX: We shouldn't have to do this.
            // There seems to be a condition where the User object won't exist until a room
            // exists on the account. To work around this, we'll just create a temporary User
            // and use that.
            console.warn("User object not found - creating one for ProfileSettings");
            user = new User(client.getUserId());
        }
        let avatarUrl = user.avatarUrl;
        if (avatarUrl) avatarUrl = client.mxcUrlToHttp(avatarUrl, 96, 96, 'crop', false);
        this.state = {
            userId: user.userId,
            originalDisplayName: user.displayName,
            displayName: user.displayName,
            originalAvatarUrl: avatarUrl,
            avatarUrl: avatarUrl,
            avatarFile: null,
            enableProfileSave: false,
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
            await client.setDisplayName(this.state.displayName);
            newState.originalDisplayName = this.state.displayName;
        }

        if (this.state.avatarFile) {
            const uri = await client.uploadContent(this.state.avatarFile);
            await client.setAvatarUrl(uri);
            newState.avatarUrl = client.mxcUrlToHttp(uri, 96, 96, 'crop', false);
            newState.originalAvatarUrl = newState.avatarUrl;
            newState.avatarFile = null;
        }

        this.setState(newState);
    };

    _onDisplayNameChanged = (e) => {
        this.setState({
            displayName: e.target.value,
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

    render() {
        // TODO: Why is rendering a box with an overlay so complicated? Can the DOM be reduced?

        let showOverlayAnyways = true;
        let avatarElement = <div className="mx_ProfileSettings_avatarPlaceholder" />;
        if (this.state.avatarUrl) {
            showOverlayAnyways = false;
            avatarElement = <img src={this.state.avatarUrl}
                                 alt={_t("Profile picture")} />;
        }

        const avatarOverlayClasses = classNames({
            "mx_ProfileSettings_avatarOverlay": true,
            "mx_ProfileSettings_avatarOverlay_show": showOverlayAnyways,
        });
        const avatarHoverElement = (
            <div className={avatarOverlayClasses} onClick={this._uploadAvatar}>
                <span className="mx_ProfileSettings_avatarOverlayText">{_t("Upload profile picture")}</span>
                <div className="mx_ProfileSettings_avatarOverlayImgContainer">
                    <div className="mx_ProfileSettings_avatarOverlayImg" />
                </div>
            </div>
        );

        const hostingSignupLink = getHostingLink('user-settings');
        let hostingSignup = null;
        if (hostingSignupLink) {
            hostingSignup = <span className="mx_ProfileSettings_hostingSignup">
                {_t(
                    "<a>Upgrade</a> to your own domain", {},
                    {
                        a: sub => <a href={hostingSignupLink} target="_blank" rel="noopener">{sub}</a>,
                    },
                )}
                <a href={hostingSignupLink} target="_blank" rel="noopener">
                    <img src={require("../../../../res/img/external-link.svg")} width="11" height="10" alt='' />
                </a>
            </span>;
        }

        return (
            <form onSubmit={this._saveProfile} autoComplete={false} noValidate={true}>
                <input type="file" ref="avatarUpload" className="mx_ProfileSettings_avatarUpload"
                       onChange={this._onAvatarChanged} accept="image/*" />
                <div className="mx_ProfileSettings_profile">
                    <div className="mx_ProfileSettings_controls">
                        <p>
                            {this.state.userId}
                            {hostingSignup}
                        </p>
                        <Field id="profileDisplayName" label={_t("Display Name")}
                               type="text" value={this.state.displayName} autoComplete="off"
                               onChange={this._onDisplayNameChanged} />
                    </div>
                    <div className="mx_ProfileSettings_avatar">
                        {avatarElement}
                        {avatarHoverElement}
                    </div>
                </div>
                <AccessibleButton onClick={this._saveProfile} kind="primary"
                                  disabled={!this.state.enableProfileSave}>
                    {_t("Save")}
                </AccessibleButton>
            </form>
        );
    }
}
