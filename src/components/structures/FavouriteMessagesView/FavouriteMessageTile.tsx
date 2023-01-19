/*
Copyright 2023 The Matrix.org Foundation C.I.C.

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

import React, { FC } from "react";
import { MatrixEvent } from "matrix-js-sdk/src/models/event";

import RoomContext from "../../../contexts/RoomContext";
import SettingsStore from "../../../settings/SettingsStore";
import { RoomPermalinkCreator } from "../../../utils/permalinks/Permalinks";
import DateSeparator from "../../views/messages/DateSeparator";
import EventTile from "../../views/rooms/EventTile";
import { shouldFormContinuation } from "../MessagePanel";
import { wantsDateSeparator } from "../../../DateUtils";
import { haveRendererForEvent } from "../../../events/EventTileFactory";
import { Layout } from "../../../settings/enums/Layout";
import { FavouriteMessagesStore } from "../../../stores/FavouriteMessagesStore";

interface IProps {
    // an event result object
    result: MatrixEvent;
    // href for the highlights in this result
    resultLink: string;
    // a list of strings to be highlighted in the results
    searchHighlights?: string[];
    onHeightChanged?: () => void;
    permalinkCreator?: RoomPermalinkCreator;
    //a list containing the saved items events
    timeline: MatrixEvent[];

    // Provide this to use a different store for favourite messages
    // e.g. in tests. If not supplied, we use the global default.
    favouriteMessagesStore?: FavouriteMessagesStore;
}

const FavouriteMessageTile: FC<IProps> = (props: IProps) => {
    let context!: React.ContextType<typeof RoomContext>;

    const result = props.result;
    const eventId = result.getId();

    const ts1 = result?.getTs();
    const ret = [<DateSeparator key={ts1 + "-search"} roomId={result.getRoomId()!} ts={ts1} />];
    const layout = SettingsStore.getValue<Layout>("layout");
    const isTwelveHour = !!SettingsStore.getValue<boolean>("showTwelveHourTimestamps");
    const alwaysShowTimestamps = !!SettingsStore.getValue<boolean>("alwaysShowTimestamps");
    const threadsEnabled = !!SettingsStore.getValue<boolean>("feature_threadenabled");

    for (let j = 0; j < props?.timeline.length; j++) {
        const mxEv = props?.timeline[j];
        const highlights = props?.searchHighlights;

        if (haveRendererForEvent(mxEv, context?.showHiddenEvents)) {
            // do we need a date separator since the last event?
            const prevEv = props.timeline[j - 1];
            // is this a continuation of the previous message?
            const continuation =
                !dateSeparator(prevEv, mxEv) &&
                shouldFormContinuation(prevEv, mxEv, context?.showHiddenEvents, threadsEnabled);

            let lastInSection = true;
            const nextEv = props?.timeline[j + 1];
            if (nextEv) {
                lastInSection =
                    dateSeparator(mxEv, nextEv) ||
                    mxEv.getSender() !== nextEv.getSender() ||
                    !shouldFormContinuation(mxEv, nextEv, context?.showHiddenEvents, threadsEnabled);
            }

            ret.push(
                <EventTile
                    key={`${eventId}+${j}`}
                    mxEvent={mxEv}
                    layout={layout}
                    highlights={highlights}
                    permalinkCreator={props.permalinkCreator}
                    highlightLink={props.resultLink}
                    onHeightChanged={props.onHeightChanged}
                    isTwelveHour={isTwelveHour}
                    alwaysShowTimestamps={alwaysShowTimestamps}
                    lastInSection={lastInSection}
                    continuation={continuation}
                    isFavouritesView={true}
                    favouriteMessagesStore={props.favouriteMessagesStore}
                />,
            );
        }
    }

    return (
        <li data-scroll-tokens={eventId}>
            <ol>{ret}</ol>
        </li>
    );
};

function dateSeparator(event1: MatrixEvent | undefined, event2: MatrixEvent | undefined): boolean {
    if (!event1 || !event2) {
        return false;
    }
    const date1 = event1.getDate();
    const date2 = event2.getDate();
    if (!date1 || !date2) {
        return false;
    }
    return wantsDateSeparator(date1, date2);
}

export default FavouriteMessageTile;
