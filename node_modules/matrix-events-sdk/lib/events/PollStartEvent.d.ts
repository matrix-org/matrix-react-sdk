import { KNOWN_POLL_KIND, M_POLL_START_EVENT_CONTENT, POLL_ANSWER } from "./poll_types";
import { IPartialEvent } from "../IPartialEvent";
import { MessageEvent } from "./MessageEvent";
import { EventType } from "../utility/events";
import { ExtensibleEvent } from "./ExtensibleEvent";
/**
 * Represents a poll answer. Note that this is represented as a subtype and is
 * not registered as a parsable event - it is implied for usage exclusively
 * within the PollStartEvent parsing.
 */
export declare class PollAnswerSubevent extends MessageEvent {
    /**
     * The answer ID.
     */
    readonly id: string;
    constructor(wireFormat: IPartialEvent<POLL_ANSWER>);
    serialize(): IPartialEvent<object>;
    /**
     * Creates a new PollAnswerSubevent from ID and text.
     * @param {string} id The answer ID (unique within the poll).
     * @param {string} text The text.
     * @returns {PollAnswerSubevent} The representative answer.
     */
    static from(id: string, text: string): PollAnswerSubevent;
}
/**
 * Represents a poll start event.
 */
export declare class PollStartEvent extends ExtensibleEvent<M_POLL_START_EVENT_CONTENT> {
    /**
     * The question being asked, as a MessageEvent node.
     */
    readonly question: MessageEvent;
    /**
     * The interpreted kind of poll. Note that this will infer a value that is known to the
     * SDK rather than verbatim - this means unknown types will be represented as undisclosed
     * polls.
     *
     * To get the raw kind, use rawKind.
     */
    readonly kind: KNOWN_POLL_KIND;
    /**
     * The true kind as provided by the event sender. Might not be valid.
     */
    readonly rawKind: string;
    /**
     * The maximum number of selections a user is allowed to make.
     */
    readonly maxSelections: number;
    /**
     * The possible answers for the poll.
     */
    readonly answers: PollAnswerSubevent[];
    /**
     * Creates a new PollStartEvent from a pure format. Note that the event is *not*
     * parsed here: it will be treated as a literal m.poll.start primary typed event.
     * @param {IPartialEvent<M_POLL_START_EVENT_CONTENT>} wireFormat The event.
     */
    constructor(wireFormat: IPartialEvent<M_POLL_START_EVENT_CONTENT>);
    isEquivalentTo(primaryEventType: EventType): boolean;
    serialize(): IPartialEvent<object>;
    /**
     * Creates a new PollStartEvent from question, answers, and metadata.
     * @param {string} question The question to ask.
     * @param {string} answers The answers. Should be unique within each other.
     * @param {KNOWN_POLL_KIND|string} kind The kind of poll.
     * @param {number} maxSelections The maximum number of selections. Must be 1 or higher.
     * @returns {PollStartEvent} The representative poll start event.
     */
    static from(question: string, answers: string[], kind: KNOWN_POLL_KIND | string, maxSelections?: number): PollStartEvent;
}
