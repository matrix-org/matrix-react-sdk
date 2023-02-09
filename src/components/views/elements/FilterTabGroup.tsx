/*
Copyright 2023 The Matrix.org Foundation C.I.C.

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

import React, { FieldsetHTMLAttributes, ReactNode } from "react";

export type FilterTab<T> = {
    label: string | ReactNode;
    id: T;
};
type FilterTabGroupProps<T extends string = string> = FieldsetHTMLAttributes<any> & {
    // group name used for radio buttons
    name: string;
    onFilterChange: (id: T) => void;
    // active tab's id
    value: T;
    // tabs to display
    tabs: FilterTab<T>[];
};

/**
 * Styles a set of content filters as tabs
 * Accepts type T for the group's value property
 * (example in Poll History)
 */
export const FilterTabGroup = <T extends string = string>({
    name,
    value,
    tabs,
    onFilterChange,
    ...rest
}: FilterTabGroupProps<T>): JSX.Element => (
    <fieldset {...rest} className="mx_FilterTabGroup">
        {tabs.map(({ label, id }) => (
            <label data-testid={`filter-tab-${name}-${id}`} key={id}>
                <input type="radio" name={name} value={id} onChange={() => onFilterChange(id)} checked={value === id} />
                <span>{label}</span>
            </label>
        ))}
    </fieldset>
);
