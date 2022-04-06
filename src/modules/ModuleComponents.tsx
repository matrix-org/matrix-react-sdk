/*
Copyright 2022 The Matrix.org Foundation C.I.C.

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

// TODO: @@ Is this future-proof enough? Will we remember to do this for new components?
import { TextInputField } from "@matrix-org/react-sdk-module-api/lib/components/TextInputField";
import { Spinner as ModuleSpinner } from "@matrix-org/react-sdk-module-api/lib/components/Spinner";
import React from "react";
import Field from "../components/views/elements/Field";
import Spinner from "../components/views/elements/Spinner";

TextInputField.renderFactory = (props) => (
    <Field
        type="text"
        value={props.value}
        onChange={e => props.onChange(e.target.value)}
        label={props.label}
        autoComplete="off"
    />
);
ModuleSpinner.renderFactory = () => <Spinner />;
