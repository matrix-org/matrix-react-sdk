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

'use strict';
import {ContentRepo} from 'matrix-js-sdk';
import MatrixClientPeg from './MatrixClientPeg';

module.exports = {
    avatarUrlForMember: function(member, width, height, resizeMethod) {
        let url = member.getAvatarUrl(
            MatrixClientPeg.get().getHomeserverUrl(),
            Math.floor(width * window.devicePixelRatio),
            Math.floor(height * window.devicePixelRatio),
            resizeMethod,
            false,
            false,
        );
        if (!url) {
            // member can be null here currently since on invites, the JS SDK
            // does not have enough info to build a RoomMember object for
            // the inviter.
            url = this.defaultAvatarUrlForString(member ? member.userId : '');
        }
        return url;
    },

    avatarUrlForUser: function(user, width, height, resizeMethod) {
        const url = ContentRepo.getHttpUriForMxc(
            MatrixClientPeg.get().getHomeserverUrl(), user.avatarUrl,
            Math.floor(width * window.devicePixelRatio),
            Math.floor(height * window.devicePixelRatio),
            resizeMethod,
        );
        if (!url || url.length === 0) {
            return null;
        }
        return url;
    },

    defaultAvatarUrlForString: function(s) {
        const images = ['03b381', '368bd6', 'ac3ba8'];
        let total = 0;
        for (let i = 0; i < s.length; ++i) {
            total += s.charCodeAt(i);
        }
        return require('../res/img/' + images[total % images.length] + '.png');
    },
};
