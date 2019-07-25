/*
Copyright 2019 The Matrix.org Foundation C.I.C.

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
import { EventTimeline } from 'matrix-js-sdk';

import { _t } from '../../../languageHandler';

export default class BridgeError extends React.PureComponent {
    static propTypes = {
        mxEvent: PropTypes.object.isRequired,
        room: PropTypes.object.isRequired,
    };

    constructor(props) {
        super(props);
        // this.state = {}
    }

    /**
     * Returns all bridge error relations for this event.
     *
     * @returns {MatrixEvent[]}
     */
    _getRelations() {
        const { mxEvent, room } = this.props;

        // const room = matrixClient.getRoom(mxEvent.getRoomId());
        const timelineSet = room.getUnfilteredTimelineSet();
        const relations = timelineSet.getRelationsForEvent(
            mxEvent.getId(),
            "m.reference",
            "de.nasnotfound.bridge_error",
        );

        return relations ? relations.getRelations() : [];
    }

    /**
     * Returns a list of all users matched by the regex at the time of the event.
     *
     * @param {string} regexStr
     * @returns {RoomMember[]}
     */
    _findMembersFromRegex(regexStr) {
        const { room } = this.props;
        const regex = new RegExp(regexStr);

        // TODO[V02460@gmail.com]: Get room state at the proper point in time
        const roomState = room.getLiveTimeline().getState(EventTimeline.FORWARDS);
        const members = roomState.getMembers();

        return members.filter(m => regex.test(m.userId));
    }

    /**
     * Returns the network name and the affected users for the given relation.
     *
     * @param {MatrixEvent} relation
     * @returns {{networkName: string, affectedUsers: RoomMember[]}}
     */
    _getRelationInfo(relation) {
        if (!relation.event || !relation.event.content) {
            return { networkName: "", affectedUsers: [] };
        }
        const content = relation.event.content;

        const networkName = (typeof content.network_name === 'string' ?
            content.network_name :
            ""
        );
        const affectedUsersRegex = (Array.isArray(content.affected_users) ?
            content.affected_users :
            []
        );
        const affectedUsers = affectedUsersRegex.flatMap(u =>
            this._findMembersFromRegex(u),
        );

        return { networkName, affectedUsers };
    }

    /**
     * Returns the rendered string for the given relation.
     *
     * @param {{networkName: string, affectedUsers: RoomMember[]}} relationInfo
     * @return {string}
     */
    _renderInfo(relationInfo) {
        const usernames = relationInfo.affectedUsers.map(u => u.name).join(", ");

        if (relationInfo.networkName) {
            return _t(
                "%(networkName)s: %(affectedUsers)s",
                {
                    networkName: relationInfo.networkName,
                    affectedUsers: usernames,
                },
            );
        } else {
            return _t(
                "Affected users: %(affectedUsers)s",
                { affectedUsers: usernames },
            );
        }
    }

    render() {
        const relations = this._getRelations();
        const isBridgeError = !!relations.length;

        if (!isBridgeError) {
            return null;
        }

        const relationInfos = relations.map(r => this._getRelationInfo(r));
        const renderedInfos = relationInfos.map(r => this._renderInfo(r));

        return (
            <div className="mx_BridgeError">
                ⚠ {_t("Event not delivered") + " (" + renderedInfos.join("; ") + ")" }
            </div>
        );
    }
}
