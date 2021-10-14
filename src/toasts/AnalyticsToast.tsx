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

import React from "react";

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

export const showToast = (policyUrl: string, analyticsOptIn: boolean, analyticsOwner: string) => {
    const brand = SdkConfig.get().brand;
    const usageDataLink = (sub) => (
        <AccessibleButton kind="link" onClick={onUsageDataClicked}>{ sub }</AccessibleButton>
    );

    let description;
    if (analyticsOptIn) {
        // The user previously opted into our old analytics system - let them know things have changed and ask
        // them to opt in again
        description = _t(`To allow us to understand how people use multiple devices,
we’ve enhanced our <UsageDataLink>analytics data</UsageDataLink> to include a randomly generated identifier associated
with your account that will be shared across your devices.` + "<Linebreak/><Linebreak/>" +
            `We care about privacy, so we still don’t record any personal or identifiable data, and the identifier
isn’t shared with any third parties.` + "<Linebreak/><Linebreak/>" +
            "You previously agreed to send anonymous usage data to %(analytics_owner)s - is this still okay?",
        {
            analytics_owner: analyticsOwner,
        },
        {
            "UsageDataLink": usageDataLink,
            "Linebreak": (sub) => <br />,
        });
    } else if (analyticsOptIn === null || analyticsOptIn === undefined) {
        // The user had no analytics setting previously set, so we just need to prompt to opt-in, rather than
        // explaining any change.
        description = _t(
            "Send <UsageDataLink>analytics data</UsageDataLink> to %(analytics_owner)s to help improve the app. " +
            "This will use a <PolicyLink>cookie</PolicyLink>.",
            {
                analytics_owner: analyticsOwner,
            },
            {
                "UsageDataLink": usageDataLink,
                // XXX: We need to link to the page that explains our cookies
                "PolicyLink": (sub) => policyUrl ? (
                    <a target="_blank" href={policyUrl}>{ sub }</a>
                ) : sub,
            },
        );
    } else { // false
        // The user previously opted out of analytics, don't ask again
        return;
    }

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

export const hideToast = () => {
    ToastStore.sharedInstance().dismissToast(TOAST_KEY);
};
