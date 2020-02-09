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

import React, {useEffect} from 'react';
import PropTypes from 'prop-types';
import MemberAvatar from '../avatars/MemberAvatar';
import { _t } from '../../../languageHandler';
import {MatrixEvent, RoomMember} from "matrix-js-sdk";
import {useStateToggle} from "../../../hooks/useStateToggle";

const EventListSummary = ({events, children, threshold=3, onToggle, startExpanded, summaryMembers=[], summaryText}) => {
    const [expanded, toggleExpanded] = useStateToggle(startExpanded);

    // Whenever expanded changes call onToggle
    useEffect(() => {
        if (onToggle) {
            onToggle();
        }
    }, [expanded]); // eslint-disable-line react-hooks/exhaustive-deps

    const eventIds = events.map((e) => e.getId()).join(',');

    // If we are only given few events then just pass them through
    if (events.length < threshold) {
        return (
            <div className="mx_EventListSummary" data-scroll-tokens={eventIds}>
                { children }
            </div>
        );
    }

    if (expanded) {
        return (
            <div className="mx_EventListSummary" data-scroll-tokens={eventIds}>
                <div className={"mx_EventListSummary_toggle mx_EventListSummary_toggle_expanded"} onClick={toggleExpanded}></div>
                <div className="mx_EventListSummary_line">&nbsp;</div>
                { children }
            </div>
        );
    }

    const avatars = summaryMembers.map((m) => <MemberAvatar key={m.userId} member={m} width={14} height={14} />);
    return (
        <div className="mx_EventListSummary" data-scroll-tokens={eventIds}>
            <div className={"mx_EventListSummary_toggle mx_EventListSummary_toggle_collapsed"} onClick={toggleExpanded}></div>
            <div className="mx_EventTile_line">
                <div className="mx_EventTile_info">
                    <span className="mx_EventListSummary_avatars" onClick={toggleExpanded}>
                        { avatars }
                    </span>
                    <span className="mx_TextualEvent mx_EventListSummary_summary">
                        { summaryText }
                    </span>
                </div>
            </div>
        </div>
    );
};

EventListSummary.propTypes = {
    // An array of member events to summarise
    events: PropTypes.arrayOf(PropTypes.instanceOf(MatrixEvent)).isRequired,
    // An array of EventTiles to render when expanded
    children: PropTypes.arrayOf(PropTypes.element).isRequired,
    // The minimum number of events needed to trigger summarisation
    threshold: PropTypes.number,
    // Called when the event list expansion is toggled
    onToggle: PropTypes.func,
    // Whether or not to begin with state.expanded=true
    startExpanded: PropTypes.bool,

    // The list of room members for which to show avatars next to the summary
    summaryMembers: PropTypes.arrayOf(PropTypes.instanceOf(RoomMember)),
    // The text to show as the summary of this event list
    summaryText: PropTypes.string.isRequired,
};

export default EventListSummary;
