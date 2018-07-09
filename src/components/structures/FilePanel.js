/*
Copyright 2016 OpenMarket Ltd

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

import Matrix from 'matrix-js-sdk';
import sdk from '../../index';
import MatrixClientPeg from '../../MatrixClientPeg';
import { _t } from '../../languageHandler';

/*
 * Component which shows the filtered file using a TimelinePanel
 */
const FilePanel = React.createClass({
    displayName: 'FilePanel',

    propTypes: {
        roomId: PropTypes.string.isRequired,
    },

    getInitialState: function() {
        return {
            timelineSet: null,
        };
    },

    componentWillMount: function() {
        this.updateTimelineSet(this.props.roomId);
    },

    componentWillReceiveProps: function(nextProps) {
        if (nextProps.roomId !== this.props.roomId) {
            // otherwise we race between re-rendering the TimelinePanel and setting the new timelineSet.
            //
            // FIXME: this race only happens because of the promise returned by getOrCreateFilter().
            // We should only need to create the containsUrl filter once per login session, so in practice
            // it shouldn't be being done here at all.  Then we could just update the timelineSet directly
            // without resetting it first, and speed up room-change.
            this.setState({ timelineSet: null });
            this.updateTimelineSet(nextProps.roomId);
        }
    },

    updateTimelineSet: function(roomId) {
        const client = MatrixClientPeg.get();
        const room = client.getRoom(roomId);

        this.noRoom = !room;

        if (room) {
            const filter = new Matrix.Filter(client.credentials.userId);
            filter.setDefinition(
                {
                    "room": {
                        "timeline": {
                            "contains_url": true,
                            "types": [
                                "m.room.message",
                            ],
                        },
                    },
                },
            );

            // FIXME: we shouldn't be doing this every time we change room - see comment above.
            client.getOrCreateFilter("FILTER_FILES_" + client.credentials.userId, filter).then(
                (filterId)=>{
                    filter.filterId = filterId;
                    const timelineSet = room.getOrCreateFilteredTimelineSet(filter);
                    this.setState({ timelineSet: timelineSet });
                },
                (error)=>{
                    console.error("Failed to get or create file panel filter", error);
                },
            );
        } else {
            console.error("Failed to add filtered timelineSet for FilePanel as no room!");
        }
    },

    render: function() {
        if (MatrixClientPeg.get().isGuest()) {
            return <div className="mx_FilePanel mx_RoomView_messageListWrapper">
                <div className="mx_RoomView_empty">
                { _t("You must <a>register</a> to use this functionality",
                    {},
                    { 'a': (sub) => <a href="#/register" key="sub">{ sub }</a> })
                }
                </div>
            </div>;
        } else if (this.noRoom) {
            return <div className="mx_FilePanel mx_RoomView_messageListWrapper">
                <div className="mx_RoomView_empty">{ _t("You must join the room to see its files") }</div>
            </div>;
        }

        // wrap a TimelinePanel with the jump-to-event bits turned off.
        const TimelinePanel = sdk.getComponent("structures.TimelinePanel");
        const Loader = sdk.getComponent("elements.Spinner");

        if (this.state.timelineSet) {
            // console.log("rendering TimelinePanel for timelineSet " + this.state.timelineSet.room.roomId + " " +
            //             "(" + this.state.timelineSet._timelines.join(", ") + ")" + " with key " + this.props.roomId);
            return (
                <TimelinePanel key={"filepanel_" + this.props.roomId}
                    className="mx_FilePanel"
                    manageReadReceipts={false}
                    manageReadMarkers={false}
                    timelineSet={this.state.timelineSet}
                    showUrlPreview = {false}
                    tileShape="file_grid"
                    empty={_t('There are no visible files in this room')}
                />
            );
        } else {
            return (
                <div className="mx_FilePanel">
                    <Loader />
                </div>
            );
        }
    },
});

module.exports = FilePanel;
