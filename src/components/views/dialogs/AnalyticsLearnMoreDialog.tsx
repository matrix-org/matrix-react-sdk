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

import React from "react";

import BaseDialog from "./BaseDialog";
import { _t } from "../../../languageHandler";
import DialogButtons from "../elements/DialogButtons";
import Modal, { ComponentProps } from "../../../Modal";
import SdkConfig from "../../../SdkConfig";
import { getPolicyUrl } from "../../../toasts/AnalyticsToast";
import ExternalLink from "../elements/ExternalLink";

export enum ButtonClicked {
    Primary,
    Cancel,
}

interface IProps {
    onFinished(buttonClicked?: ButtonClicked): void;
    analyticsOwner: string;
    privacyPolicyUrl?: string;
    primaryButton?: string;
    cancelButton?: string;
    hasCancel?: boolean;
}

export const AnalyticsLearnMoreDialog: React.FC<IProps> = ({
    onFinished,
    analyticsOwner,
    privacyPolicyUrl,
    primaryButton,
    cancelButton,
    hasCancel,
}) => {
    const onPrimaryButtonClick = (): void => onFinished(ButtonClicked.Primary);
    const onCancelButtonClick = (): void => onFinished(ButtonClicked.Cancel);
    const privacyPolicyLink = privacyPolicyUrl ? (
        <span>
            {_t(
                "analytics|privacy_policy",
                {},
                {
                    PrivacyPolicyUrl: (sub) => {
                        return (
                            <ExternalLink href={privacyPolicyUrl} rel="norefferer noopener" target="_blank">
                                {sub}
                            </ExternalLink>
                        );
                    },
                },
            )}
        </span>
    ) : (
        ""
    );
    return (
        <BaseDialog
            className="mx_AnalyticsLearnMoreDialog"
            contentId="mx_AnalyticsLearnMore"
            title={_t("analytics|enable_prompt", { analyticsOwner })}
            onFinished={onFinished}
        >
            <div className="mx_Dialog_content">
                <div className="mx_AnalyticsLearnMore_image_holder" />
                <div className="mx_AnalyticsLearnMore_copy">
                    {_t("analytics|pseudonymous_usage_data", { analyticsOwner })}
                </div>
                <ul className="mx_AnalyticsLearnMore_bullets">
                    <li>{_t("analytics|bullet_1", {}, { Bold: (sub) => <b>{sub}</b> })}</li>
                    <li>{_t("analytics|bullet_2", {}, { Bold: (sub) => <b>{sub}</b> })}</li>
                    <li>{_t("analytics|disable_prompt")}</li>
                </ul>
                {privacyPolicyLink}
            </div>
            <DialogButtons
                primaryButton={primaryButton}
                cancelButton={cancelButton}
                onPrimaryButtonClick={onPrimaryButtonClick}
                onCancel={onCancelButtonClick}
                hasCancel={hasCancel}
            />
        </BaseDialog>
    );
};

export const showDialog = (
    props: Omit<ComponentProps<typeof AnalyticsLearnMoreDialog>, "cookiePolicyUrl" | "analyticsOwner">,
): void => {
    const privacyPolicyUrl = getPolicyUrl();
    const analyticsOwner = SdkConfig.get("analytics_owner") ?? SdkConfig.get("brand");
    Modal.createDialog(
        AnalyticsLearnMoreDialog,
        {
            privacyPolicyUrl,
            analyticsOwner,
            ...props,
        },
        "mx_AnalyticsLearnMoreDialog_wrapper",
    );
};
