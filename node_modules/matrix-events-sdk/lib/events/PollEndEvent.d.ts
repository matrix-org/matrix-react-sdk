import { M_POLL_END_EVENT_CONTENT } from "./poll_types";
import { IPartialEvent } from "../IPartialEvent";
import { MessageEvent } from "./MessageEvent";
import { EventType } from "../utility/events";
import { ExtensibleEvent } from "./ExtensibleEvent";
/**
 * Represents a poll end/closure event.
 */
export declare class PollEndEvent extends ExtensibleEvent<M_POLL_END_EVENT_CONTENT> {
    /**
     * The poll start event ID referenced by the response.
     */
    readonly pollEventId: string;
    /**
     * The closing message for the event.
     */
    readonly closingMessage: MessageEvent;
    /**
     * Creates a new PollEndEvent from a pure format. Note that the event is *not*
     * parsed here: it will be treated as a literal m.poll.response primary typed event.
     * @param {IPartialEvent<M_POLL_END_EVENT_CONTENT>} wireFormat The event.
     */
    constructor(wireFormat: IPartialEvent<M_POLL_END_EVENT_CONTENT>);
    isEquivalentTo(primaryEventType: EventType): boolean;
    serialize(): IPartialEvent<object>;
    /**
     * Creates a new PollEndEvent from a poll event ID.
     * @param {string} pollEventId The poll start event ID.
     * @param {string} message A closing message, typically revealing the top answer.
     * @returns {PollStartEvent} The representative poll closure event.
     */
    static from(pollEventId: string, message: string): PollEndEvent;
}
