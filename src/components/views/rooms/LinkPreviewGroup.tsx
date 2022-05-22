/*
Copyright 2021 The Matrix.org Foundation C.I.C.

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

import React, { useContext, useEffect } from "react";
import { MatrixEvent } from "matrix-js-sdk/src/models/event";
import { MatrixClient } from "matrix-js-sdk/src/client";
import { logger } from "matrix-js-sdk/src/logger";
import { EventType } from "matrix-js-sdk/src/@types/event";

import { useStateToggle } from "../../../hooks/useStateToggle";
import LinkPreviewWidget, { Preview } from "./LinkPreviewWidget";
import AccessibleButton from "../elements/AccessibleButton";
import { _t } from "../../../languageHandler";
import MatrixClientContext from "../../../contexts/MatrixClientContext";
import { useAsyncMemo } from "../../../hooks/useAsyncMemo";
import MatrixToPermalinkConstructor from "../../../utils/permalinks/MatrixToPermalinkConstructor";
import { getCachedRoomIDForAlias } from "../../../RoomAliasCache";
import { MessagePreviewStore } from "../../../stores/room-list/MessagePreviewStore";

const INITIAL_NUM_PREVIEWS = 2;

interface IProps {
    links: string[]; // the URLs to be previewed
    mxEvent: MatrixEvent; // the Event associated with the preview
    onCancelClick(): void; // called when the preview's cancel ('hide') button is clicked
    onHeightChanged(): void; // called when the preview's contents has loaded
}

const LinkPreviewGroup: React.FC<IProps> = ({ links, mxEvent, onCancelClick, onHeightChanged }) => {
    const cli = useContext(MatrixClientContext);
    const [expanded, toggleExpanded] = useStateToggle();

    const ts = mxEvent.getTs();
    const previews = useAsyncMemo<[string, Preview][]>(async () => {
        return fetchPreviews(cli, links, ts);
    }, [links, ts], []);

    useEffect(() => {
        onHeightChanged();
    }, [onHeightChanged, expanded, previews]);

    const showPreviews = expanded ? previews : previews.slice(0, INITIAL_NUM_PREVIEWS);

    let toggleButton: JSX.Element;
    if (previews.length > INITIAL_NUM_PREVIEWS) {
        toggleButton = <AccessibleButton onClick={toggleExpanded}>
            { expanded
                ? _t("Collapse")
                : _t("Show %(count)s other previews", { count: previews.length - showPreviews.length }) }
        </AccessibleButton>;
    }

    return <div className="mx_LinkPreviewGroup">
        { showPreviews.map(([link, preview], i) => (
            <LinkPreviewWidget key={link} link={link} preview={preview} mxEvent={mxEvent}>
                { i === 0 ? (
                    <AccessibleButton
                        className="mx_LinkPreviewGroup_hide"
                        onClick={onCancelClick}
                        aria-label={_t("Close preview")}
                    >
                        <img
                            className="mx_filterFlipColor"
                            alt=""
                            role="presentation"
                            src={require("../../../../res/img/cancel.svg").default}
                            width="18"
                            height="18"
                        />
                    </AccessibleButton>
                ): undefined }
            </LinkPreviewWidget>
        )) }
        { toggleButton }
    </div>;
};

const fetchPreviews = (cli: MatrixClient, links: string[], ts: number): Promise<[string, Preview][]> => {
    return Promise.all<[string, Preview] | void>(links.map(async link => {
        try {
            // For comprehensible matrix.to links try to preview them better, using firstly local data,
            // falling back to the room summary API, falling back to a boring old server-side preview otherwise.
            const decoded = decodeURIComponent(link);
            let preview: Preview;
            if (decoded) {
                const permalink = new MatrixToPermalinkConstructor().parsePermalink(decoded);
                const roomId = permalink.roomIdOrAlias[0] === "!"
                    ? permalink.roomIdOrAlias
                    : getCachedRoomIDForAlias(permalink.roomIdOrAlias);
                const room = cli.getRoom(roomId);
                if (room) {
                    const topic = room.currentState.getStateEvents(EventType.RoomTopic, "")?.getContent().topic;
                    const event = permalink.eventId && room.findEventById(permalink.eventId);
                    if (event) {
                        preview = {
                            title: room.name,
                            summary: topic,
                            description: <>
                                { MessagePreviewStore.instance.generatePreviewForEvent(event) }
                            </>,
                            avatarUrl: room.getMxcAvatarUrl(),
                        };
                    } else {
                        preview = {
                            title: room.name,
                            description: topic,
                            avatarUrl: room.getMxcAvatarUrl(),
                        };
                    }
                } else {
                    preview = await cli.getRoomSummary(permalink.roomIdOrAlias, permalink.viaServers).then(summary => ({
                        title: summary.name,
                        description: summary.topic,
                        avatarUrl: summary.avatar_url,
                    }));
                }
            }

            // Fall back to a server-side preview always
            if (!preview) {
                preview = await cli.getUrlPreview(link, ts);
            }

            if (preview && Object.keys(preview).length > 0) {
                return [link, preview];
            }
        } catch (error) {
            logger.error("Failed to get URL preview: " + error);
        }
    })).then(a => a.filter(Boolean)) as Promise<[string, Preview][]>;
};

export default LinkPreviewGroup;
