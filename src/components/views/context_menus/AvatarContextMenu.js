/*
Copyright 2019 Michael Telatynski <7t3chguy@gmail.com>

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

export default class AvatarContextMenu extends React.PureComponent {
    static propTypes = {
        uploadAvatar: PropTypes.func.isRequired,
        removeAvatar: PropTypes.func.isRequired,
        onFinished: PropTypes.func.isRequired,
    };

    _onUploadAvatarClick = () => {
        this.props.uploadAvatar();
        setImmediate(this.props.onFinished);
    };

    _onRemoveAvatarClick = () => {
        this.props.removeAvatar();
        setImmediate(this.props.onFinished);
    };

    render() {
        console.log(this.props);
        return <div className="mx_MessageContextMenu">
            <div className="mx_MessageContextMenu_field" onClick={this._onUploadAvatarClick}>
                { _t('Upload new image') }
            </div>
            <hr className="mx_RoomTileContextMenu_separator" />
            <div className="mx_RoomTileContextMenu_leave" onClick={this._onRemoveAvatarClick}>
                { _t('Remove') }
            </div>
        </div>;
    }
}
