import { MessageEvent } from "./MessageEvent";
import { IPartialEvent } from "../IPartialEvent";
import { M_EMOTE_EVENT_CONTENT } from "./message_types";
import { EventType } from "../utility/events";
/**
 * Represents an emote. This is essentially a MessageEvent with
 * emote characteristics considered.
 */
export declare class EmoteEvent extends MessageEvent {
    constructor(wireFormat: IPartialEvent<M_EMOTE_EVENT_CONTENT>);
    get isEmote(): boolean;
    isEquivalentTo(primaryEventType: EventType): boolean;
    serialize(): IPartialEvent<object>;
    /**
     * Creates a new EmoteEvent from text and HTML.
     * @param {string} text The text.
     * @param {string} html Optional HTML.
     * @returns {MessageEvent} The representative message event.
     */
    static from(text: string, html?: string): EmoteEvent;
}
