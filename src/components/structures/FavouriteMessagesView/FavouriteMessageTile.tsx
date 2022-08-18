/*
Copyright 2015 OpenMarket Ltd
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

import React from "react";
import { MatrixEvent } from "matrix-js-sdk/src/models/event";

import RoomContext from "../../../contexts/RoomContext";
import SettingsStore from "../../../settings/SettingsStore";
import { RoomPermalinkCreator } from '../../../utils/permalinks/Permalinks';
import DateSeparator from "../../views/messages/DateSeparator";
import EventTile from "../../views/rooms/EventTile";
import { shouldFormContinuation } from "../MessagePanel";
import { wantsDateSeparator } from "../../../DateUtils";
import { haveRendererForEvent } from "../../../events/EventTileFactory";

interface IProps {
    // an event result object
    result: MatrixEvent;
    // href for the highlights in this result
    resultLink?: string;
    onHeightChanged?: () => void;
    permalinkCreator?: RoomPermalinkCreator;
    //a list containing the saved items events
    timeline?: MatrixEvent[];
}

export default class FavouriteMessageTile extends React.Component<IProps> {
    static contextType = RoomContext;
    public context!: React.ContextType<typeof RoomContext>;

    constructor(props, context) {
        super(props, context);
    }

    public render() {
        const result = this.props.result;
        const eventId = result.getId();

        const ts1 = result?.getTs();
        const ret = [<DateSeparator key={ts1 + "-search"} roomId={result.getRoomId()} ts={ts1} />];
        const layout = SettingsStore.getValue("layout");
        const isTwelveHour = SettingsStore.getValue("showTwelveHourTimestamps");
        const alwaysShowTimestamps = SettingsStore.getValue("alwaysShowTimestamps");
        const threadsEnabled = SettingsStore.getValue("feature_thread");

        for (let j = 0; j < this.props.timeline.length; j++) {
            const mxEv = this.props.timeline[j];

            if (haveRendererForEvent(mxEv, this.context?.showHiddenEvents)) {
                // do we need a date separator since the last event?
                const prevEv = this.props.timeline[j - 1];
                // is this a continuation of the previous message?
                const continuation = prevEv &&
                    !wantsDateSeparator(prevEv.getDate(), mxEv.getDate()) &&
                    shouldFormContinuation(
                        prevEv,
                        mxEv,
                        this.context?.showHiddenEvents,
                        threadsEnabled,
                    );

                let lastInSection = true;
                const nextEv = this.props.timeline[j + 1];
                if (nextEv) {
                    const willWantDateSeparator = wantsDateSeparator(mxEv.getDate(), nextEv.getDate());
                    lastInSection = (
                        willWantDateSeparator ||
                        mxEv.getSender() !== nextEv.getSender() ||
                        !shouldFormContinuation(
                            mxEv,
                            nextEv,
                            this.context?.showHiddenEvents,
                            threadsEnabled,
                        )
                    );
                }

                ret.push(
                    <EventTile
                        key={`${eventId}+${j}`}
                        mxEvent={mxEv}
                        layout={layout}
                        permalinkCreator={this.props.permalinkCreator}
                        highlightLink={this.props.resultLink}
                        onHeightChanged={this.props.onHeightChanged}
                        isTwelveHour={isTwelveHour}
                        alwaysShowTimestamps={alwaysShowTimestamps}
                        lastInSection={lastInSection}
                        continuation={continuation}
                    />,
                );
            }
        }

        return <li data-scroll-tokens={eventId}>
            <ol>{ ret }</ol>
        </li>;
    }
}
