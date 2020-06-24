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

import React from 'react';
import StyledRadioButton from "./StyledRadioButton";

interface IRadioGroupDefinition<T extends string> {
    value: T;
    label: string; // translated
    microCopy?: string; // translated
    disabled?: boolean;
}

interface IStyledRadioGroupProps<T extends string> {
    name: string;
    definitions: IRadioGroupDefinition<T>[];
    value: T;
    onChange(newValue: T): void;
}

// TODO allow disabling microCopy
function StyledRadioGroup<T extends string>({name, definitions, value, onChange}: IStyledRadioGroupProps<T>) {
    const _onChange = e => {
        onChange(e.target.value);
    };

    return <React.Fragment>
        {definitions.map(d => <React.Fragment>
            <StyledRadioButton
                key={d.value}
                onChange={_onChange}
                checked={d.value === value}
                name={name}
                value={d.value}
            >
                {d.label}
            </StyledRadioButton>
            {d.microCopy && <div className="mx_Checkbox_microCopy">
                {d.microCopy}
            </div>}
        </React.Fragment>)}
    </React.Fragment>;
}

export default StyledRadioGroup;
