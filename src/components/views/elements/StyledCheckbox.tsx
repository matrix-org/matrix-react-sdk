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

import React from "react";
import { randomString } from "matrix-js-sdk/src/randomstring";
import classnames from 'classnames';

export enum CheckboxStyle {
    Solid = "solid",
    Outline = "outline",
    Circle = "circle", // for polls, uses radio button styling
}

interface IProps extends React.InputHTMLAttributes<HTMLInputElement> {
    inputRef?: React.RefObject<HTMLInputElement>;
    kind?: CheckboxStyle;
    id?: string;
}

interface IState {
}

export default class StyledCheckbox extends React.PureComponent<IProps, IState> {
    private id: string;

    public static readonly defaultProps = {
        className: "",
    };

    constructor(props: IProps) {
        super(props);
        // 56^10 so unlikely chance of collision.
        this.id = this.props.id || "checkbox_" + randomString(10);
    }

    public render() {
        /* eslint @typescript-eslint/no-unused-vars: ["error", { "ignoreRestSiblings": true }] */
        const { children, className, kind = CheckboxStyle.Solid, inputRef, ...otherProps } = this.props;

        const additionalClasses = kind === "circle"
            ? {
                "mx_StyledRadioButton": true,
                "mx_StyledRadioButton_disabled": this.props.disabled,
                "mx_StyledRadioButton_enabled": !this.props.disabled,
                "mx_StyledRadioButton_checked": this.props.checked,
            }
            : {
                "mx_Checkbox": true,
                "mx_Checkbox_hasKind": kind,
                [`mx_Checkbox_kind_${kind}`]: kind,
            };

        const newClassName = classnames(
            className,
            additionalClasses,
        );

        const checkbox = <React.Fragment>
            <input
                // Pass through the ref - used for keyboard shortcut access to some buttons
                ref={inputRef}
                id={this.id}
                {...otherProps}
                type="checkbox"
            />
        </React.Fragment>;

        if (kind === "circle") {
            return <label className={newClassName}>
                { checkbox }
                { /* Used to render the radio button circle */ }
                <div><div /></div>
                <div className="mx_StyledRadioButton_content">{ children }</div>
                <div className="mx_StyledRadioButton_spacer" />
            </label>;
        } else {
            return <span className={newClassName}>
                { checkbox }
                <label htmlFor={this.id}>
                    { /* Using the div to center the image */ }
                    <div className="mx_Checkbox_background">
                        <div className="mx_Checkbox_checkmark" />
                    </div>
                    { !!this.props.children &&
                    <div>
                        { this.props.children }
                    </div>
                    }
                </label>
            </span>;
        }
    }
}
