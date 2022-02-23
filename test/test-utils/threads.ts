import { MatrixClient, MatrixEvent, Room } from "matrix-js-sdk";
import { Thread } from "matrix-js-sdk/src/models/thread";

import { mkMessage, MessageEventProps } from "./test-utils";

export const makeThreadEvent = ({ rootEventId, replyToEventId, ...props }: MessageEventProps & {
    rootEventId: string; replyToEventId: string;
}): MatrixEvent => mkMessage({
    ...props,
    relatesTo: {
        event_id: rootEventId,
        rel_type: "io.element.thread",
        ['m.in_reply_to']: {
            event_id: replyToEventId,
        },
    },
});

type MakeThreadEventsProps = {
    roomId: Room["roomId"];
    authorId: string;
    participantUserIds: string[];
    length?: number; ts?: number;
};
export const makeThreadEvents = ({
    roomId, authorId, participantUserIds, length = 2, ts = 1,
}): { rootEvent: MatrixEvent, events: MatrixEvent[] } => {
    const rootEvent = mkMessage({
        user: authorId,
        event: true,
        room: roomId,
        msg: 'root event message',
        ts,
    });

    const rootEventId = rootEvent.getId();
    const events = [rootEvent];

    for (let i = 1; i < length; i++) {
        const prevEvent = events[i - 1];
        const replyToEventId = prevEvent.getId();
        const user = participantUserIds[i % participantUserIds.length];
        events.push(makeThreadEvent({
            user,
            room: roomId,
            event: true,
            msg: `reply ${i} by ${user}`,
            rootEventId,
            replyToEventId,
            ts: ts + i,
        }));
    }

    return { rootEvent, events };
};

export const makeThread = (client: MatrixClient, room: Room, props: MakeThreadEventsProps): Thread => {
    const { rootEvent, events } = makeThreadEvents(props);
    return new Thread(rootEvent, { initialEvents: events, room, client });
};
