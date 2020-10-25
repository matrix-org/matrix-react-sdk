import { MatrixEvent } from "../indexing/BaseEventIndexManager";

/** A list of event types that require standoff in MessageActionBar.
 * Standoff stops the action bar intersecting with the MessageEvent.
 * See: https://github.com/matrix-org/matrix-react-sdk/pull/5329
 */
const eventTypesWithActionBarStandoff = [
    'm.sticker',
    'm.video',
    'm.key.verification.request',
    'm.room.encryption',
];

export function eventRequiresActionBarStandoff(event: MatrixEvent) {
    return eventTypesWithActionBarStandoff.includes(event.type)
        || event.type === 'm.room.message' && (event.content as any)?.msgtype === 'm.image';
}
