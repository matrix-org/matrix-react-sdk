/*
Copyright 2016 The Matrix.org Foundation C.I.C.

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

import React, { createRef } from "react";

import { _t } from '../../../languageHandler';
import { replaceableComponent } from "../../../utils/replaceableComponent";
import { Key } from "../../../Keyboard";
import AccessibleButton from "./AccessibleButton";

interface IProps {
    initialText: string;
    className?: string;
    placeholder?: string;
    onChange(value: string): void;
    onClear(): void;
    onEnter(): void;
}

interface IState {
    value: string;
}

@replaceableComponent("views.elements.DirectorySearchBox")
export default class DirectorySearchBox extends React.Component<IProps, IState> {
    private input = createRef<HTMLInputElement>();

    constructor(props) {
        super(props);

        this.state = {
            value: this.props.initialText || '',
        };
    }

    private onClearClick = () => {
        this.setState({ value: '' });

        if (this.input.current) {
            this.input.current.focus();
            this.props.onClear();
        }
    };

    private onChange = ev => {
        if (!this.input.current) return;
        this.setState({ value: ev.target.value });

        this.props.onChange(ev.target.value);
    };

    private onKeyDown = ev => {
        if (ev.key === Key.ENTER) {
            this.props.onEnter();
        }
    };

    render() {
        return <div className={`mx_DirectorySearchBox ${this.props.className} mx_textinput`}>
            <input
                type="text"
                name="dirsearch"
                value={this.state.value}
                className="mx_textinput_icon mx_textinput_search"
                ref={this.input}
                onChange={this.onChange}
                onKeyDown={this.onKeyDown}
                placeholder={this.props.placeholder}
                autoFocus
            />
            <AccessibleButton className="mx_DirectorySearchBox_clear" onClick={this.onClearClick} />
        </div>;
    }
}
