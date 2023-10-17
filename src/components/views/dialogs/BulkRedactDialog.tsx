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

import React, { useState } from "react";
import { logger } from "matrix-js-sdk/src/logger";
import { MatrixClient, RoomMember, Room, MatrixEvent, EventTimeline, EventType } from "matrix-js-sdk/src/matrix";

import { _t } from "../../../languageHandler";
import dis from "../../../dispatcher/dispatcher";
import { Action } from "../../../dispatcher/actions";
import BaseDialog from "../dialogs/BaseDialog";
import InfoDialog from "../dialogs/InfoDialog";
import DialogButtons from "../elements/DialogButtons";
import StyledCheckbox from "../elements/StyledCheckbox";

interface Props {
    matrixClient: MatrixClient;
    room: Room;
    member: RoomMember;
    onFinished(redact?: boolean): void;
}

const BulkRedactDialog: React.FC<Props> = (props) => {
    const { matrixClient: cli, room, member, onFinished } = props;
    const [keepStateEvents, setKeepStateEvents] = useState(true);

    let timeline: EventTimeline | null = room.getLiveTimeline();
    let eventsToRedact: MatrixEvent[] = [];
    while (timeline) {
        eventsToRedact = [
            ...eventsToRedact,
            ...timeline.getEvents().filter(
                (event) =>
                    event.getSender() === member.userId &&
                    !event.isRedacted() &&
                    !event.isRedaction() &&
                    event.getType() !== EventType.RoomCreate &&
                    // Don't redact ACLs because that'll obliterate the room
                    // See https://github.com/matrix-org/synapse/issues/4042 for details.
                    event.getType() !== EventType.RoomServerAcl &&
                    // Redacting encryption events is equally bad
                    event.getType() !== EventType.RoomEncryption,
            ),
        ];
        timeline = timeline.getNeighbouringTimeline(EventTimeline.BACKWARDS);
    }

    if (eventsToRedact.length === 0) {
        return (
            <InfoDialog
                onFinished={onFinished}
                title={_t("user_info|redact|no_recent_messages_title", { user: member.name })}
                description={
                    <div>
                        <p>{_t("user_info|redact|no_recent_messages_description")}</p>
                    </div>
                }
            />
        );
    } else {
        eventsToRedact = eventsToRedact.filter((event) => !(keepStateEvents && event.isState()));
        const count = eventsToRedact.length;
        const user = member.name;

        const redact = async (): Promise<void> => {
            logger.info(`Started redacting recent ${count} messages for ${member.userId} in ${room.roomId}`);
            dis.dispatch({
                action: Action.BulkRedactStart,
                room_id: room.roomId,
            });

            // Submitting a large number of redactions freezes the UI,
            // so first yield to allow to rerender after closing the dialog.
            await Promise.resolve();
            await Promise.all(
                eventsToRedact.reverse().map(async (event): Promise<void> => {
                    try {
                        await cli.redactEvent(room.roomId, event.getId()!);
                    } catch (err) {
                        // log and swallow errors
                        logger.error("Could not redact", event.getId());
                        logger.error(err);
                    }
                }),
            );

            logger.info(`Finished redacting recent ${count} messages for ${member.userId} in ${room.roomId}`);
            dis.dispatch({
                action: Action.BulkRedactEnd,
                room_id: room.roomId,
            });
        };

        return (
            <BaseDialog
                className="mx_BulkRedactDialog"
                onFinished={onFinished}
                title={_t("user_info|redact|confirm_title", { user })}
                contentId="mx_Dialog_content"
            >
                <div className="mx_Dialog_content" id="mx_Dialog_content">
                    <p>{_t("user_info|redact|confirm_description_1", { count, user })}</p>
                    <p>{_t("user_info|redact|confirm_description_2")}</p>
                    <StyledCheckbox checked={keepStateEvents} onChange={(e) => setKeepStateEvents(e.target.checked)}>
                        {_t("user_info|redact|confirm_keep_state_label")}
                    </StyledCheckbox>
                    <div className="mx_BulkRedactDialog_checkboxMicrocopy">
                        {_t("user_info|redact|confirm_keep_state_explainer")}
                    </div>
                </div>
                <DialogButtons
                    primaryButton={_t("user_info|redact|confirm_button", { count })}
                    primaryButtonClass="danger"
                    primaryDisabled={count === 0}
                    onPrimaryButtonClick={() => {
                        setImmediate(redact);
                        onFinished(true);
                    }}
                    onCancel={() => onFinished(false)}
                />
            </BaseDialog>
        );
    }
};

export default BulkRedactDialog;
