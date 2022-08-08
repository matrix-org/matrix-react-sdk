import { UnstableValue } from "../NamespacedValue";
import { EitherAnd } from "../types";
/**
 * The namespaced value for m.message
 */
export declare const M_MESSAGE: UnstableValue<"m.message", "org.matrix.msc1767.message">;
/**
 * An m.message event rendering
 */
export interface IMessageRendering {
    body: string;
    mimetype?: string;
}
/**
 * The content for an m.message event
 */
export declare type M_MESSAGE_EVENT = EitherAnd<{
    [M_MESSAGE.name]: IMessageRendering[];
}, {
    [M_MESSAGE.altName]: IMessageRendering[];
}>;
/**
 * The namespaced value for m.text
 */
export declare const M_TEXT: UnstableValue<"m.text", "org.matrix.msc1767.text">;
/**
 * The content for an m.text event
 */
export declare type M_TEXT_EVENT = EitherAnd<{
    [M_TEXT.name]: string;
}, {
    [M_TEXT.altName]: string;
}>;
/**
 * The namespaced value for m.html
 */
export declare const M_HTML: UnstableValue<"m.html", "org.matrix.msc1767.html">;
/**
 * The content for an m.html event
 */
export declare type M_HTML_EVENT = EitherAnd<{
    [M_HTML.name]: string;
}, {
    [M_HTML.altName]: string;
}>;
/**
 * The content for an m.message, m.text, or m.html event
 */
export declare type M_MESSAGE_EVENT_CONTENT = M_MESSAGE_EVENT | M_TEXT_EVENT | M_HTML_EVENT;
/**
 * The namespaced value for m.emote
 */
export declare const M_EMOTE: UnstableValue<"m.emote", "org.matrix.msc1767.emote">;
/**
 * The event definition for an m.emote event (in content)
 */
export declare type M_EMOTE_EVENT = EitherAnd<{
    [M_EMOTE.name]?: {};
}, {
    [M_EMOTE.altName]?: {};
}>;
/**
 * The content for an m.emote event
 */
export declare type M_EMOTE_EVENT_CONTENT = M_MESSAGE_EVENT_CONTENT & M_EMOTE_EVENT;
/**
 * The namespaced value for m.notice
 */
export declare const M_NOTICE: UnstableValue<"m.notice", "org.matrix.msc1767.notice">;
/**
 * The event definition for an m.notice event (in content)
 */
export declare type M_NOTICE_EVENT = EitherAnd<{
    [M_NOTICE.name]?: {};
}, {
    [M_NOTICE.altName]?: {};
}>;
/**
 * The content for an m.notice event
 */
export declare type M_NOTICE_EVENT_CONTENT = M_MESSAGE_EVENT_CONTENT & M_NOTICE_EVENT;
