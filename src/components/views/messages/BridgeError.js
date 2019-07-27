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

import { strict as assert } from 'assert';

import React from 'react';
import PropTypes from 'prop-types';
import { EventTimeline, MatrixEvent, Room } from 'matrix-js-sdk';

import { _t, _td } from '../../../languageHandler';


/**
 * No-op if str is a string, else returns the empty string.
 * @param {Any} str
 * @returns {string}
 */
function assureString(str) {
    return typeof str === 'string' ? str : "";
}

/**
 * No-op if arr is an Array, else returns an empty Array.
 * @param {Any} arr
 * @returns {Array}
 */
function assureArray(arr) {
    return Array.isArray(arr) ? arr : [];
}

/**
 * A watcher noticing changes to the relations of an event.
 *
 * Whenever a change to the relations of the event is registered, the callbacks
 * are triggered. The callbacks are passed the new set of relation events. For
 * ease of use the callbacks are also called directly after their registration
 * if there are already relations.
 *
 * Usage:
 *     1. Initialize in Component constructor 
 *     2. register() in componentDidMount
 *     3. teardown() in componentWillUnmount
 *
 * Example for register():
 *
 * ```
 * this.relationsWatcher.register(r => this.setState({relations: r}));
 * ```
 *
 * @param {string} relationType The type of relation for which to filter related events.
 * @param {string} eventType The type of event for which to filter related events.
 * @param {string} mxEvent The Matrix event for which changes to its relations
 *     should be watched.
 * @param {string} room The Matrix room the event belongs to.
 */
class RelationsWatcher {
    constructor(relationType, eventType, mxEvent, room) {
        this.relationType = relationType;
        this.eventType = eventType;
        this.room = room;
        this.mxEvent = mxEvent;

        this.listenersAdded = false;
        this.creationListenerTarget = null;
        this.relations = null;
        this.callbacks = [];

        this._setup(mxEvent, room);
    }

    /**
     * Cleanup method. Call when the watcher is no longer needed e.g. in a
     * Components `componentWillUnmount` method.
     */
    teardown() {
        if (!this.relations) {
            return;
        }
        this._removeListeners(this.relations);
        this._removeCreationListener();
        // this.callbacks = [];
        this.relations = null;

        assert(!this.listenersAdded);
        assert(!this.creationListenerTarget);
    }

    /**
     * Register a callback for the watcher.

     * The callback is called when the relations of the event change and when
     * there are relations to an event at the time of registering.
     *
     * Use it e.g. in a Components `componentDidMount` method.
     *
     * @param {RelationsWatcher~onChangeCallback} onChangeCallback
     */
    register(onChangeCallback) {
        this.callbacks.push(onChangeCallback);
        if (this.relations) {
            const ret = this._getRelationsEvents();
            onChangeCallback(ret);
        }
    }

    _setup(mxEvent, room) {
        assert(!this.relations);
        assert(!this.listenersAdded);

        this.relations = this._getRelations(mxEvent, room);

        if (!this.relations) {
            // No setup happened. Wait for relations to appear.
            this._addCreationListener(mxEvent);
            return;
        }
        this._removeCreationListener();

        this._addListeners(this.relations);

        assert(this.listenersAdded);
        assert(!this.creationListenerTarget);
    }

    _getRelations(mxEvent, room) {
        const timelineSet = room.getUnfilteredTimelineSet();
        // TODO[V02460]: Correct @returns to Optional in matrix-js-sdk.
        return timelineSet.getRelationsForEvent(
            mxEvent.getId(),
            this.relationType,
            this.eventType,
        ) || null;
    }

    _getRelationsEvents() {
        return this.relations.getRelations() || [];
    }

    // Relations creation

    _creationCallback = (relationType, eventType) => {
        if (relationType != this.relationType || eventType != this.eventType) {
            return;
        }
        this._removeCreationListener();
        this._setup(this.mxEvent, this.room);
    }

    _addCreationListener(mxEvent) {
        mxEvent.on("Event.relationsCreated", this._creationCallback);
        this.creationListenerTarget = mxEvent;
    }

    _removeCreationListener() {
        if (!this.creationListenerTarget) {
            return;
        }
        this.creationListenerTarget.removeListener(
            "Event.relationsCreated",
            this._creationCallback,
        );
        this.creationListenerTarget = null;
    }

    // Relations changes

    _notify = () => {
        const ret = this._getRelationsEvents();
        this.callbacks.forEach(callback => callback(ret));
    }

    _addListeners(relations) {
        if (this.listenersAdded) {
            return;
        }
        relations.on("Relations.add", this._notify);
        relations.on("Relations.remove", this._notify);
        relations.on("Relations.redaction", this._notify);
        this.listenersAdded = true;
    }

    _removeListeners(relations) {
        if (!this.listenersAdded) {
            return;
        }
        relations.removeListener("Relations.add", this._notify);
        relations.removeListener("Relations.remove", this._notify);
        relations.removeListener("Relations.redaction", this._notify);
        this.listenersAdded = false;
    }
}

/**
 * Callback for when the set of relations belonging to an event changes.
 * @callback RelationsWatcher~onChangeCallback
 * @param {MatrixEvent[]} relations The set of relations.
 */


export default class BridgeError extends React.PureComponent {
    static propTypes = {
        mxEvent: PropTypes.instanceOf(MatrixEvent).isRequired,
        room: PropTypes.instanceOf(Room).isRequired,
    };

    constructor(props) {
        super(props);

        /** @type {errorEvents: MatrixEvent[]} */
        this.state = {errorEvents: []};

        this.relationsWatcher = new RelationsWatcher(
            "m.reference",
            "de.nasnotfound.bridge_error",
            props.mxEvent,
            props.room,
        );
    }

    componentDidMount() {
        this.relationsWatcher.register(e => this.setState({errorEvents: e}));
    }

    componentWillUnmount() {
        this.relationsWatcher.teardown();
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
     * Sanitized infos from a relation.
     * @typedef {Object} RelationInfo
     * @property {RoomMember[]} affectedUsers
     * @property {string} eventID
     * @property {string} networkName
     * @property {string} reason
     */

    /**
     * Returns the network name and the affected users for the given relation.
     *
     * @param {MatrixEvent} relation
     * @returns {RelationInfo}
     */
    _getRelationInfo(relation) {
        const content = relation.getContent();

        const affectedUsersRegex = assureArray(content.affected_users);
        const affectedUsers = affectedUsersRegex.flatMap(u =>
            this._findMembersFromRegex(u),
        );

        return {
            affectedUsers: affectedUsers,
            eventID: assureString(content.event_id),
            networkName: assureString(content.network_name),
            reason: assureString(content.reason),
        };
    }

    _errorMessages = {
        "m.event_not_handled": _td(
            "Not delivered to people on %(networkName)s (%(affectedUsers)s)",
        ),
        "m.event_too_old": _td(
            "It took so long. Gave up sending to people on %(networkName)s " +
            "(%(affectedUsers)s)",
        ),
        "m.internal_error": _td(
            "Unexpected error while sending to people on %(networkName)s " +
            "(%(affectedUsers)s)",
        ),
        "m.foreign_network_error": _td(
            "%(networkName)s did not deliver the message to the people " +
            "there (%(affectedUsers)s)",
        ),
        "m.event_unknown": _td(
            "Was not understood by %(networkName)s, so people there didn't " +
            "get this message (%(affectedUsers)s)",
        ),
    }

    /**
     * Returns an error message for the given reason.
     *
     * Defaults to a generic message if the reason is unknown.
     * @param {string} reason
     * @returns {string}
     */
    _getErrorMessage(reason) {
        return (
            this._errorMessages[reason] || this._errorMessages["m.event_not_handled"]
        );
    }

    /**
     * Returns the rendered element for the given relation.
     *
     * @param {RelationInfo} relationInfo
     * @return {React.Element<'div'>}
     */
    _renderInfo(relationInfo) {
        const usernames = relationInfo.affectedUsers.map(u => u.name).join(", ");
        const message = _t(
            this._getErrorMessage(relationInfo.reason),
            {
                affectedUsers: usernames,
                // count == 0 to add translations for when the network name is missing.
                count: relationInfo.networkName ? 1 : 0,
                networkName: relationInfo.networkName,
            },
        );

        return (
            <div className="mx_BridgeError_message" key={ relationInfo.eventID }>
                { message }
            </div>
        );
    }

    render() {
        const { errorEvents } = this.state;
        const isBridgeError = !!errorEvents.length;

        if (!isBridgeError) {
            return null;
        }

        const errorInfos = errorEvents.map(e => this._getRelationInfo(e));
        const renderedInfos = errorInfos.map(e => this._renderInfo(e));

        return (
            <div className="mx_BridgeError">
                <div className="mx_BridgeError_icon" />
                { renderedInfos }
            </div>
        );
    }
}
