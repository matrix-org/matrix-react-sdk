import { MessageEvent } from "./MessageEvent";
import { IPartialEvent } from "../IPartialEvent";
import { M_NOTICE_EVENT_CONTENT } from "./message_types";
import { EventType } from "../utility/events";
/**
 * Represents a notice. This is essentially a MessageEvent with
 * notice characteristics considered.
 */
export declare class NoticeEvent extends MessageEvent {
    constructor(wireFormat: IPartialEvent<M_NOTICE_EVENT_CONTENT>);
    get isNotice(): boolean;
    isEquivalentTo(primaryEventType: EventType): boolean;
    serialize(): IPartialEvent<object>;
    /**
     * Creates a new NoticeEvent from text and HTML.
     * @param {string} text The text.
     * @param {string} html Optional HTML.
     * @returns {MessageEvent} The representative message event.
     */
    static from(text: string, html?: string): NoticeEvent;
}
