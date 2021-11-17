/*
Copyright 2021 The Matrix.org Foundation C.I.C.

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

import BaseDialog from "./BaseDialog";
import { _t } from "../../../languageHandler";
import DialogButtons from "../elements/DialogButtons";
import React from "react";

interface IProps {
    onEnable(): void;
    onFinished(enableAnalytics?: boolean): void;
    analyticsOwner: string;
}

const AnalyticsLearnMoreDialog: React.FC<IProps> = ({ analyticsOwner, onFinished }) => {
    const onPrimaryButtonClick = () => onFinished(true);
    return <BaseDialog
        className="mx_AnalyticsLearnMoreDialog"
        title={_t("Help improve %(analyticsOwner)s", { analyticsOwner })}
        onFinished={onFinished}
    >
        <div className="mx_Dialog_content" />
        { _t("Help us identify issues and improve Element by sharing anonymous usage data.") }
        <DialogButtons
            primaryButton={_t("Enable")}
            onPrimaryButtonClick={onPrimaryButtonClick}
            onCancel={onFinished} />
    </BaseDialog>;
};

export default AnalyticsLearnMoreDialog;
