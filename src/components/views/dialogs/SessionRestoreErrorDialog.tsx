/*
Copyright 2017 Vector Creations Ltd
Copyright 2018 New Vector Ltd
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

import SdkConfig from '../../../SdkConfig';
import Modal from '../../../Modal';
import { _t } from '../../../languageHandler';
import QuestionDialog from "./QuestionDialog";
import BugReportDialog from "./BugReportDialog";
import BaseDialog from "./BaseDialog";
import DialogButtons from "../elements/DialogButtons";
import { IDialogProps } from "./IDialogProps";

interface IProps extends IDialogProps {
    error: Error;
}

export default class SessionRestoreErrorDialog extends React.Component<IProps> {
    private sendBugReport = (): void => {
        Modal.createDialog(BugReportDialog, {
            error: this.props.error,
        });
    };

    private onClearStorageClick = (): void => {
        Modal.createDialog(QuestionDialog, {
            title: _t("Sign out"),
            description:
                <div>{ _t("Sign out and remove encryption keys?") }</div>,
            button: _t("Sign out"),
            danger: true,
            onFinished: this.props.onFinished,
        });
    };

    private onRefreshClick = (): void => {
        // Is this likely to help? Probably not, but giving only one button
        // that clears your storage seems awful.
        window.location.reload();
    };

    public render(): JSX.Element {
        const brand = SdkConfig.get().brand;

        const clearStorageButton = (
            <button onClick={this.onClearStorageClick} className="danger">
                { _t("Clear Storage and Sign Out") }
            </button>
        );

        let dialogButtons;
        if (SdkConfig.get().bug_report_endpoint_url) {
            dialogButtons = <DialogButtons primaryButton={_t("Send Logs")}
                onPrimaryButtonClick={this.sendBugReport}
                focus={true}
                hasCancel={false}
            >
                { clearStorageButton }
            </DialogButtons>;
        } else {
            dialogButtons = <DialogButtons primaryButton={_t("Refresh")}
                onPrimaryButtonClick={this.onRefreshClick}
                focus={true}
                hasCancel={false}
            >
                { clearStorageButton }
            </DialogButtons>;
        }

        return (
            <BaseDialog
                className="mx_ErrorDialog"
                onFinished={this.props.onFinished}
                title={_t('Unable to restore session')}
                contentId='mx_Dialog_content'
                hasCancel={false}
            >
                <div className="mx_Dialog_content" id='mx_Dialog_content'>
                    <p>{ _t("We encountered an error trying to restore your previous session.") }</p>

                    <p>{ _t(
                        "If you have previously used a more recent version of %(brand)s, your session " +
                        "may be incompatible with this version. Close this window and return " +
                        "to the more recent version.",
                        { brand },
                    ) }</p>

                    <p>{ _t(
                        "Clearing your browser's storage may fix the problem, but will sign you " +
                        "out and cause any encrypted chat history to become unreadable.",
                    ) }</p>
                </div>
                { dialogButtons }
            </BaseDialog>
        );
    }
}
