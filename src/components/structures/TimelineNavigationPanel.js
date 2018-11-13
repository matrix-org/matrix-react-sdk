/*
Copyright 2016 OpenMarket Ltd
Copyright 2018 New Vector Ltd

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
import ReactDOM from 'react-dom';
import PropTypes from 'prop-types';
import classNames from 'classnames';
import dis from "../../dispatcher";
import sdk from '../../index';
import { _t } from '../../languageHandler';
const Modal = require("../../Modal");

import MatrixClientPeg from '../../MatrixClientPeg';

const Matrix = require("matrix-js-sdk");
const EventTimeline = Matrix.EventTimeline;

const INITIAL_SIZE = 20;

/* (almost) stateless UI component which builds the event tiles in the room timeline.
 */
module.exports = React.createClass({
    displayName: 'TimelineNavigationPanel',

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

        // callback which is called when the panel is scrolled.
        onScroll: PropTypes.func,

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

    componentWillMount: function() {
        this._initialLoadPromise = this._initTimeline();
        // the event after which we put a visible unread marker on the last
        // render cycle; null if readMarkerVisible was false or the RM was
        // suppressed (eg because it was at the end of the timeline)
        this.currentReadMarkerEventId = null;

        // Remember the read marker ghost node so we can do the cleanup that
        // Velocity requires
        this._readMarkerGhostNode = null;

        this._isMounted = true;
    },

    componentWillUnmount: function() {
        this._isMounted = false;
    },

    getInitialState() {
        return {
            sections: []
        };
    },

    /* return true if the content is fully scrolled down right now; else false.
     */
    isAtBottom: function() {
        return this.refs.scrollPanel
            && this.refs.scrollPanel.isAtBottom();
    },

    /* get the current scroll state. See ScrollPanel.getScrollState for
     * details.
     *
     * returns null if we are not mounted.
     */
    getScrollState: function() {
        if (!this.refs.scrollPanel) { return null; }
        return this.refs.scrollPanel.getScrollState();
    },

    // returns one of:
    //
    //  null: there is no read marker
    //  -1: read marker is above the window
    //   0: read marker is within the window
    //  +1: read marker is below the window
    getReadMarkerPosition: function() {
        const readMarker = this.refs.readMarkerNode;
        const messageWrapper = this.refs.scrollPanel;

        if (!readMarker || !messageWrapper) {
            return null;
        }

        const wrapperRect = ReactDOM.findDOMNode(messageWrapper).getBoundingClientRect();
        const readMarkerRect = readMarker.getBoundingClientRect();

        // the read-marker pretends to have zero height when it is actually
        // two pixels high; +2 here to account for that.
        if (readMarkerRect.bottom + 2 < wrapperRect.top) {
            return -1;
        } else if (readMarkerRect.top < wrapperRect.bottom) {
            return 0;
        } else {
            return 1;
        }
    },

    /* jump to the top of the content.
     */
    scrollToTop: function() {
        if (this.refs.scrollPanel) {
            this.refs.scrollPanel.scrollToTop();
        }
    },

    /* jump to the bottom of the content.
     */
    scrollToBottom: function() {
        if (this.refs.scrollPanel) {
            this.refs.scrollPanel.scrollToBottom();
        }
    },

    /**
     * Page up/down.
     *
     * @param {number} mult: -1 to page up, +1 to page down
     */
    scrollRelative: function(mult) {
        if (this.refs.scrollPanel) {
            this.refs.scrollPanel.scrollRelative(mult);
        }
    },

    /**
     * Scroll up/down in response to a scroll key
     *
     * @param {KeyboardEvent} ev: the keyboard event to handle
     */
    handleScrollKey: function(ev) {
        if (this.refs.scrollPanel) {
            this.refs.scrollPanel.handleScrollKey(ev);
        }
    },

    /* jump to the given event id.
     *
     * offsetBase gives the reference point for the pixelOffset. 0 means the
     * top of the container, 1 means the bottom, and fractional values mean
     * somewhere in the middle. If omitted, it defaults to 0.
     *
     * pixelOffset gives the number of pixels *above* the offsetBase that the
     * node (specifically, the bottom of it) will be positioned. If omitted, it
     * defaults to 0.
     */
    scrollToEvent: function(eventId, pixelOffset, offsetBase) {
        if (this.refs.scrollPanel) {
            this.refs.scrollPanel.scrollToToken(eventId, pixelOffset, offsetBase);
        }
    },

    /* check the scroll state and send out pagination requests if necessary.
     */
    checkFillState: function() {
        if (this.refs.scrollPanel) {
            this.refs.scrollPanel.checkFillState();
        }
    },

    _isUnmounting: function() {
        return !this._isMounted;
    },


    // once dynamic content in the events load, make the scrollPanel check the
    // scroll offsets.
    _onWidgetLoad: function() {
        const scrollPanel = this.refs.scrollPanel;
        if (scrollPanel) {
            scrollPanel.forceUpdate();
        }
    },

    onResize: function() {
        dis.dispatch({ action: 'timeline_resize' }, true);
    },

    async _onFillRequest(backwards) {
        await this._initialLoadPromise;
        if (this.state.sections.length) {
            const section = backwards ?
                this._firstSection() :
                this._lastSection();
            const result = await section.ref.onFillRequest(backwards);
            if (typeof result === "object") {
                console.log(`starting a new section after calling child section onFillRequest`, result);
                // start new section
                let newSections;
                const newSection = {model: result};
                if (backwards) {
                    // prepend section
                    newSections = [newSection].concat(this.state.sections);
                } else {
                    // append section
                    newSections = this.state.sections.concat(newSection);
                }
                await new Promise((resolve) => {
                    this.setState({sections: newSections}, resolve);
                });
                return true;
            } else {
                return result;
            }
        } else {
            return false;
        }
    },

    _onUnfillRequest(backwards, scrollToken) {
        if (this.state.sections.length) {
            const section = backwards ?
                this._firstSection() :
                this._lastSection();
            return section.ref.onUnfillRequest(backwards, scrollToken);
        } else {
            return Promise.resolve(false);
        }
    },

    isAtEndOfLiveTimeline() {
        return this.isAtBottom() && this._lastSection().model.timelineWindow.canPaginate(EventTimeline.FORWARDS);
    },

    canJumpToReadMarker() {
        return false;
    },

    _initTimeline: async function() {
        const initialEvent = this.props.eventId;
        const pixelOffset = this.props.eventPixelOffset;

        // if a pixelOffset is given, it is relative to the bottom of the
        // container. If not, put the event in the middle of the container.
        let offsetBase = 1;
        if (pixelOffset == null) {
            offsetBase = 0.5;
        }

        const result = await this._loadTimeline(initialEvent, pixelOffset, offsetBase);
        this._initialLoadPromise = Promise.resolve();
        return result;
    },

    async _loadTimeline(eventId, pixelOffset, offsetBase) {
        const timelineWindow = new Matrix.TimelineWindow(
            MatrixClientPeg.get(), this.props.timelineSet,
            {windowLimit: this.props.timelineCap});

        try {
            await timelineWindow.load(eventId, INITIAL_SIZE);

            this.setState({
                sections: [{model: {timelineWindow}}]
            });
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

    /**
     * called by the parent component when PageUp/Down/etc is pressed.
     *
     * We pass it down to the scroll panel.
     */
    handleScrollKey: function(ev) {
        if (!this.refs.messagePanel) { return; }

        // jump to the live timeline on ctrl-end, rather than the end of the
        // timeline window.
        if (ev.ctrlKey && !ev.shiftKey && !ev.altKey && !ev.metaKey &&
            ev.keyCode == KeyCode.END) {
            this.jumpToLiveTimeline();
        } else {
            this.refs.messagePanel.handleScrollKey(ev);
        }
    },

    /* jump down to the bottom of this room, where new events are arriving
     */
    jumpToLiveTimeline: function() {
        // if we can't forward-paginate the existing timeline, then there
        // is no point reloading it - just jump straight to the bottom.
        //
        // Otherwise, reload the timeline rather than trying to paginate
        // through all of space-time.
        if (this._lastSection() && this._lastSection().model.timelineWindow.canPaginate(EventTimeline.FORWARDS)) {
            this._loadTimeline();
        } else {
            if (this.refs.scrollPanel) {
                this.refs.scrollPanel.scrollToBottom();
            }
        }
    },

    /* scroll to show the read-up-to marker. We put it 1/3 of the way down
     * the container.
     */
    jumpToReadMarker: function() {
        if (!this.props.manageReadMarkers) return;
        if (!this.refs.messagePanel) return;
        if (!this.state.readMarkerEventId) return;

        // we may not have loaded the event corresponding to the read-marker
        // into the _timelineWindow. In that case, attempts to scroll to it
        // will fail.
        //
        // a quick way to figure out if we've loaded the relevant event is
        // simply to check if the messagepanel knows where the read-marker is.
        const ret = this.refs.messagePanel.getReadMarkerPosition();
        if (ret !== null) {
            // The messagepanel knows where the RM is, so we must have loaded
            // the relevant event.
            this.refs.messagePanel.scrollToEvent(this.state.readMarkerEventId,
                                                 0, 1/3);
            return;
        }

        // Looks like we haven't loaded the event corresponding to the read-marker.
        // As with jumpToLiveTimeline, we want to reload the timeline around the
        // read-marker.
        this._loadTimeline(this.state.readMarkerEventId, 0, 1/3);
    },

    _collectSection: function(section) {
        if (section) {
            this.state.sections[section.props.index].ref = section;
        }
    },

    _lastSection: function() {
        const sections = this.state.sections;
        return sections[sections.length - 1];
    },

    _firstSection: function() {
        return this.state.sections[0];
    },

    _onNewLiveSection: function(model) {
        this.setState(this.state.sections.concat({model}));
    },

    render: function() {
        const ScrollPanel = sdk.getComponent("structures.ScrollPanel");
        const ThreadedSection = sdk.getComponent("structures.ThreadedSection");
        const NonThreadedSection = sdk.getComponent("structures.NonThreadedSection");
        const {className, hidden, onScroll, stickyBottom, ... sectionProps} = this.props;
        const style = {};
        if (hidden) {
            style.display = 'none';
        }
        /*
        FIXME: THREADS: need to port this stickyBottom code from TimelinePanel:
        // give the messagepanel a stickybottom if we're at the end of the
        // live timeline, so that the arrival of new events triggers a
        // scroll.
        //
        // Make sure that stickyBottom is *false* if we can paginate
        // forwards, otherwise if somebody hits the bottom of the loaded
        // events when viewing historical messages, we get stuck in a loop
        // of paginating our way through the entire history of the room.
        const stickyBottom = !this._timelineWindow.canPaginate(EventTimeline.FORWARDS);
        */

        this.sectionComponents = [];
        const sectionComponents = this.state.sections.map(({model}, i) => {
            let component;
            const isLast = i === (this.state.sections.length - 1);
            const newLiveSectionCallback = isLast ? this._onNewLiveSection : undefined;
            if (model.thread) {
                component = (<ThreadedSection
                    thread={model.thread}
                    timelineWindow={model.timelineWindow}
                    key={`thread/${model.thread}`}
                    index={i}
                    ref={this._collectSection}
                    isLive={isLast}
                    onNewSection={newLiveSectionCallback}
                />);
            } else {
                component = (<NonThreadedSection
                    timelineWindow={model.timelineWindow}
                    key={`mainline/${model.timelineWindow.key}`}
                    index={i}
                    ref={this._collectSection}
                    isLive={isLast}
                    onNewSection={newLiveSectionCallback}
                />);
            }
            return component;
        });

        return (
            <ScrollPanel ref="scrollPanel" className={className}
                    onScroll={onScroll}
                    onResize={this.onResize}
                    onFillRequest={this._onFillRequest}
                    onUnfillRequest={this._onUnfillRequest}
                    style={style}
                    stickyBottom={stickyBottom}>
                { sectionComponents }
            </ScrollPanel>
        );
    },
});


/*
this.setState({
                canBackPaginate: timelineWindow.canPaginate(EventTimeline.BACKWARDS),
                canForwardPaginate: timelineWindow.canPaginate(EventTimeline.FORWARDS),
                timelineLoading: false,
            }
*/
