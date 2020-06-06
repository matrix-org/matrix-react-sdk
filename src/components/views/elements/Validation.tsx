/*
Copyright 2019 New Vector Ltd
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

/* eslint-disable babel/no-invalid-this */
import React from "react";
import classNames from "classnames";

type Data = Pick<IFieldState, "value" | "allowEmpty">;

interface IRule<T> {
    key: string;
    final?: boolean;
    skip?(this: T, data: Data): boolean;
    test(this: T, data: Data): boolean | Promise<boolean>;
    valid?(this: T): string;
    invalid?(this: T): string;
}

interface IArgs<T> {
    rules: IRule<T>[];
    description(this: T): React.ReactChild;
}

export interface IFieldState {
    value: string;
    focused: boolean;
    allowEmpty: boolean;
}

export interface IValidationResult {
    valid?: boolean;
    feedback?: React.ReactChild;
}

/**
 * Creates a validation function from a set of rules describing what to validate.
 * Generic T is the "this" type passed to the rule methods
 *
 * @param {Function} description
 *     Function that returns a string summary of the kind of value that will
 *     meet the validation rules. Shown at the top of the validation feedback.
 * @param {Object} rules
 *     An array of rules describing how to check to input value. Each rule in an object
 *     and may have the following properties:
 *     - `key`: A unique ID for the rule. Required.
 *     - `skip`: A function used to determine whether the rule should even be evaluated.
 *     - `test`: A function used to determine the rule's current validity. Required.
 *     - `valid`: Function returning text to show when the rule is valid. Only shown if set.
 *     - `invalid`: Function returning text to show when the rule is invalid. Only shown if set.
 *     - `final`: A Boolean if true states that this rule will only be considered if all rules before it returned valid.
 * @returns {Function}
 *     A validation function that takes in the current input value and returns
 *     the overall validity and a feedback UI that can be rendered for more detail.
 */
export default function withValidation<T = undefined>({ description, rules }: IArgs<T>) {
    return async function onValidate({ value, focused, allowEmpty = true }: IFieldState): Promise<IValidationResult> {
        if (!value && allowEmpty) {
            return {
                valid: null,
                feedback: null,
            };
        }

        const results = [];
        let valid = true;
        if (rules && rules.length) {
            for (const rule of rules) {
                if (!rule.key || !rule.test) {
                    continue;
                }

                if (!valid && rule.final) {
                    continue;
                }

                const data = { value, allowEmpty };

                if (rule.skip && rule.skip.call(this, data)) {
                    continue;
                }

                // We're setting `this` to whichever component holds the validation
                // function. That allows rules to access the state of the component.
                const ruleValid = await rule.test.call(this, data);
                valid = valid && ruleValid;
                if (ruleValid && rule.valid) {
                    // If the rule's result is valid and has text to show for
                    // the valid state, show it.
                    const text = rule.valid.call(this);
                    if (!text) {
                        continue;
                    }
                    results.push({
                        key: rule.key,
                        valid: true,
                        text,
                    });
                } else if (!ruleValid && rule.invalid) {
                    // If the rule's result is invalid and has text to show for
                    // the invalid state, show it.
                    const text = rule.invalid.call(this);
                    if (!text) {
                        continue;
                    }
                    results.push({
                        key: rule.key,
                        valid: false,
                        text,
                    });
                }
            }
        }

        // Hide feedback when not focused
        if (!focused) {
            return {
                valid,
                feedback: null,
            };
        }

        let details;
        if (results && results.length) {
            details = <ul className="mx_Validation_details">
                {results.map(result => {
                    const classes = classNames({
                        "mx_Validation_detail": true,
                        "mx_Validation_valid": result.valid,
                        "mx_Validation_invalid": !result.valid,
                    });
                    return <li key={result.key} className={classes}>
                        {result.text}
                    </li>;
                })}
            </ul>;
        }

        let summary;
        if (description) {
            // We're setting `this` to whichever component holds the validation
            // function. That allows rules to access the state of the component.
            const content = description.call(this);
            summary = <div className="mx_Validation_description">{content}</div>;
        }

        let feedback;
        if (summary || details) {
            feedback = <div className="mx_Validation">
                {summary}
                {details}
            </div>;
        }

        return {
            valid,
            feedback,
        };
    };
}
