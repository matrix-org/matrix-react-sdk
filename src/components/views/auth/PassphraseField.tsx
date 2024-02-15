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

import React, { PureComponent, RefCallback, RefObject } from "react";
import classNames from "classnames";

import type { ZxcvbnResult } from "@zxcvbn-ts/core";
import SdkConfig from "../../../SdkConfig";
import withValidation, { IFieldState, IValidationResult } from "../elements/Validation";
import { _t, _td, TranslationKey } from "../../../languageHandler";
import Field, { IInputProps } from "../elements/Field";
import { MatrixClientPeg } from "../../../MatrixClientPeg";

interface IProps extends Omit<IInputProps, "onValidate" | "element"> {
    autoFocus?: boolean;
    id?: string;
    className?: string;
    minScore: 0 | 1 | 2 | 3 | 4;
    value: string;
    fieldRef?: RefCallback<Field> | RefObject<Field>;
    // Additional strings such as a username used to catch bad passwords
    userInputs?: string[];

    label: TranslationKey;
    labelEnterPassword: TranslationKey;
    labelStrongPassword: TranslationKey;
    labelAllowedButUnsafe: TranslationKey;

    onChange(ev: React.FormEvent<HTMLElement>): void;
    onValidate?(result: IValidationResult): void;
}

class PassphraseField extends PureComponent<IProps> {
    public static defaultProps = {
        label: _td("common|password"),
        labelEnterPassword: _td("auth|password_field_label"),
        labelStrongPassword: _td("auth|password_field_strong_label"),
        labelAllowedButUnsafe: _td("auth|password_field_weak_label"),
    };

    public readonly validate = withValidation<this, ZxcvbnResult | null>({
        description: function (complexity) {
            const score = complexity ? complexity.score : 0;
            return <progress className="mx_PassphraseField_progress" max={4} value={score} />;
        },
        deriveData: async ({ value }): Promise<ZxcvbnResult | null> => {
            if (!value) return null;
            const { scorePassword } = await import("../../../utils/PasswordScorer");
            return scorePassword(MatrixClientPeg.get(), value, this.props.userInputs);
        },
        rules: [
            {
                key: "required",
                test: ({ value, allowEmpty }) => allowEmpty || !!value,
                invalid: () => _t(this.props.labelEnterPassword),
            },
            {
                key: "complexity",
                test: async function ({ value }, complexity): Promise<boolean> {
                    if (!value || !complexity) {
                        return false;
                    }
                    const safe = complexity.score >= this.props.minScore;
                    const allowUnsafe = SdkConfig.get("dangerously_allow_unsafe_and_insecure_passwords");
                    return allowUnsafe || safe;
                },
                valid: function (complexity) {
                    // Unsafe passwords that are valid are only possible through a
                    // configuration flag. We'll print some helper text to signal
                    // to the user that their password is allowed, but unsafe.
                    if (complexity && complexity.score >= this.props.minScore) {
                        return _t(this.props.labelStrongPassword);
                    }
                    return _t(this.props.labelAllowedButUnsafe);
                },
                invalid: function (complexity) {
                    if (!complexity) {
                        return null;
                    }
                    const { feedback } = complexity;
                    return feedback.warning || feedback.suggestions[0] || _t("auth|password_field_keep_going_prompt");
                },
            },
        ],
        memoize: true,
    });

    public onValidate = async (fieldState: IFieldState): Promise<IValidationResult> => {
        const result = await this.validate(fieldState);
        if (this.props.onValidate) {
            this.props.onValidate(result);
        }
        return result;
    };

    public render(): React.ReactNode {
        return (
            <Field
                id={this.props.id}
                autoFocus={this.props.autoFocus}
                className={classNames("mx_PassphraseField", this.props.className)}
                ref={this.props.fieldRef}
                type="password"
                autoComplete="new-password"
                label={_t(this.props.label)}
                value={this.props.value}
                onChange={this.props.onChange}
                onValidate={this.onValidate}
            />
        );
    }
}

export default PassphraseField;
