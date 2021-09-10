/*
Copyright 2015 - 2021 The Matrix.org Foundation C.I.C.

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

import React, { createRef, ReactNode } from 'react';

import Field from "../elements/Field";
import { _t, _td } from '../../../languageHandler';
import { replaceableComponent } from "../../../utils/replaceableComponent";
import { IDialogProps } from "./IDialogProps";
import { IFieldState, IValidationResult } from "../elements/Validation";
import BaseDialog from './BaseDialog';
import DialogButtons from '../elements/DialogButtons';

interface IProps extends IDialogProps {
    title?: string;
    description?: ReactNode;
    value?: string;
    placeholder?: string;
    button?: string;
    busyMessage?: string; // pass _td string
    focus?: boolean;
    hasCancel?: boolean;
    fixedWidth?: boolean;
    validator?(state: IFieldState): Promise<IValidationResult>;
}

interface IState {
    value?: string;
    busy: boolean;
    valid: boolean;
}

@replaceableComponent("views.dialogs.TextInputDialog")
export default class TextInputDialog extends React.Component<IProps, IState> {
    static defaultProps = {
        title: "",
        value: "",
        description: "",
        busyMessage: _td("Loading..."),
        focus: true,
        hasCancel: true,
    };

    private field = createRef<Field>();

    constructor(props) {
        super(props);

        this.state = {
            value: this.props.value,
            busy: false,
            valid: false,
        };
    }

    componentDidMount() {
        if (this.props.focus) {
            // Set the cursor at the end of the text input
            // this.field.current.value = this.props.value;
            this.field.current.focus();
        }
    }

    private onOk = async ev => {
        ev.preventDefault();
        if (this.props.validator) {
            this.setState({ busy: true });
            await this.field.current.validate({ allowEmpty: false });

            if (!this.field.current.state.valid) {
                this.field.current.focus();
                this.field.current.validate({ allowEmpty: false, focused: true });
                this.setState({ busy: false });
                return;
            }
        }
        this.props.onFinished(true, this.state.value);
    };

    private onCancel = () => {
        this.props.onFinished(false);
    };

    private onChange = ev => {
        this.setState({
            value: ev.target.value,
        });
    };

    private onValidate = async fieldState => {
        const result = await this.props.validator(fieldState);
        this.setState({
            valid: result.valid,
        });
        return result;
    };

    render() {
        return (
            <BaseDialog
                className="mx_TextInputDialog"
                onFinished={this.props.onFinished}
                title={this.props.title}
                fixedWidth={this.props.fixedWidth}
            >
                <form onSubmit={this.onOk}>
                    <div className="mx_Dialog_content">
                        <div className="mx_TextInputDialog_label">
                            <label htmlFor="textinput"> { this.props.description } </label>
                        </div>
                        <div>
                            <Field
                                className="mx_TextInputDialog_input"
                                ref={this.field}
                                type="text"
                                label={this.props.placeholder}
                                value={this.state.value}
                                onChange={this.onChange}
                                onValidate={this.props.validator ? this.onValidate : undefined}
                                size={64}
                            />
                        </div>
                    </div>
                </form>
                <DialogButtons
                    primaryButton={this.state.busy ? _t(this.props.busyMessage) : this.props.button}
                    disabled={this.state.busy}
                    onPrimaryButtonClick={this.onOk}
                    onCancel={this.onCancel}
                    hasCancel={this.props.hasCancel}
                />
            </BaseDialog>
        );
    }
}
