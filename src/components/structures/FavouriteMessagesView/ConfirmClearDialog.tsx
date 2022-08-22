/*
Copyright 2017 Vector Creations Ltd

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

import React, { FC } from 'react';

import useFavouriteMessages from '../../../hooks/useFavouriteMessages';
import BaseDialog from "../../views/dialogs/BaseDialog";
import { IDialogProps } from '../../views/dialogs/IDialogProps';
import DialogButtons from "../../views/elements/DialogButtons";

interface IProps extends IDialogProps {
    title?: string;
    description?: string;
    button?: string;
    hasCancel?: boolean;
}

/*
 * A dialog for confirming a clearing of starred messages.
 */
const ConfirmClearDialog: FC<IProps> = (props: IProps) => {
    const { clearFavouriteMessages } = useFavouriteMessages();

    const onConfirmClick = () => {
        clearFavouriteMessages();
        props.onFinished();
    };

    return (
        <BaseDialog
            className="mx_TextInputDialog mx_ClearDialog"
            onFinished={props.onFinished}
            title={props.title}
        >
            <div className="mx_Dialog_content">
                <div className="mx_TextInputDialog_label">
                    <span> { props.description } </span>
                </div>
            </div>
            <DialogButtons
                primaryButton={props.button}
                onPrimaryButtonClick={onConfirmClick}
                onCancel={props.onFinished}
                hasCancel={props.hasCancel}
            />
        </BaseDialog>
    );
};

export default ConfirmClearDialog;
