/*
Copyright 2016 OpenMarket Ltd
Copyright 2019, 2020 The Matrix.org Foundation C.I.C.
Copyright 2019 Michael Telatynski <7t3chguy@gmail.com>

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

import React, { ReactChildren } from 'react';
import { MatrixEvent } from "matrix-js-sdk/src/models/event";
import { RoomMember } from "matrix-js-sdk/src/models/room-member";

import EventListSummary from "./EventListSummary";
import {replaceableComponent} from "../../../utils/replaceableComponent";
import { IUserEvents, aggregateAndGenerateSummary } from "../../../crossplatform/memberEvents";

interface IProps {
    // An array of member events to summarise
    events: MatrixEvent[];
    // The maximum number of names to show in either each summary e.g. 2 would result "A, B and 234 others left"
    summaryLength?: number;
    // The maximum number of avatars to display in the summary
    avatarsMaxLength?: number;
    // The minimum number of events needed to trigger summarisation
    threshold?: number,
    // Whether or not to begin with state.expanded=true
    startExpanded?: boolean,
    // An array of EventTiles to render when expanded
    children: ReactChildren;
    // Called when the MELS expansion is toggled
    onToggle?(): void,
}

@replaceableComponent("views.elements.MemberEventListSummary")
export default class MemberEventListSummary extends React.Component<IProps> {
    static defaultProps = {
        summaryLength: 1,
        threshold: 3,
        avatarsMaxLength: 5,
    };

    shouldComponentUpdate(nextProps) {
        // Update if
        //  - The number of summarised events has changed
        //  - or if the summary is about to toggle to become collapsed
        //  - or if there are fewEvents, meaning the child eventTiles are shown as-is
        return (
            nextProps.events.length !== this.props.events.length ||
            nextProps.events.length < this.props.threshold
        );
    }

    render() {
        const eventsToRender = this.props.events;

        // Map user IDs to latest Avatar Member. ES6 Maps are ordered by when the key was created,
        // so this works perfectly for us to match event order whilst storing the latest Avatar Member
        const latestUserAvatarMember = new Map<string, RoomMember>();

        // Object mapping user IDs to an array of IUserEvents
        const userEvents: Record<string, IUserEvents[]> = {};
        eventsToRender.forEach((e, index) => {
            const userId = e.getStateKey();
            // Initialise a user's events
            if (!userEvents[userId]) {
                userEvents[userId] = [];
            }

            if (e.target) {
                latestUserAvatarMember.set(userId, e.target);
            }

            let displayName = userId;
            if (e.getType() === 'm.room.third_party_invite') {
                displayName = e.getContent().display_name;
            } else if (e.target) {
                displayName = e.target.name;
            }

            userEvents[userId].push({
                mxEvent: e,
                displayName,
                index: index,
            });
        });

        return <EventListSummary
            events={this.props.events}
            threshold={this.props.threshold}
            onToggle={this.props.onToggle}
            startExpanded={this.props.startExpanded}
            children={this.props.children}
            summaryMembers={[...latestUserAvatarMember.values()]}
            summaryText={aggregateAndGenerateSummary(userEvents, this.props.summaryLength)} />;
    }
}
