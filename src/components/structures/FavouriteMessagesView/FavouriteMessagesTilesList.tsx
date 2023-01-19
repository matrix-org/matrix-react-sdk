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

import { MatrixClient, MatrixEvent } from "matrix-js-sdk/src/matrix";
import React, { FC, useCallback } from "react";

import { _t } from "../../../languageHandler";
import { FavouriteMessagesStore } from "../../../stores/FavouriteMessagesStore";
import Spinner from "../../views/elements/Spinner";
import FavouriteMessageTile from "./FavouriteMessageTile";

interface IProps {
    favouriteMessageEvents: MatrixEvent[] | null;
    favouriteMessagesPanelRef: any;
    searchQuery: string;
    cli: MatrixClient;

    // Provide this to use a different store for favourite messages
    // e.g. in tests. If not supplied, we use the global default.
    favouriteMessagesStore?: FavouriteMessagesStore;
}

const FavouriteMessagesTilesList: FC<IProps> = ({
    cli,
    favouriteMessageEvents,
    favouriteMessagesPanelRef,
    searchQuery,
    favouriteMessagesStore,
}: IProps) => {
    const ret: JSX.Element[] = [];
    let lastRoomId: string;
    const highlights: string[] = [];

    // once dynamic content in the favourite messages panel loads, make the scrollPanel check
    // the scroll offsets.
    const onHeightChanged = useCallback(() => {
        const scrollPanel = favouriteMessagesPanelRef.current;
        if (scrollPanel) {
            scrollPanel.checkScroll();
        }
    }, [favouriteMessagesPanelRef]);

    if (!favouriteMessageEvents) {
        ret.push(<Spinner key="spinner" />);
    } else {
        favouriteMessageEvents.forEach((mxEvent) => {
            const timeline = [] as MatrixEvent[];
            const roomId = mxEvent.getRoomId();
            const room = cli?.getRoom(roomId);

            timeline.push(mxEvent);
            if (searchQuery) {
                highlights.push(searchQuery);
            }

            if (roomId !== lastRoomId) {
                ret.push(
                    <li key={mxEvent.getId() + "-room"}>
                        <h2>
                            {_t("Room")}: {room ? room.name : ""}
                        </h2>
                    </li>,
                );
                lastRoomId = roomId!;
            }

            const resultLink = "#/room/" + roomId + "/" + mxEvent.getId();

            ret.push(
                <FavouriteMessageTile
                    key={mxEvent.getId()}
                    searchHighlights={highlights}
                    result={mxEvent}
                    resultLink={resultLink}
                    timeline={timeline}
                    onHeightChanged={onHeightChanged}
                    favouriteMessagesStore={favouriteMessagesStore}
                />,
            );
        });
    }

    return <>{ret}</>;
};

export default FavouriteMessagesTilesList;
