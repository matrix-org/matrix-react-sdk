/*
Copyright 2019 The Matrix.org Foundation C.I.C.

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

import { Dispatch, SetStateAction, useState } from "react";

// Hook to simplify toggling of a boolean state value
// Returns value, method to toggle boolean value and method to set the boolean value
export const useStateToggle = (initialValue = false): [boolean, () => void, Dispatch<SetStateAction<boolean>>] => {
    const [value, setValue] = useState(initialValue);
    const toggleValue = (): void => {
        setValue(!value);
    };
    return [value, toggleValue, setValue];
};
