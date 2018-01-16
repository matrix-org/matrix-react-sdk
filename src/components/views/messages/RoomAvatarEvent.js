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

import React from 'react';
import PropTypes from 'prop-types';
import MatrixClientPeg from '../../../MatrixClientPeg';
import { ContentRepo } from 'matrix-js-sdk';
import { _t } from '../../../languageHandler';
import sdk from '../../../index';
import Modal from '../../../Modal';
import AccessibleButton from '../elements/AccessibleButton';

module.exports = React.createClass({
    displayName: 'RoomAvatarEvent',

    propTypes: {
        /* the MatrixEvent to show */
        mxEvent: PropTypes.object.isRequired,
    },

    onAvatarClick: function(name) {
        const httpUrl = MatrixClientPeg.get().mxcUrlToHttp(this.props.mxEvent.getContent().url);
        const ImageView = sdk.getComponent("elements.ImageView");
        const params = {
            src: httpUrl,
            name: name,
        };
        Modal.createDialog(ImageView, params, "mx_Dialog_lightbox");
    },

    render: function() {
        const ev = this.props.mxEvent;
        const senderDisplayName = ev.sender && ev.sender.name ? ev.sender.name : ev.getSender();
        const BaseAvatar = sdk.getComponent("avatars.BaseAvatar");

        const room = MatrixClientPeg.get().getRoom(this.props.mxEvent.getRoomId());
        const name = _t('%(senderDisplayName)s changed the avatar for %(roomName)s', {
                senderDisplayName: senderDisplayName,
                roomName: room ? room.name : '',
        });

        if (!ev.getContent().url || ev.getContent().url.trim().length === 0) {
            return (
                <div className="mx_TextualEvent">
                    { _t('%(senderDisplayName)s removed the room avatar.', {senderDisplayName: senderDisplayName}) }
                </div>
            );
        }

        const url = ContentRepo.getHttpUriForMxc(
                    MatrixClientPeg.get().getHomeserverUrl(),
                    ev.getContent().url,
                    Math.ceil(14 * window.devicePixelRatio),
                    Math.ceil(14 * window.devicePixelRatio),
                    'crop',
                );

        return (
            <div className="mx_RoomAvatarEvent">
                { _t('%(senderDisplayName)s changed the room avatar to <img/>',
                    { senderDisplayName: senderDisplayName },
                    {
                        'img': () =>
                            <AccessibleButton key="avatar" className="mx_RoomAvatarEvent_avatar"
                                onClick={this.onAvatarClick.bind(this, name)}>
                                <BaseAvatar width={14} height={14} url={url} name={name} />
                            </AccessibleButton>,
                    })
                }
            </div>
        );
    },
});
