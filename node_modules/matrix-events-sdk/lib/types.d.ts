import { NamespacedValue } from "./NamespacedValue";
/**
 * Represents an optional type: can either be T or a falsy value.
 */
export declare type Optional<T> = T | null | undefined;
/**
 * Determines if the given optional string is a defined string.
 * @param {Optional<string>} s The input string.
 * @returns {boolean} True if the input is a defined string.
 */
export declare function isOptionalAString(s: Optional<string>): boolean;
/**
 * Determines if the given optional was provided a value.
 * @param {Optional<T>} s The optional to test.
 * @returns {boolean} True if the value is defined.
 */
export declare function isProvided<T>(s: Optional<T>): boolean;
/**
 * Represents either just T1, just T2, or T1 and T2 mixed.
 */
export declare type EitherAnd<T1, T2> = (T1 & T2) | T1 | T2;
/**
 * Represents the stable and unstable values of a given namespace.
 */
export declare type TSNamespace<N> = N extends NamespacedValue<infer S, infer U> ? (TSNamespaceValue<S> | TSNamespaceValue<U>) : never;
/**
 * Represents a namespaced value, if the value is a string. Used to extract provided types
 * from a TSNamespace<N> (in cases where only stable *or* unstable is provided).
 */
export declare type TSNamespaceValue<V> = V extends string ? V : never;
/**
 * Creates a type which is V when T is `never`, otherwise T.
 */
export declare type DefaultNever<T, V> = [T] extends [never] ? V : T;
