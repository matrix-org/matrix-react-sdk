import { NamespacedValue } from "../NamespacedValue";
/**
 * Represents a potentially namespaced event type.
 */
export declare type EventType = NamespacedValue<string, string> | string;
/**
 * Determines if two event types are the same, including namespaces.
 * @param {EventType} given The given event type. This will be compared
 * against the expected type.
 * @param {EventType} expected The expected event type.
 * @returns {boolean} True if the given type matches the expected type.
 */
export declare function isEventTypeSame(given: EventType, expected: EventType): boolean;
