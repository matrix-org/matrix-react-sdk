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

import React, { PureComponent, RefCallback, RefObject } from "react";
import { replaceableComponent } from "../../../utils/replaceableComponent";
import Field, { IInputProps } from "../elements/Field";
import { _t, _td } from "../../../languageHandler";

interface IProps extends Omit<IInputProps, "onValidate"> {
    id?: string;
    fieldRef?: RefCallback<Field> | RefObject<Field>;
    autoComplete?: string;
    value: string;
    password: string; // The password we're confirming

    onChange(ev: React.FormEvent<HTMLElement>);
}

@replaceableComponent("views.auth.EmailField")
class PassphraseConfirmField extends PureComponent<IProps> {
    static defaultProps = {
        label: _td("Confirm password"),
    };

    render() {
        return <Field
            id={this.props.id}
            ref={this.props.fieldRef}
            type="password"
            label={_t(this.props.label)}
            autoComplete={this.props.autoComplete}
            value={this.props.value}
            onChange={this.props.onChange}
        />;
    }
}

export default PassphraseConfirmField;
