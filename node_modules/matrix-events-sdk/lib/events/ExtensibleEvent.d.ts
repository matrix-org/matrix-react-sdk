import { IPartialEvent } from "../IPartialEvent";
import { EventType } from "../utility/events";
/**
 * Represents an Extensible Event in Matrix.
 */
export declare abstract class ExtensibleEvent<TContent extends object = object> {
    readonly wireFormat: IPartialEvent<TContent>;
    protected constructor(wireFormat: IPartialEvent<TContent>);
    /**
     * Shortcut to wireFormat.content
     */
    get wireContent(): TContent;
    /**
     * Serializes the event into a format which can be used to send the
     * event to the room.
     * @returns {IPartialEvent<object>} The serialized event.
     */
    abstract serialize(): IPartialEvent<object>;
    /**
     * Determines if this event is equivalent to the provided event type.
     * This is recommended over `instanceof` checks due to issues in the JS
     * runtime (and layering of dependencies in some projects).
     *
     * Implementations should pass this check off to their super classes
     * if their own checks fail. Some primary implementations do not extend
     * fallback classes given they support the primary type first. Thus,
     * those classes may return false if asked about their fallback
     * representation.
     *
     * Note that this only checks primary event types: legacy events, like
     * m.room.message, should/will fail this check.
     * @param {EventType} primaryEventType The (potentially namespaced) event
     * type.
     * @returns {boolean} True if this event *could* be represented as the
     * given type.
     */
    abstract isEquivalentTo(primaryEventType: EventType): boolean;
}
