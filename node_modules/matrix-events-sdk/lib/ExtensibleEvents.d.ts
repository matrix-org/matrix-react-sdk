import { IPartialEvent } from "./IPartialEvent";
import { ExtensibleEvent } from "./events/ExtensibleEvent";
import { Optional } from "./types";
import { NamespacedValue } from "./NamespacedValue";
export declare type EventInterpreter<TContentIn = object, TEvent extends ExtensibleEvent = ExtensibleEvent> = (wireEvent: IPartialEvent<TContentIn>) => Optional<TEvent>;
/**
 * Utility class for parsing and identifying event types in a renderable form. An
 * instance of this class can be created to change rendering preference depending
 * on use-case.
 */
export declare class ExtensibleEvents {
    private static _defaultInstance;
    private interpreters;
    private _unknownInterpretOrder;
    constructor();
    /**
     * Gets the default instance for all extensible event parsing.
     */
    static get defaultInstance(): ExtensibleEvents;
    /**
     * Gets the order the internal processor will use for unknown primary
     * event types.
     */
    get unknownInterpretOrder(): NamespacedValue<string, string>[];
    /**
     * Sets the order the internal processor will use for unknown primary
     * event types.
     * @param {NamespacedValue<string, string>[]} val The parsing order.
     */
    set unknownInterpretOrder(val: NamespacedValue<string, string>[]);
    /**
     * Gets the order the internal processor will use for unknown primary
     * event types.
     */
    static get unknownInterpretOrder(): NamespacedValue<string, string>[];
    /**
     * Sets the order the internal processor will use for unknown primary
     * event types.
     * @param {NamespacedValue<string, string>[]} val The parsing order.
     */
    static set unknownInterpretOrder(val: NamespacedValue<string, string>[]);
    /**
     * Registers a primary event type interpreter. Note that the interpreter might be
     * called with non-primary events if the event is being parsed as a fallback.
     * @param {NamespacedValue<string, string>} wireEventType The event type.
     * @param {EventInterpreter} interpreter The interpreter.
     */
    registerInterpreter(wireEventType: NamespacedValue<string, string>, interpreter: EventInterpreter): void;
    /**
     * Registers a primary event type interpreter. Note that the interpreter might be
     * called with non-primary events if the event is being parsed as a fallback.
     * @param {NamespacedValue<string, string>} wireEventType The event type.
     * @param {EventInterpreter} interpreter The interpreter.
     */
    static registerInterpreter(wireEventType: NamespacedValue<string, string>, interpreter: EventInterpreter): void;
    /**
     * Parses an event, trying the primary event type first. If the primary type is not known
     * then the content will be inspected to find the most suitable fallback.
     *
     * If the parsing failed or was a completely unknown type, this will return falsy.
     * @param {IPartialEvent<object>} wireFormat The event to parse.
     * @returns {Optional<ExtensibleEvent>} The parsed extensible event.
     */
    parse(wireFormat: IPartialEvent<object>): Optional<ExtensibleEvent>;
    /**
     * Parses an event, trying the primary event type first. If the primary type is not known
     * then the content will be inspected to find the most suitable fallback.
     *
     * If the parsing failed or was a completely unknown type, this will return falsy.
     * @param {IPartialEvent<object>} wireFormat The event to parse.
     * @returns {Optional<ExtensibleEvent>} The parsed extensible event.
     */
    static parse(wireFormat: IPartialEvent<object>): Optional<ExtensibleEvent>;
}
