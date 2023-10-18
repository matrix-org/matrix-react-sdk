/*
Copyright 2019 New Vector Ltd

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

import SdkConfig from "../../../SdkConfig";
import Modal from "../../../Modal";
import { _t } from "../../../languageHandler";
import BaseDialog from "./BaseDialog";
import DialogButtons from "../elements/DialogButtons";
import BugReportDialog from "./BugReportDialog";
import AccessibleButton, { ButtonEvent } from "../elements/AccessibleButton";

interface IProps {
    onFinished(signOut?: boolean): void;
}

export default class StorageEvictedDialog extends React.Component<IProps> {
    private sendBugReport = (ev: ButtonEvent): void => {
        ev.preventDefault();
        Modal.createDialog(BugReportDialog, {});
    };

    private onSignOutClick = (): void => {
        this.props.onFinished(true);
    };

    public render(): React.ReactNode {
        let logRequest;
        if (SdkConfig.get().bug_report_endpoint_url) {
            logRequest = _t(
                "bug_reporting|log_request",
                {},
                {
                    a: (text) => (
                        <AccessibleButton kind="link_inline" onClick={this.sendBugReport}>
                            {text}
                        </AccessibleButton>
                    ),
                },
            );
        }

        return (
            <BaseDialog
                className="mx_ErrorDialog"
                onFinished={this.props.onFinished}
                title={_t("error|storage_evicted_title")}
                contentId="mx_Dialog_content"
                hasCancel={false}
            >
                <div className="mx_Dialog_content" id="mx_Dialog_content">
                    <p>{_t("error|storage_evicted_description_1")}</p>
                    <p>
                        {_t("error|storage_evicted_description_2")} {logRequest}
                    </p>
                </div>
                <DialogButtons
                    primaryButton={_t("action|sign_out")}
                    onPrimaryButtonClick={this.onSignOutClick}
                    focus={true}
                    hasCancel={false}
                />
            </BaseDialog>
        );
    }
}
