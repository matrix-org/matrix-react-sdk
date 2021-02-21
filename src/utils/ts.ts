/*
 * Copyright 2021 The Matrix.org Foundation C.I.C.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *         http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

/**
 * A simple type to pull out the value types for a given type.
 * Source: https://flut1.medium.com/deep-flatten-typescript-types-with-finite-recursion-cb79233d93ca
 */
export type ValuesOf<T> = T[keyof T];

/**
 * Gets all non-object keys from a type. This will take arrays, numbers, strings, etc (everything but
 * objects) and return that as a type.
 * Source: https://flut1.medium.com/deep-flatten-typescript-types-with-finite-recursion-cb79233d93ca
 */
export type NonObjectKeysOf<T> = {
    [K in keyof T]: T[K] extends Array<any> ? K : T[K] extends object ? never : K;
}[keyof T];

/**
 * The inverse of NonObjectKeysOf<T> - this pulls out *only* the object types.
 * Source: https://flut1.medium.com/deep-flatten-typescript-types-with-finite-recursion-cb79233d93ca
 */
export type ObjectValuesOf<T extends Object> = Exclude<Exclude<Extract<ValuesOf<T>, object>, never>,Array<any>>;

/**
 * As the name implies, this converts a union (A | B) to an intersection (A & B).
 * Source: https://flut1.medium.com/deep-flatten-typescript-types-with-finite-recursion-cb79233d93ca
 * Source: https://stackoverflow.com/questions/50374908/transform-union-type-to-intersection-type/50375286#50375286
 */
export type UnionToIntersection<U> =
    (U extends any ? (k: U) => void : never) extends ((k: infer I) => void) ? I : never;

// These are setup for the DeepFlatten type below. It's not exactly pretty, but we get 9 levels of recursion
// out of this. As the article (source below) notes, this is not pretty and there might even be a better way
// to represent this with truly infinite recursion - in practice we probably don't need that level of generic
// support, leaving us with 9 levels for now.
//
// We should look at TS 4.1's Recursive Conditional Types to replace this mess:
// https://www.typescriptlang.org/docs/handbook/release-notes/typescript-4-1.html#recursive-conditional-types
//
// Source: https://flut1.medium.com/deep-flatten-typescript-types-with-finite-recursion-cb79233d93ca
type DFBase<T, Recursor> = Pick<T, NonObjectKeysOf<T>> & UnionToIntersection<Recursor>;
type DF2<T> = T extends any ? DFBase<T, DF3<ObjectValuesOf<T>>> : never;
type DF3<T> = T extends any ? DFBase<T, DF4<ObjectValuesOf<T>>> : never;
type DF4<T> = T extends any ? DFBase<T, DF5<ObjectValuesOf<T>>> : never;
type DF5<T> = T extends any ? DFBase<T, DF6<ObjectValuesOf<T>>> : never;
type DF6<T> = T extends any ? DFBase<T, DF7<ObjectValuesOf<T>>> : never;
type DF7<T> = T extends any ? DFBase<T, DF8<ObjectValuesOf<T>>> : never;
type DF8<T> = T extends any ? DFBase<T, DF9<ObjectValuesOf<T>>> : never;
type DF9<T> = T extends any ? DFBase<T, ObjectValuesOf<T>> : never;

/**
 * Recursively flattens a type to a top level object. Conflicting property names will have their types
 * intersected, though this should be avoided. Note that this does have an internal recursion limit:
 * use this with relatively shallow types.
 * Source: https://flut1.medium.com/deep-flatten-typescript-types-with-finite-recursion-cb79233d93ca
 */
export type DeepFlatten<T> = T extends any ? DFBase<T, DF2<ObjectValuesOf<T>>> : never;
