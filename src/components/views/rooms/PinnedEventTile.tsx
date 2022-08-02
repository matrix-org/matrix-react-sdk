/*
Copyright 2017 Travis Ralston
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

import React from "react";
import { MatrixEvent } from "matrix-js-sdk/src/models/event";
import { Relations } from "matrix-js-sdk/src/models/relations";
import { EventType, RelationType } from "matrix-js-sdk/src/@types/event";
import { logger } from "matrix-js-sdk/src/logger";
import { M_POLL_START, M_POLL_RESPONSE, M_POLL_END } from "matrix-events-sdk";

import dis from "../../../dispatcher/dispatcher";
import { Action } from "../../../dispatcher/actions";
import AccessibleButton from "../elements/AccessibleButton";
import MessageEvent from "../messages/MessageEvent";
import MemberAvatar from "../avatars/MemberAvatar";
import { _t } from '../../../languageHandler';
import { formatDate } from '../../../DateUtils';
import MatrixClientContext from "../../../contexts/MatrixClientContext";
import { getUserNameColorClass } from "../../../utils/FormattingUtils";
import AccessibleTooltipButton from "../elements/AccessibleTooltipButton";
import { ViewRoomPayload } from "../../../dispatcher/payloads/ViewRoomPayload";
import { RoomPermalinkCreator } from "../../../utils/permalinks/Permalinks";

interface IProps {
    event: MatrixEvent;
    permalinkCreator: RoomPermalinkCreator;
    onUnpinClicked?(): void;
}

const AVATAR_SIZE = 24;

export default class PinnedEventTile extends React.Component<IProps> {
    public static contextType = MatrixClientContext;

    private onTileClicked = () => {
        dis.dispatch<ViewRoomPayload>({
            action: Action.ViewRoom,
            event_id: this.props.event.getId(),
            highlighted: true,
            room_id: this.props.event.getRoomId(),
            metricsTrigger: undefined, // room doesn't change
        });
    };

    // For event types like polls that use relations, we fetch those manually on
    // mount and store them here, exposing them through getRelationsForEvent
    private relations = new Map<string, Map<string, Relations>>();
    private getRelationsForEvent = (
        eventId: string,
        relationType: RelationType | string,
        eventType: EventType | string,
    ): Relations => {
        if (eventId === this.props.event.getId()) {
            return this.relations.get(relationType)?.get(eventType);
        }
    };

    async componentDidMount() {
        // Fetch poll responses
        if (M_POLL_START.matches(this.props.event.getType())) {
            const eventId = this.props.event.getId();
            const roomId = this.props.event.getRoomId();
            const room = this.context.getRoom(roomId);

            try {
                await Promise.all(
                    [M_POLL_RESPONSE.name, M_POLL_RESPONSE.altName, M_POLL_END.name, M_POLL_END.altName]
                        .map(async eventType => {
                            const relations = new Relations(RelationType.Reference, eventType, room);
                            relations.setTargetEvent(this.props.event);

                            if (!this.relations.has(RelationType.Reference)) {
                                this.relations.set(RelationType.Reference, new Map<string, Relations>());
                            }
                            this.relations.get(RelationType.Reference).set(eventType, relations);

                            let nextBatch: string | undefined;
                            do {
                                const page = await this.context.relations(
                                    roomId, eventId, RelationType.Reference, eventType, { from: nextBatch },
                                );
                                nextBatch = page.nextBatch;
                                page.events.forEach(event => relations.addEvent(event));
                            } while (nextBatch);
                        }),
                );
            } catch (err) {
                logger.error(`Error fetching responses to pinned poll ${eventId} in room ${roomId}`);
                logger.error(err);
            }
        }
    }

    render() {
        const sender = this.props.event.getSender();

        let unpinButton = null;
        if (this.props.onUnpinClicked) {
            unpinButton = (
                <AccessibleTooltipButton
                    onClick={this.props.onUnpinClicked}
                    className="mx_PinnedEventTile_unpinButton"
                    title={_t("Unpin")}
                />
            );
        }

        return <div className="mx_PinnedEventTile">
            <MemberAvatar
                className="mx_PinnedEventTile_senderAvatar"
                member={this.props.event.sender}
                width={AVATAR_SIZE}
                height={AVATAR_SIZE}
                fallbackUserId={sender}
            />

            <span className={"mx_PinnedEventTile_sender " + getUserNameColorClass(sender)}>
                { this.props.event.sender?.name || sender }
            </span>

            { unpinButton }

            <div className="mx_PinnedEventTile_message">
                <MessageEvent
                    mxEvent={this.props.event}
                    getRelationsForEvent={this.getRelationsForEvent}
                    // @ts-ignore - complaining that className is invalid when it's not
                    className="mx_PinnedEventTile_body"
                    maxImageHeight={150}
                    onHeightChanged={() => {}} // we need to give this, apparently
                    permalinkCreator={this.props.permalinkCreator}
                    replacingEventId={this.props.event.replacingEventId()}
                />
            </div>

            <div className="mx_PinnedEventTile_footer">
                <span className="mx_MessageTimestamp mx_PinnedEventTile_timestamp">
                    { formatDate(new Date(this.props.event.getTs())) }
                </span>

                <AccessibleButton onClick={this.onTileClicked} kind="link">
                    { _t("View message") }
                </AccessibleButton>
            </div>
        </div>;
    }
}
