/*
Copyright 2020 The Matrix.org Foundation C.I.C.

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

import React, { JSXElementConstructor } from "react";

// Based on https://stackoverflow.com/a/53229857/3532235
export type Without<T, U> = {[P in Exclude<keyof T, keyof U>]?: never};
export type XOR<T, U> = (T | U) extends object ? (Without<T, U> & U) | (Without<U, T> & T) : T | U;
export type Writeable<T> = { -readonly [P in keyof T]: T[P] };

export type ComponentClass = keyof JSX.IntrinsicElements | JSXElementConstructor<any>;
export type ReactAnyComponent = React.Component | React.ExoticComponent;

// Based on https://stackoverflow.com/a/58436959
type Join<K, P> = K extends string | number ?
    P extends string | number ?
        `${K}${"" extends P ? "" : "."}${P}`
        : never : never;

type Prev = [never, 0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, ...0[]];

export type Leaves<T, D extends number = 5> = [D] extends [never] ? never : T extends object ?
    { [K in keyof T]-?: Join<K, Leaves<T[K], Prev[D]>> }[keyof T] : "";

export type RecursivePartial<T> = {
    [P in keyof T]?:
    T[P] extends (infer U)[] ? RecursivePartial<U>[] :
        T[P] extends object ? RecursivePartial<T[P]> :
            T[P];
};

// Inspired by https://stackoverflow.com/a/60206860
export type KeysWithObjectShape<Input> = {
    [P in keyof Input]: Input[P] extends object
        // Arrays are counted as objects - exclude them
        ? (Input[P] extends Array<unknown> ? never : P)
        : never;
}[keyof Input];
