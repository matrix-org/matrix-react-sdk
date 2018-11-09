/*
Copyright 2016 OpenMarket Ltd
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

import SettingsStore from "../../settings/SettingsStore";

const React = require('react');
const ReactDOM = require("react-dom");
import PropTypes from 'prop-types';
import Promise from 'bluebird';

const Matrix = require("matrix-js-sdk");
const EventTimeline = Matrix.EventTimeline;

const sdk = require('../../index');
import { _t } from '../../languageHandler';
const MatrixClientPeg = require("../../MatrixClientPeg");
const dis = require("../../dispatcher");
const ObjectUtils = require('../../ObjectUtils');
const Modal = require("../../Modal");
const UserActivity = require("../../UserActivity");
import { KeyCode } from '../../Keyboard';

const INITIAL_SIZE = 20;

/*
 * Component which shows the event timeline in a room view.
 *
 * Also responsible for handling and sending read receipts.
 */
var NonThreadedSection = React.createClass({
    displayName: 'NonThreadedSection',

    propTypes: {
        // The js-sdk EventTimelineSet object for the timeline sequence we are
        // representing.  This may or may not have a room, depending on what it's
        // a timeline representing.  If it has a room, we maintain RRs etc for
        // that room.
        timelineSet: PropTypes.object.isRequired,

        showReadReceipts: PropTypes.bool,
        // Enable managing RRs and RMs. These require the timelineSet to have a room.
        manageReadReceipts: PropTypes.bool,
        manageReadMarkers: PropTypes.bool,

        // true to give the component a 'display: none' style.
        hidden: PropTypes.bool,

        // ID of an event to highlight. If undefined, no event will be highlighted.
        // typically this will be either 'eventId' or undefined.
        highlightedEventId: PropTypes.string,

        // id of an event to jump to. If not given, will go to the end of the
        // live timeline.
        eventId: PropTypes.string,

        // where to position the event given by eventId, in pixels from the
        // bottom of the viewport. If not given, will try to put the event
        // half way down the viewport.
        eventPixelOffset: PropTypes.number,

        // Should we show URL Previews
        showUrlPreview: PropTypes.bool,

        // callback which is called when the read-up-to mark is updated.
        onReadMarkerUpdated: PropTypes.func,

        // maximum number of events to show in a timeline
        timelineCap: PropTypes.number,

        // classname to use for the messagepanel
        className: PropTypes.string,

        // shape property to be passed to EventTiles
        tileShape: PropTypes.string,

        // placeholder text to use if the timeline is empty
        empty: PropTypes.string,
    },

    getInitialState() {
        return {
            timelineWindow: null
        };
    },

    componentDidMount() {
        this.componentDidUpdate({});
    },

    async componentDidUpdate(prevProps) {
        if (!this.state.timelineWindow || prevProps.eventId != this.props.eventId) {
            console.log("TimelinePanel switching to eventId " + this.props.eventId +
                        " (was " + prevProps.eventId + ")");
            const timelineWindow = await this._initTimeline();
            this.setState({timelineWindow});
        }
    },

    onFillRequest(backwards) {
        if (this.refs.timelinePanel) {
            return this.refs.timelinePanel.onFillRequest(backwards);
        }
        else {
            return Promise.reject(new Error("timelinePanel not loaded yet"));
        }
    },

    onUnfillRequest(backwards) {
        if (this.refs.timelinePanel) {
            return this.refs.timelinePanel.onUnfillRequest(backwards);
        }
        else {
            return Promise.reject(new Error("timelinePanel not loaded yet"));
        }
    },

    canPaginate(backwards) {
        return this.refs.timelinePanel.canPaginate(backwards);
    },

    _initTimeline: function() {
        const initialEvent = this.props.eventId;
        const pixelOffset = this.props.eventPixelOffset;

        // if a pixelOffset is given, it is relative to the bottom of the
        // container. If not, put the event in the middle of the container.
        let offsetBase = 1;
        if (pixelOffset == null) {
            offsetBase = 0.5;
        }

        return this._loadTimeline(initialEvent, pixelOffset, offsetBase);
    },

    /**
     * (re)-load the event timeline, and initialise the scroll state, centered
     * around the given event.
     *
     * @param {string?}  eventId the event to focus on. If undefined, will
     *    scroll to the bottom of the room.
     *
     * @param {number?} pixelOffset   offset to position the given event at
     *    (pixels from the offsetBase). If omitted, defaults to 0.
     *
     * @param {number?} offsetBase the reference point for the pixelOffset. 0
     *     means the top of the container, 1 means the bottom, and fractional
     *     values mean somewhere in the middle. If omitted, it defaults to 0.
     *
     * returns a promise which will resolve when the load completes.
     */
    async _loadTimeline(eventId, pixelOffset, offsetBase) {
        const timelineWindow = new Matrix.TimelineWindow(
            MatrixClientPeg.get(), this.props.timelineSet,
            {windowLimit: this.props.timelineCap});

        try {
            await timelineWindow.load(eventId, INITIAL_SIZE);
            return timelineWindow;
        } catch(error) {
            this.setState({timelineLoading: false});
            console.error(
                `Error loading timeline panel at ${eventId}: ${error}`,
            );
            const msg = error.message ? error.message : JSON.stringify(error);
            const ErrorDialog = sdk.getComponent("dialogs.ErrorDialog");

            let onFinished;

            // if we were given an event ID, then when the user closes the
            // dialog, let's jump to the end of the timeline. If we weren't,
            // something has gone badly wrong and rather than causing a loop of
            // undismissable dialogs, let's just give up.
            if (eventId) {
                onFinished = () => {
                    // go via the dispatcher so that the URL is updated
                    dis.dispatch({
                        action: 'view_room',
                        room_id: this.props.timelineSet.room.roomId,
                    });
                };
            }
            const message = (error.errcode == 'M_FORBIDDEN')
                ? _t("Tried to load a specific point in this room's timeline, but you do not have permission to view the message in question.")
                : _t("Tried to load a specific point in this room's timeline, but was unable to find it.");
            Modal.createTrackedDialog('Failed to load timeline position', '', ErrorDialog, {
                title: _t("Failed to load timeline position"),
                description: message,
                onFinished: onFinished,
            });
        }
    },


    render: function() {
        const TimelinePanel = sdk.getComponent("structures.TimelinePanel");

        return (
            <TimelinePanel
                ref="timelinePanel"
                timelineWindow={this.state.timelineWindow}
                {... this.props}
            />
        );
    },
});

module.exports = NonThreadedSection;
