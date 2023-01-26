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

import React, { FC, useCallback } from "react";

import useFavouriteMessages from "../../../hooks/useFavouriteMessages";
import { _t } from "../../../languageHandler";
import BaseDialog from "../../views/dialogs/BaseDialog";
import { IDialogProps } from "../../views/dialogs/IDialogProps";
import DialogButtons from "../../views/elements/DialogButtons";

/**
 * A dialog for confirming a clearing of favourite messages.
 */
const ConfirmClearFavouritesDialog: FC<IDialogProps> = (props: IDialogProps) => {
    const { clearFavouriteMessages } = useFavouriteMessages();

    const onConfirmClick = useCallback(() => {
        clearFavouriteMessages();
        props.onFinished();
    }, [props, clearFavouriteMessages]);

    return (
        <BaseDialog
            className="mx_TextInputDialog mx_ClearDialog"
            onFinished={props.onFinished}
            title={_t("Confirm Removal")}
        >
            <div className="mx_Dialog_content">
                <div className="mx_TextInputDialog_label">
                    <span> {_t("Are you sure you wish to clear all your favourite messages? ")} </span>
                </div>
            </div>
            <DialogButtons
                primaryButton={_t("Confirm")}
                onPrimaryButtonClick={onConfirmClick}
                onCancel={props.onFinished}
                hasCancel={true}
            />
        </BaseDialog>
    );
};

export default ConfirmClearFavouritesDialog;
