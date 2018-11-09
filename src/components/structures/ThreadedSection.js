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
var ThreadedSection = React.createClass({
    displayName: 'ThreadedSection',

    propTypes: {
        // The js-sdk EventTimelineSet object for the timeline sequence we are
        // representing.  This may or may not have a room, depending on what it's
        // a timeline representing.  If it has a room, we maintain RRs etc for
        // that room.
        timelineWindow: PropTypes.object.isRequired,

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
            threadWindow: null,
        };
    },

    componentDidMount() {
        this.componentDidUpdate();
    },

    componentDidUpdate() {
        // thread id is part of the key so won't ever update
        if (!this.state.threadWindow && this.props.thread) {
            const room = this.props.timelineWindow._timelineSet.room;
            const threadTimelineSet = room.getThreadTimelineSet(this.props.thread);
            const opts = {thread: this.props.thread};
            const threadWindow = new Matrix.TimelineWindow(MatrixClientPeg.get(), threadTimelineSet, opts);
            this.setState({threadWindow});
        }
    },

    onFillRequest(backwards) {
        if (this.refs.mainPanel && this.refs.threadPanel) {
            this.refs.threadPanel.onFillRequest(backwards);
            return this.refs.mainPanel.onFillRequest(backwards);
        }
        else {
            return Promise.reject(new Error("mainPanel or threadPanel not loaded yet"));
        }
    },

    onUnfillRequest(backwards) {
        if (this.refs.mainPanel) {
            return this.refs.mainPanel.onUnfillRequest(backwards);
        }
        else {
            return Promise.reject(new Error("mainPanel not loaded yet"));
        }
    },

    canPaginate(backwards) {
        return this.refs.mainPanel.canPaginate(backwards) ||
            this.refs.threadPanel.canPaginate(backwards);
    },

    render: function() {
        const TimelinePanel = sdk.getComponent("structures.TimelinePanel");

        return (
            <div className="mx_ThreadSection">
                <TimelinePanel
                    ref="mainPanel"
                    timelineWindow={this.props.timelineWindow}
                    {... this.props}
                />
                <TimelinePanel
                    ref="threadPanel"
                    timelineWindow={this.state.threadWindow}
                    {... this.props}
                />
            </div>
        );
    },
});

module.exports = ThreadedSection;
