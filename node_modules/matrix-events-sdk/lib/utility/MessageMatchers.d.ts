import { IPartialEvent } from "../IPartialEvent";
import { IPartialLegacyContent } from "../interpreters/legacy/MRoomMessage";
import { EitherAnd } from "../types";
import { M_MESSAGE_EVENT_CONTENT } from "../events/message_types";
/**
 * Represents a legacy m.room.message msgtype
 */
export declare enum LegacyMsgType {
    Text = "m.text",
    Notice = "m.notice",
    Emote = "m.emote"
}
/**
 * Determines if the given partial event looks similar enough to the given legacy msgtype
 * to count as that message type.
 * @param {IPartialEvent<EitherAnd<IPartialLegacyContent, M_MESSAGE_EVENT_CONTENT>>} event The event.
 * @param {LegacyMsgType} msgtype The message type to compare for.
 * @returns {boolean} True if the event appears to look similar enough to the msgtype.
 */
export declare function isEventLike(event: IPartialEvent<EitherAnd<IPartialLegacyContent, M_MESSAGE_EVENT_CONTENT>>, msgtype: LegacyMsgType): boolean;
