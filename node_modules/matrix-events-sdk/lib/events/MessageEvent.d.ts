import { ExtensibleEvent } from "./ExtensibleEvent";
import { IPartialEvent } from "../IPartialEvent";
import { Optional } from "../types";
import { IMessageRendering, M_MESSAGE_EVENT_CONTENT } from "./message_types";
import { EventType } from "../utility/events";
/**
 * Represents a message event. Message events are the simplest form of event with
 * just text (optionally of different mimetypes, like HTML).
 *
 * Message events can additionally be an Emote or Notice, though typically those
 * are represented as EmoteEvent and NoticeEvent respectively.
 */
export declare class MessageEvent extends ExtensibleEvent<M_MESSAGE_EVENT_CONTENT> {
    /**
     * The default text for the event.
     */
    readonly text: string;
    /**
     * The default HTML for the event, if provided.
     */
    readonly html: Optional<string>;
    /**
     * All the different renderings of the message. Note that this is the same
     * format as an m.message body but may contain elements not found directly
     * in the event content: this is because this is interpreted based off the
     * other information available in the event.
     */
    readonly renderings: IMessageRendering[];
    /**
     * Creates a new MessageEvent from a pure format. Note that the event is
     * *not* parsed here: it will be treated as a literal m.message primary
     * typed event.
     * @param {IPartialEvent<M_MESSAGE_EVENT_CONTENT>} wireFormat The event.
     */
    constructor(wireFormat: IPartialEvent<M_MESSAGE_EVENT_CONTENT>);
    /**
     * Gets whether this message is considered an "emote". Note that a message
     * might be an emote and notice at the same time: while technically possible,
     * the event should be interpreted as one or the other.
     */
    get isEmote(): boolean;
    /**
     * Gets whether this message is considered a "notice". Note that a message
     * might be an emote and notice at the same time: while technically possible,
     * the event should be interpreted as one or the other.
     */
    get isNotice(): boolean;
    isEquivalentTo(primaryEventType: EventType): boolean;
    protected serializeMMessageOnly(): M_MESSAGE_EVENT_CONTENT;
    serialize(): IPartialEvent<object>;
    /**
     * Creates a new MessageEvent from text and HTML.
     * @param {string} text The text.
     * @param {string} html Optional HTML.
     * @returns {MessageEvent} The representative message event.
     */
    static from(text: string, html?: string): MessageEvent;
}
