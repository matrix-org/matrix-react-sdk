/*
Copyright 2015, 2016 OpenMarket Ltd
Copyright 2017 New Vector Ltd

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

import React from 'react';
import PropTypes from 'prop-types';
import MatrixClientPeg from '../../../MatrixClientPeg';
import sdk from '../../../index';

class ThreadLayout {
    constructor(threadNode, timelineNode) {
        this.threadNode = threadNode;
        this.topResizedNode = threadNode;
        this.timelineNode = timelineNode;
    }

    update() {
        const isBelowThreadTop = (sibling) => {
            return (sibling.offsetTop + sibling.offsetHeight) >
                   (this.threadNode.offsetTop - threadHeight);
        };

        const isAboveThreadTop = (sibling) => {
            return (sibling.offsetTop + sibling.offsetHeight) <
                   (this.threadNode.offsetTop - threadHeight);
        };

        const threadHeight = this.timelineNode.offsetHeight;
        let sibling = this.topResizedNode;

        while (sibling.previousElementSibling && isBelowThreadTop(sibling.previousElementSibling)) {
            sibling = sibling.previousElementSibling;
            sibling.classList.add("mx_EventTile_threadNeigbour");
        }

        while (sibling.nextElementSibling && isAboveThreadTop(sibling.nextElementSibling)) {
            sibling = sibling.nextElementSibling;
            sibling.classList.remove("mx_EventTile_threadNeigbour");
        }

        this.topResizedNode = sibling;
    }

    shouldBackPaginate() {
        return this.timelineNode.offsetHeight < this.threadNode.offsetTop;
    }
}

const ThreadEvent = React.createClass({
    displayName: 'ThreadEvent',

    propTypes: {
        /* the MatrixEvent to show */
        mxEvent: PropTypes.object.isRequired,
    },

    async backPaginate() {
        console.log("back paginating thread " + ThreadEvent.getThreadId(this.props.mxEvent));
        let mayHaveMoreEvents = true;
        while(mayHaveMoreEvents && this.layout.shouldBackPaginate()) {
            mayHaveMoreEvents = await this.refs.timeline.onMessageListFillRequest(true);
        }
        await new Promise(resolve => setTimeout(resolve, 500));
        this.layout.update();
    },

    render() {
        const mxEvent = this.props.mxEvent;
        const client = MatrixClientPeg.get();
        const room = client.getRoom(mxEvent.getRoomId());
        const threadId = ThreadEvent.getThreadId(mxEvent);
        const thread = room.getThreadTimelineSet(threadId);
        const TimelinePanel = sdk.getComponent("structures.TimelinePanel");
        return (<div className="mx_ThreadEvent" ref="root">
            <div className="mx_ThreadEvent_timelineContainer">
                <TimelinePanel
                    ref="timeline"
                    className="mx_ThreadEvent_timeline"
                    timelineSet={thread}
                    showReadReceipts={false}
                    manageReadReceipts={false}
                    manageReadMarkers={false}
                />
            </div>
            <div className="mx_ThreadEvent_marker">
                { `THREAD ${threadId} GOT MERGED! HAVE A LOOK ABOVE ^`}
            </div>
        </div>);
    },

    async componentDidMount() {
        const eventTileRoot = this.refs.root.parentElement.parentElement.parentElement;
        const threadTimeline = eventTileRoot.querySelector(".mx_ThreadEvent_timeline");
        this.layout = new ThreadLayout(eventTileRoot, threadTimeline);
        await this.backPaginate();
        if (this.props.threadSet) {
            this.props.threadSet.add(this);
        }
    },

    componentDidUpdate() {
        this.layout.update();
    }
});

ThreadEvent.getThreadId = function(mxEvent) {
    const prefix = "m.thread/merge/";
    if (mxEvent.getType() === "m.room.message") {
        const body = mxEvent.getContent().body;
        if (body && body.startsWith(prefix)) {
            return body.substr(prefix.length);
        }
    }
}

module.exports = ThreadEvent;
