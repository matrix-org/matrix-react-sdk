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
import classnames from 'classnames';
import {replaceableComponent} from "../../../utils/replaceableComponent";

interface IProps extends React.InputHTMLAttributes<HTMLInputElement> {
    outlined?: boolean;
}

interface IState {
}

@replaceableComponent("views.elements.StyledRadioButton")
export default class StyledRadioButton extends React.PureComponent<IProps, IState> {
    public static readonly defaultProps = {
        className: '',
    };

    public render() {
        const { children, className, disabled, outlined, ...otherProps } = this.props;
        const _className = classnames(
            'mx_RadioButton',
            className,
            {
                "mx_RadioButton_disabled": disabled,
                "mx_RadioButton_enabled": !disabled,
                "mx_RadioButton_checked": this.props.checked,
                "mx_RadioButton_outlined": outlined,
            });
        return <label className={_className}>
            <input type='radio' disabled={disabled} {...otherProps} />
            {/* Used to render the radio button circle */}
            <div><div /></div>
            <div className="mx_RadioButton_content">{children}</div>
            <div className="mx_RadioButton_spacer" />
        </label>;
    }
}
