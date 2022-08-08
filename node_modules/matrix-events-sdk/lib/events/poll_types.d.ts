import { UnstableValue } from "../NamespacedValue";
import { EitherAnd, TSNamespace } from "../types";
import { M_MESSAGE_EVENT_CONTENT } from "./message_types";
import { REFERENCE_RELATION, RELATES_TO_RELATIONSHIP } from "./relationship_types";
/**
 * Identifier for a disclosed poll.
 */
export declare const M_POLL_KIND_DISCLOSED: UnstableValue<"m.poll.disclosed", "org.matrix.msc3381.poll.disclosed">;
/**
 * Identifier for an undisclosed poll.
 */
export declare const M_POLL_KIND_UNDISCLOSED: UnstableValue<"m.poll.undisclosed", "org.matrix.msc3381.poll.undisclosed">;
/**
 * Any poll kind.
 */
export declare type POLL_KIND = TSNamespace<typeof M_POLL_KIND_DISCLOSED> | TSNamespace<typeof M_POLL_KIND_UNDISCLOSED> | string;
/**
 * Known poll kind namespaces.
 */
export declare type KNOWN_POLL_KIND = (typeof M_POLL_KIND_DISCLOSED) | (typeof M_POLL_KIND_UNDISCLOSED);
/**
 * The namespaced value for m.poll.start
 */
export declare const M_POLL_START: UnstableValue<"m.poll.start", "org.matrix.msc3381.poll.start">;
/**
 * The m.poll.start type within event content
 */
export declare type M_POLL_START_SUBTYPE = {
    question: M_MESSAGE_EVENT_CONTENT;
    kind: POLL_KIND;
    max_selections?: number;
    answers: POLL_ANSWER[];
};
/**
 * A poll answer.
 */
export declare type POLL_ANSWER = M_MESSAGE_EVENT_CONTENT & {
    id: string;
};
/**
 * The event definition for an m.poll.start event (in content)
 */
export declare type M_POLL_START_EVENT = EitherAnd<{
    [M_POLL_START.name]: M_POLL_START_SUBTYPE;
}, {
    [M_POLL_START.altName]: M_POLL_START_SUBTYPE;
}>;
/**
 * The content for an m.poll.start event
 */
export declare type M_POLL_START_EVENT_CONTENT = M_POLL_START_EVENT & M_MESSAGE_EVENT_CONTENT;
/**
 * The namespaced value for m.poll.response
 */
export declare const M_POLL_RESPONSE: UnstableValue<"m.poll.response", "org.matrix.msc3381.poll.response">;
/**
 * The m.poll.response type within event content
 */
export declare type M_POLL_RESPONSE_SUBTYPE = {
    answers: string[];
};
/**
 * The event definition for an m.poll.response event (in content)
 */
export declare type M_POLL_RESPONSE_EVENT = EitherAnd<{
    [M_POLL_RESPONSE.name]: M_POLL_RESPONSE_SUBTYPE;
}, {
    [M_POLL_RESPONSE.altName]: M_POLL_RESPONSE_SUBTYPE;
}>;
/**
 * The content for an m.poll.response event
 */
export declare type M_POLL_RESPONSE_EVENT_CONTENT = M_POLL_RESPONSE_EVENT & RELATES_TO_RELATIONSHIP<typeof REFERENCE_RELATION>;
/**
 * The namespaced value for m.poll.end
 */
export declare const M_POLL_END: UnstableValue<"m.poll.end", "org.matrix.msc3381.poll.end">;
/**
 * The event definition for an m.poll.end event (in content)
 */
export declare type M_POLL_END_EVENT = EitherAnd<{
    [M_POLL_END.name]: {};
}, {
    [M_POLL_END.altName]: {};
}>;
/**
 * The content for an m.poll.end event
 */
export declare type M_POLL_END_EVENT_CONTENT = M_POLL_END_EVENT & RELATES_TO_RELATIONSHIP<typeof REFERENCE_RELATION> & M_MESSAGE_EVENT_CONTENT;
