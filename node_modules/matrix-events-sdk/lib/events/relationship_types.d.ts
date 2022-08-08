import { NamespacedValue } from "../NamespacedValue";
import { DefaultNever, TSNamespace } from "../types";
/**
 * The namespaced value for an m.reference relation
 */
export declare const REFERENCE_RELATION: NamespacedValue<"m.reference", string>;
/**
 * Represents any relation type
 */
export declare type ANY_RELATION = TSNamespace<typeof REFERENCE_RELATION> | string;
/**
 * An m.relates_to relationship
 */
export declare type RELATES_TO_RELATIONSHIP<R = never, C = never> = {
    "m.relates_to": {
        rel_type: [R] extends [never] ? ANY_RELATION : TSNamespace<R>;
        event_id: string;
    } & DefaultNever<C, {}>;
};
