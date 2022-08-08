import { ExtensibleEvent } from "./ExtensibleEvent";
import { M_POLL_RESPONSE_EVENT_CONTENT } from "./poll_types";
import { IPartialEvent } from "../IPartialEvent";
import { PollStartEvent } from "./PollStartEvent";
import { EventType } from "../utility/events";
/**
 * Represents a poll response event.
 */
export declare class PollResponseEvent extends ExtensibleEvent<M_POLL_RESPONSE_EVENT_CONTENT> {
    private internalAnswerIds;
    private internalSpoiled;
    /**
     * The provided answers for the poll. Note that this may be falsy/unpredictable if
     * the `spoiled` property is true.
     */
    get answerIds(): string[];
    /**
     * The poll start event ID referenced by the response.
     */
    readonly pollEventId: string;
    /**
     * Whether the vote is spoiled.
     */
    get spoiled(): boolean;
    /**
     * Creates a new PollResponseEvent from a pure format. Note that the event is *not*
     * parsed here: it will be treated as a literal m.poll.response primary typed event.
     *
     * To validate the response against a poll, call `validateAgainst` after creation.
     * @param {IPartialEvent<M_POLL_RESPONSE_EVENT_CONTENT>} wireFormat The event.
     */
    constructor(wireFormat: IPartialEvent<M_POLL_RESPONSE_EVENT_CONTENT>);
    /**
     * Validates the poll response using the poll start event as a frame of reference. This
     * is used to determine if the vote is spoiled, whether the answers are valid, etc.
     * @param {PollStartEvent} poll The poll start event.
     */
    validateAgainst(poll: PollStartEvent): void;
    isEquivalentTo(primaryEventType: EventType): boolean;
    serialize(): IPartialEvent<object>;
    /**
     * Creates a new PollResponseEvent from a set of answers. To spoil the vote, pass an empty
     * answers array.
     * @param {string} answers The user's answers. Should be valid from a poll's answer IDs.
     * @param {string} pollEventId The poll start event ID.
     * @returns {PollStartEvent} The representative poll response event.
     */
    static from(answers: string[], pollEventId: string): PollResponseEvent;
}
