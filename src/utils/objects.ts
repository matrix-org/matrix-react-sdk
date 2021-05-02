/*
Copyright 2020, 2021 The Matrix.org Foundation C.I.C.

Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

    http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.
*/

import { arrayDiff, arrayMerge, arrayUnion } from "./arrays";

type ObjectExcluding<O extends {}, P extends (keyof O)[]> = {[k in Exclude<keyof O, P[number]>]: O[k]};

/**
 * Gets a new object which represents the provided object, excluding some properties.
 * @param a The object to strip properties of. Must be defined.
 * @param props The property names to remove.
 * @returns The new object without the provided properties.
 */
export function objectExcluding<O extends {}, P extends Array<keyof O>>(a: O, props: P): ObjectExcluding<O, P> {
    // We use a Map to avoid hammering the `delete` keyword, which is slow and painful.
    const tempMap = new Map<keyof O, any>(Object.entries(a) as [keyof O, any][]);
    for (const prop of props) {
        tempMap.delete(prop);
    }

    // Convert the map to an object again
    return Array.from(tempMap.entries()).reduce((c, [k, v]) => {
        c[k] = v;
        return c;
    }, {} as O);
}

/**
 * Gets a new object which represents the provided object, with only some properties
 * included.
 * @param a The object to clone properties of. Must be defined.
 * @param props The property names to keep.
 * @returns The new object with only the provided properties.
 */
export function objectWithOnly<O extends {}, P extends Array<keyof O>>(a: O, props: P): {[k in P[number]]: O[k]} {
    const existingProps = Object.keys(a) as (keyof O)[];
    const diff = arrayDiff(existingProps, props);
    if (diff.removed.length === 0) {
        return objectShallowClone(a);
    } else {
        return objectExcluding(a, diff.removed) as {[k in P[number]]: O[k]};
    }
}

/**
 * Clones an object to a caller-controlled depth. When a propertyCloner is supplied, the
 * object's properties will be passed through it with the return value used as the new
 * object's type. This is intended to be used to deep clone a reference, but without
 * having to deep clone the entire object. This function is safe to call recursively within
 * the propertyCloner.
 * @param a The object to clone. Must be defined.
 * @param propertyCloner The function to clone the properties of the object with, optionally.
 * First argument is the property key with the second being the current value.
 * @returns A cloned object.
 */
export function objectShallowClone<O extends {}>(a: O, propertyCloner?: (k: keyof O, v: O[keyof O]) => any): O {
    const newObj = {} as O;
    for (const [k, v] of Object.entries(a) as [keyof O, O[keyof O]][]) {
        newObj[k] = v;
        if (propertyCloner) {
            newObj[k] = propertyCloner(k, v);
        }
    }
    return newObj;
}

/**
 * Determines if any keys were added, removed, or changed between two objects.
 * For changes, simple triple equal comparisons are done, not in-depth
 * tree checking.
 * @param a The first object. Must be defined.
 * @param b The second object. Must be defined.
 * @returns True if there's a difference between the objects, false otherwise
 */
export function objectHasDiff<O extends {}>(a: O, b: O): boolean {
    if (a === b) return false;
    const aKeys = Object.keys(a);
    const bKeys = Object.keys(b);
    if (aKeys.length !== bKeys.length) return true;
    const possibleChanges = arrayUnion(aKeys, bKeys);
    // if the amalgamation of both sets of keys has the a different length to the inputs then there must be a change
    if (possibleChanges.length !== aKeys.length) return true;

    return possibleChanges.some(k => a[k] !== b[k]);
}

type Diff<K> = { changed: K[], added: K[], removed: K[] };

/**
 * Determines the keys added, changed, and removed between two objects.
 * For changes, simple triple equal comparisons are done, not in-depth
 * tree checking.
 * @param a The first object. Must be defined.
 * @param b The second object. Must be defined.
 * @returns The difference between the keys of each object.
 */
export function objectDiff<O extends {}>(a: O, b: O): Diff<keyof O> {
    const aKeys = Object.keys(a) as (keyof O)[];
    const bKeys = Object.keys(b) as (keyof O)[];
    const keyDiff = arrayDiff(aKeys, bKeys);
    const possibleChanges = arrayUnion(aKeys, bKeys);
    const changes = possibleChanges.filter(k => a[k] !== b[k]);

    return {changed: changes, added: keyDiff.added, removed: keyDiff.removed};
}

/**
 * Gets all the key changes (added, removed, or value difference) between
 * two objects. Triple equals is used to compare values, not in-depth tree
 * checking.
 * @param a The first object. Must be defined.
 * @param b The second object. Must be defined.
 * @returns The keys which have been added, removed, or changed between the
 * two objects.
 */
export function objectKeyChanges<O extends {}>(a: O, b: O): (keyof O)[] {
    const diff = objectDiff(a, b);
    return arrayMerge(diff.removed, diff.added, diff.changed);
}

/**
 * Clones an object by running it through JSON parsing. Note that this
 * will destroy any complicated object types which do not translate to
 * JSON.
 * @param obj The object to clone.
 * @returns The cloned object
 */
export function objectClone<O extends {}>(obj: O): O {
    return JSON.parse(JSON.stringify(obj));
}

/**
 * Converts a series of entries to an object.
 * @param entries The entries to convert.
 * @returns The converted object.
 */
// NOTE: Deprecated once we have Object.fromEntries() support.
// @ts-ignore - return type is complaining about non-string keys, but we know better
export function objectFromEntries<K, V>(entries: Iterable<[K, V]>): {[k: K]: V} {
    const obj: {
        // @ts-ignore - same as return type
        [k: K]: V} = {};
    for (const e of entries) {
        // @ts-ignore - same as return type
        obj[e[0]] = e[1];
    }
    return obj;
}
