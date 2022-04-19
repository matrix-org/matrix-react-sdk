/*
Copyright 2022 Boluwatife Omosowon <boluomosowon@gmail.com>

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

import { IFieldState, IValidationResult } from "./Validation";

export interface IInputValidationProps {
    // The callback called whenever the contents of the field
    // changes.  Returns an object with `valid` boolean field
    // and a `feedback` react component field to provide feedback
    // to the user.
    onValidate?: (input: IFieldState) => Promise<IValidationResult>;
    // If specified, overrides the value returned by onValidate.
    forceValidity?: boolean;
    // On what events should validation occur; by default on all
    validateOnFocus?: boolean;
    validateOnBlur?: boolean;
    validateOnChange?: boolean;
}
