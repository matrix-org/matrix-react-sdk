/*
Copyright 2021 The Matrix.org Foundation C.I.C.

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

import {
    arrayDiff,
    arrayFastClone,
    arrayFastResample,
    arrayHasDiff,
    arrayHasOrderChange,
    arrayMerge,
    arraySeed,
    arrayUnion,
    ArrayUtil,
    GroupedArray,
} from "../../src/utils/arrays";
import {objectFromEntries} from "../../src/utils/objects";

function expectSample(i: number, input: number[], expected: number[]) {
    console.log(`Resample case index: ${i}`); // for debugging test failures
    const result = arrayFastResample(input, expected.length);
    expect(result).toBeDefined();
    expect(result).toHaveLength(expected.length);
    expect(result).toEqual(expected);
}

describe('arrays', () => {
    describe('arrayFastResample', () => {
        it('should downsample', () => {
            [
                {input: [1, 2, 3, 4, 5], output: [1, 4]}, // Odd -> Even
                {input: [1, 2, 3, 4, 5], output: [1, 3, 5]}, // Odd -> Odd
                {input: [1, 2, 3, 4], output: [1, 2, 3]}, // Even -> Odd
                {input: [1, 2, 3, 4], output: [1, 3]}, // Even -> Even
            ].forEach((c, i) => expectSample(i, c.input, c.output));
        });

        it('should upsample', () => {
            [
                {input: [1, 2, 3], output: [1, 1, 2, 2, 3, 3]}, // Odd -> Even
                {input: [1, 2, 3], output: [1, 1, 2, 2, 3]}, // Odd -> Odd
                {input: [1, 2], output: [1, 1, 1, 2, 2]}, // Even -> Odd
                {input: [1, 2], output: [1, 1, 1, 2, 2, 2]}, // Even -> Even
            ].forEach((c, i) => expectSample(i, c.input, c.output));
        });

        it('should maintain sample', () => {
            [
                {input: [1, 2, 3], output: [1, 2, 3]}, // Odd
                {input: [1, 2], output: [1, 2]}, // Even
            ].forEach((c, i) => expectSample(i, c.input, c.output));
        });
    });

    describe('arraySeed', () => {
        it('should create an array of given length', () => {
            const val = 1;
            const output = [val, val, val];
            const result = arraySeed(val, output.length);
            expect(result).toBeDefined();
            expect(result).toHaveLength(output.length);
            expect(result).toEqual(output);
        });
        it('should maintain pointers', () => {
            const val = {}; // this works because `{} !== {}`, which is what toEqual checks
            const output = [val, val, val];
            const result = arraySeed(val, output.length);
            expect(result).toBeDefined();
            expect(result).toHaveLength(output.length);
            expect(result).toEqual(output);
        });
    });

    describe('arrayFastClone', () => {
        it('should break pointer reference on source array', () => {
            const val = {}; // we'll test to make sure the values maintain pointers too
            const input = [val, val, val];
            const result = arrayFastClone(input);
            expect(result).toBeDefined();
            expect(result).toHaveLength(input.length);
            expect(result).toEqual(input); // we want the array contents to match...
            expect(result).not.toBe(input); // ... but be a different reference
        });
    });

    describe('arrayHasOrderChange', () => {
        it('should flag true on B ordering difference', () => {
            const a = [1, 2, 3];
            const b = [3, 2, 1];
            const result = arrayHasOrderChange(a, b);
            expect(result).toBe(true);
        });

        it('should flag false on no ordering difference', () => {
            const a = [1, 2, 3];
            const b = [1, 2, 3];
            const result = arrayHasOrderChange(a, b);
            expect(result).toBe(false);
        });

        it('should flag true on A length > B length', () => {
            const a = [1, 2, 3, 4];
            const b = [1, 2, 3];
            const result = arrayHasOrderChange(a, b);
            expect(result).toBe(true);
        });

        it('should flag true on A length < B length', () => {
            const a = [1, 2, 3];
            const b = [1, 2, 3, 4];
            const result = arrayHasOrderChange(a, b);
            expect(result).toBe(true);
        });
    });

    describe('arrayHasDiff', () => {
        it('should flag true on A length > B length', () => {
            const a = [1, 2, 3, 4];
            const b = [1, 2, 3];
            const result = arrayHasDiff(a, b);
            expect(result).toBe(true);
        });

        it('should flag true on A length < B length', () => {
            const a = [1, 2, 3];
            const b = [1, 2, 3, 4];
            const result = arrayHasDiff(a, b);
            expect(result).toBe(true);
        });

        it('should flag true on element differences', () => {
            const a = [1, 2, 3];
            const b = [4, 5, 6];
            const result = arrayHasDiff(a, b);
            expect(result).toBe(true);
        });

        it('should flag false if same but order different', () => {
            const a = [1, 2, 3];
            const b = [3, 1, 2];
            const result = arrayHasDiff(a, b);
            expect(result).toBe(false);
        });

        it('should flag false if same', () => {
            const a = [1, 2, 3];
            const b = [1, 2, 3];
            const result = arrayHasDiff(a, b);
            expect(result).toBe(false);
        });
    });

    describe('arrayDiff', () => {
        it('should see added from A->B', () => {
            const a = [1, 2, 3];
            const b = [1, 2, 3, 4];
            const result = arrayDiff(a, b);
            expect(result).toBeDefined();
            expect(result.added).toBeDefined();
            expect(result.removed).toBeDefined();
            expect(result.added).toHaveLength(1);
            expect(result.removed).toHaveLength(0);
            expect(result.added).toEqual([4]);
        });

        it('should see removed from A->B', () => {
            const a = [1, 2, 3];
            const b = [1, 2];
            const result = arrayDiff(a, b);
            expect(result).toBeDefined();
            expect(result.added).toBeDefined();
            expect(result.removed).toBeDefined();
            expect(result.added).toHaveLength(0);
            expect(result.removed).toHaveLength(1);
            expect(result.removed).toEqual([3]);
        });

        it('should see added and removed in the same set', () => {
            const a = [1, 2, 3];
            const b = [1, 2, 4]; // note diff
            const result = arrayDiff(a, b);
            expect(result).toBeDefined();
            expect(result.added).toBeDefined();
            expect(result.removed).toBeDefined();
            expect(result.added).toHaveLength(1);
            expect(result.removed).toHaveLength(1);
            expect(result.added).toEqual([4]);
            expect(result.removed).toEqual([3]);
        });
    });

    describe('arrayUnion', () => {
        it('should return a union', () => {
            const a = [1, 2, 3];
            const b = [1, 2, 4]; // note diff
            const result = arrayUnion(a, b);
            expect(result).toBeDefined();
            expect(result).toHaveLength(2);
            expect(result).toEqual([1, 2]);
        });

        it('should return an empty array on no matches', () => {
            const a = [1, 2, 3];
            const b = [4, 5, 6];
            const result = arrayUnion(a, b);
            expect(result).toBeDefined();
            expect(result).toHaveLength(0);
        });
    });

    describe('arrayMerge', () => {
        it('should merge 3 arrays with deduplication', () => {
            const a = [1, 2, 3];
            const b = [1, 2, 4, 5]; // note missing 3
            const c = [6, 7, 8, 9];
            const result = arrayMerge(a, b, c);
            expect(result).toBeDefined();
            expect(result).toHaveLength(9);
            expect(result).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9]);
        });

        it('should deduplicate a single array', () => {
            // dev note: this is technically an edge case, but it is described behaviour if the
            // function is only provided one function (it'll merge the array against itself)
            const a = [1, 1, 2, 2, 3, 3];
            const result = arrayMerge(a);
            expect(result).toBeDefined();
            expect(result).toHaveLength(3);
            expect(result).toEqual([1, 2, 3]);
        });
    });

    describe('ArrayUtil', () => {
        it('should maintain the pointer to the given array', () => {
            const input = [1, 2, 3];
            const result = new ArrayUtil(input);
            expect(result.value).toBe(input);
        });

        it('should group appropriately', () => {
            const input = [['a', 1], ['b', 2], ['c', 3], ['a', 4], ['a', 5], ['b', 6]];
            const output = {
                'a': [['a', 1], ['a', 4], ['a', 5]],
                'b': [['b', 2], ['b', 6]],
                'c': [['c', 3]],
            };
            const result = new ArrayUtil(input).groupBy(p => p[0]);
            expect(result).toBeDefined();
            expect(result.value).toBeDefined();

            const asObject = objectFromEntries(result.value.entries());
            expect(asObject).toMatchObject(output);
        });
    });

    describe('GroupedArray', () => {
        it('should maintain the pointer to the given map', () => {
            const input = new Map([
                ['a', [1, 2, 3]],
                ['b', [7, 8, 9]],
                ['c', [4, 5, 6]],
            ]);
            const result = new GroupedArray(input);
            expect(result.value).toBe(input);
        });

        it('should ordering by the provided key order', () => {
            const input = new Map([
                ['a', [1, 2, 3]],
                ['b', [7, 8, 9]], // note counting diff
                ['c', [4, 5, 6]],
            ]);
            const output = [4, 5, 6, 1, 2, 3, 7, 8, 9];
            const keyOrder = ['c', 'a', 'b']; // note weird order to cause the `output` to be strange
            const result = new GroupedArray(input).orderBy(keyOrder);
            expect(result).toBeDefined();
            expect(result.value).toBeDefined();
            expect(result.value).toEqual(output);
        });
    });
});

