/*
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

import React, { ReactNode } from "react";

import { _t } from "../languageHandler";
import SdkConfig from "../SdkConfig";
import dis from "../dispatcher/dispatcher";
import Analytics from "../Analytics";
import AccessibleButton from "../components/views/elements/AccessibleButton";
import GenericToast from "../components/views/toasts/GenericToast";
import ToastStore from "../stores/ToastStore";

const onAccept = () => {
    dis.dispatch({
        action: 'accept_cookies',
    });
};

const onReject = () => {
    dis.dispatch({
        action: "reject_cookies",
    });
};

const onUsageDataClicked = () => {
    Analytics.showDetailsModal();
};

const TOAST_KEY = "analytics";

type IDescriptions = {
    reOptInDescription: ReactNode;
    optInDescription: ReactNode;
};

const getPseudonymousDescriptions = (policyUrl: string, analyticsOwner: string): IDescriptions => {
    // Get toast descriptions for a user when pseudonymous tracking is enabled (i.e. the new scheme used by posthog).
    const usageDataLink = (sub) => (
        <AccessibleButton kind="link" onClick={onUsageDataClicked}>{ sub }</AccessibleButton>
    );

    // The user previously opted into our old analytics system - let them know things have changed and ask
    // them to opt in again.
    const reOptInDescription = _t(
        "To allow us to understand how people use multiple devices, we’ve enhanced our " +
        "analytics data to include a randomly generated identifier associated " +
        "with your account that will be shared across your devices." + "<Linebreak/><Linebreak/>" +
        "We don’t record or profile any personal data, and we don't share anything with any third " +
        "parties." + "<Linebreak/><Linebreak/>" + "<UsageDataLink>More information</UsageDataLink>" +
        "<Linebreak/><Linebreak/>" +
        "You previously agreed to send anonymous usage data to %(analyticsOwner)s - is this still okay?",
        {
            analyticsOwner: analyticsOwner,
        },
        {
            "UsageDataLink": usageDataLink,
            "Linebreak": (sub) => <br />,
        });

    // The user had no analytics setting previously set, so we just need to prompt to opt-in, rather than
    // explaining any change.
    const optInDescription = _t(
        "Would you like to send analytics data to %(analyticsOwner)s to help us improve the app? " +
        "<Linebreak/><Linebreak/>" +
        "We don’t record or profile any personal data, and we don't share anything " +
        "with any third parties." + "<Linebreak/><Linebreak/>" + "<UsageDataLink>More information</UsageDataLink>",
        {
            analyticsOwner: analyticsOwner,
        },
        {
            "UsageDataLink": usageDataLink,
            "Linebreak": (sub) => <br />,
        },
    );

    return { reOptInDescription, optInDescription };
};

const getAnonymousDescription = (policyUrl): ReactNode => {
    // get toast description for anonymous tracking (the previous scheme pre-posthog)
    const brand = SdkConfig.get().brand;
    return _t(
        "Send <UsageDataLink>anonymous usage data</UsageDataLink> which helps us improve %(brand)s. ",
        {
            brand,
        },
        {
            "UsageDataLink": (sub) => (
                <AccessibleButton kind="link" onClick={onUsageDataClicked}>{ sub }</AccessibleButton>
            ),
        },
    );
};

const showToast = (description: ReactNode) => {
    const brand = SdkConfig.get().brand;
    ToastStore.sharedInstance().addOrReplaceToast({
        key: TOAST_KEY,
        title: _t("Help us improve %(brand)s", { brand }),
        props: {
            description: description,
            acceptLabel: _t("Yes"),
            onAccept,
            rejectLabel: _t("No"),
            onReject,
        },
        component: GenericToast,
        className: "mx_AnalyticsToast",
        priority: 10,
    });
};

export const showPseudonymousAnalyticsOptInToast = (policyUrl: string, analyticsOptIn: boolean,
    analyticsOwner: string): void => {
    let description;
    const descriptions = getPseudonymousDescriptions(policyUrl, analyticsOwner);
    if (analyticsOptIn) {
        description = descriptions.reOptInDescription;
    } else if (analyticsOptIn === null || analyticsOptIn === undefined) {
        description = descriptions.optInDescription;
    } else { // false
        // The user previously opted out of analytics, don't ask again
        return;
    }
    showToast(description);
};

export const showAnonymousAnalyticsOptInToast = (policyUrl: string): void => {
    showToast(getAnonymousDescription(policyUrl));
};

export const hideToast = () => {
    ToastStore.sharedInstance().dismissToast(TOAST_KEY);
};
