import { NamespacedValue } from "./NamespacedValue";
import { Optional } from "./types";
declare type NS = NamespacedValue<Optional<string>, Optional<string>>;
/**
 * A `Map` implementation which accepts a NamespacedValue as a key, and arbitrary value. The
 * namespaced value must be a string type.
 */
export declare class NamespacedMap<V> {
    protected internalMap: Map<string, V>;
    /**
     * Creates a new map with optional seed data.
     * @param {Array<[NS, V]>} initial The seed data.
     */
    constructor(initial?: [NS, V][]);
    /**
     * Gets a value from the map. If the value does not exist under
     * either namespace option, falsy is returned.
     * @param {NS} key The key.
     * @returns {Optional<V>} The value, or falsy.
     */
    get(key: NS): Optional<V>;
    /**
     * Sets a value in the map.
     * @param {NS} key The key.
     * @param {V} val The value.
     */
    set(key: NS, val: V): void;
    /**
     * Determines if any of the valid namespaced values are present
     * in the map.
     * @param {NS} key The key.
     * @returns {boolean} True if present.
     */
    has(key: NS): boolean;
    /**
     * Removes all the namespaced values from the map.
     * @param {NS} key The key.
     */
    delete(key: NS): void;
    /**
     * Determines if the map contains a specific namespaced value
     * instead of the parent NS type.
     * @param {string} key The key.
     * @returns {boolean} True if present.
     */
    hasNamespaced(key: string): boolean;
    /**
     * Gets a specific namespaced value from the map instead of the
     * parent NS type. Returns falsy if not found.
     * @param {string} key The key.
     * @returns {Optional<V>} The value, or falsy.
     */
    getNamespaced(key: string): Optional<V>;
}
export {};
