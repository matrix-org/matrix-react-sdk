/*
Copyright 2019 Bastian Masanek, Noxware IT <matrix@noxware.de>
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

import React, { ReactNode, KeyboardEvent } from 'react';
import classNames from "classnames";

import { _t } from '../../../languageHandler';
import { IDialogProps } from "./IDialogProps";
import BaseDialog from "./BaseDialog";
import DialogButtons from "../elements/DialogButtons";

interface IProps extends IDialogProps {
    title?: string;
    description?: ReactNode;
    className?: string;
    button?: boolean | string;
    hasCloseButton?: boolean;
    fixedWidth?: boolean;
    onKeyDown?(event: KeyboardEvent): void;
}

export default class InfoDialog extends React.Component<IProps> {
    static defaultProps = {
        title: '',
        description: '',
        hasCloseButton: false,
    };

    private onFinished = () => {
        this.props.onFinished();
    };

    render() {
        return (
            <BaseDialog
                className="mx_InfoDialog"
                onFinished={this.props.onFinished}
                title={this.props.title}
                contentId='mx_Dialog_content'
                hasCancel={this.props.hasCloseButton}
                onKeyDown={this.props.onKeyDown}
                fixedWidth={this.props.fixedWidth}
            >
                <div className={classNames("mx_Dialog_content", this.props.className)} id="mx_Dialog_content">
                    { this.props.description }
                </div>
                { this.props.button !== false && <DialogButtons primaryButton={this.props.button || _t('OK')}
                    onPrimaryButtonClick={this.onFinished}
                    hasCancel={false}
                /> }
            </BaseDialog>
        );
    }
}
