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

/* This component is mostly copied from StyledRadioButton.tsx to match it's appearance in polls */

import React from "react";
import classnames from 'classnames';

interface IProps extends React.InputHTMLAttributes<HTMLInputElement> {
    inputRef?: React.RefObject<HTMLInputElement>;
    outlined?: boolean;
}

interface IState {
}

export default class StyledPollCheckbox extends React.PureComponent<IProps, IState> {
    public static readonly defaultProps = {
        className: '',
    };

    public render() {
        const { children, className, disabled, outlined, inputRef, ...otherProps } = this.props;
        const _className = classnames(
            'mx_StyledPollCheckbox',
            className,
            {
                "mx_StyledPollCheckbox_disabled": disabled,
                "mx_StyledPollCheckbox_enabled": !disabled,
                "mx_StyledPollCheckbox_checked": this.props.checked,
                "mx_StyledPollCheckbox_outlined": outlined,
            });

        const checkbox = <React.Fragment>
            <input
                // Pass through the ref - used for keyboard shortcut access to some buttons
                ref={inputRef}
                type='checkbox'
                disabled={disabled}
                {...otherProps}
            />
            { /* Used to render the radio button circle */ }
            <div><div /></div>
        </React.Fragment>;

        return <label className={_className}>
            { checkbox }
            <div className="mx_StyledPollCheckbox_content">{ children }</div>
            <div className="mx_StyledPollCheckbox_spacer" />
        </label>;
    }
}
