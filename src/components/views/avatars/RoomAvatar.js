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
import React from "react";
import {ContentRepo} from "matrix-js-sdk";
import MatrixClientPeg from "../../../MatrixClientPeg";
import sdk from "../../../index";

module.exports = React.createClass({
    displayName: 'RoomAvatar',

    // Room may be left unset here, but if it is,
    // oobData.avatarUrl should be set (else there
    // would be nowhere to get the avatar from)
    propTypes: {
        room: React.PropTypes.object,
        oobData: React.PropTypes.object,
        width: React.PropTypes.number,
        height: React.PropTypes.number,
        resizeMethod: React.PropTypes.string,
    },

    getDefaultProps: function() {
        return {
            width: 36,
            height: 36,
            resizeMethod: 'crop',
            oobData: {},
        };
    },

    getInitialState: function() {
        return {
            urls: this.getImageUrls(this.props),
        };
    },

    componentWillReceiveProps: function(newProps) {
        this.setState({
            urls: this.getImageUrls(newProps),
        });
    },

    getImageUrls: function(props) {
        return [
            ContentRepo.getHttpUriForMxc(
                MatrixClientPeg.get().getHomeserverUrl(),
                props.oobData.avatarUrl,
                Math.floor(props.width * window.devicePixelRatio),
                Math.floor(props.height * window.devicePixelRatio),
                props.resizeMethod,
            ), // highest priority
            this.getRoomAvatarUrl(props),
            this.getOneToOneAvatar(props), // lowest priority
        ].filter(function(url) {
            return (url != null && url != "");
        });
    },

    getRoomAvatarUrl: function(props) {
        if (!props.room) return null;

        return props.room.getAvatarUrl(
            MatrixClientPeg.get().getHomeserverUrl(),
            Math.floor(props.width * window.devicePixelRatio),
            Math.floor(props.height * window.devicePixelRatio),
            props.resizeMethod,
            false,
        );
    },

    getOneToOneAvatar: function(props) {
        if (!props.room) return null;

        const mlist = props.room.currentState.members;
        const userIds = [];
        // for .. in optimisation to return early if there are >2 keys
        for (const uid in mlist) {
            if (mlist.hasOwnProperty(uid)) {
                userIds.push(uid);
            }
            if (userIds.length > 2) {
                return null;
            }
        }

        if (userIds.length == 2) {
            let theOtherGuy = null;
            if (mlist[userIds[0]].userId == MatrixClientPeg.get().credentials.userId) {
                theOtherGuy = mlist[userIds[1]];
            } else {
                theOtherGuy = mlist[userIds[0]];
            }
            return theOtherGuy.getAvatarUrl(
                MatrixClientPeg.get().getHomeserverUrl(),
                Math.floor(props.width * window.devicePixelRatio),
                Math.floor(props.height * window.devicePixelRatio),
                props.resizeMethod,
                false,
            );
        } else if (userIds.length == 1) {
            return mlist[userIds[0]].getAvatarUrl(
                MatrixClientPeg.get().getHomeserverUrl(),
                Math.floor(props.width * window.devicePixelRatio),
                Math.floor(props.height * window.devicePixelRatio),
                props.resizeMethod,
                false,
            );
        } else {
           return null;
        }
    },

    render: function() {
        const BaseAvatar = sdk.getComponent("avatars.BaseAvatar");

        const {room, oobData, ...otherProps} = this.props;

        const roomName = room ? room.name : oobData.name;

        return (
            <BaseAvatar {...otherProps} name={roomName}
                idName={room ? room.roomId : null}
                urls={this.state.urls} />
        );
    },
});
