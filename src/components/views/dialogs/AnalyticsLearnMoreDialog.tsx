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
    privacyPolicyUrl?: string;
}

const AnalyticsLearnMoreDialog: React.FC<IProps> = ({ analyticsOwner, privacyPolicyUrl, onFinished }) => {
    const onPrimaryButtonClick = () => onFinished(true);
    const privacyPolicyLink = privacyPolicyUrl ?
        <span>
            {
                _t("You can read all our terms <PrivacyPolicyUrl>here</PrivacyPolicyUrl>", {}, {
                    "PrivacyPolicyUrl": (sub) => {
                        return <a href={privacyPolicyUrl}
                            rel="norefferer noopener"
                            target="_blank"
                        >
                            { sub }
                            <span className="mx_AnalyticsPolicyLink" />
                        </a>;
                    },
                })
            }
        </span> : "";
    return <BaseDialog
        className="mx_AnalyticsLearnMoreDialog"
        contentId="mx_AnalyticsLearnMore"
        title={_t("Help improve %(analyticsOwner)s", { analyticsOwner })}
        onFinished={onFinished}
    >
        <div className="mx_Dialog_content">
            <div className="mx_AnalyticsLearnMore_image_holder" />
            <div className="mx_AnalyticsLearnMore_copy">
                { _t("Help us identify issues and improve Element by sharing anonymous usage data. " +
                    "To understand how people use multiple devices, we'll generate a random identifier, " +
                    "shared by your devices.",
                ) }
            </div>
            <ul className="mx_AnalyticsLearnMore_bullets">
                <li>{ _t("We <Bold>don't</Bold> record or profile any personal data",
                    {}, { "Bold": (sub) => <b>{ sub }</b> }) }</li>
                <li>{ _t("We <Bold>don't</Bold> share information with third parties",
                    {}, { "Bold": (sub) => <b>{ sub }</b> }) }</li>
                <li>{ _t("You can turn this off anytime in settings") }</li>
            </ul>
            { privacyPolicyLink }
        </div>
        <DialogButtons
            primaryButton={_t("Enable")}
            onPrimaryButtonClick={onPrimaryButtonClick}
            onCancel={onFinished} />
    </BaseDialog>;
};

export default AnalyticsLearnMoreDialog;
