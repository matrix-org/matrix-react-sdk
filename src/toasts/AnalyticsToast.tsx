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
import Modal from "../Modal";
import AnalyticsLearnMoreDialog from "../components/views/dialogs/AnalyticsLearnMoreDialog";

const onAccept = () => {
    dis.dispatch({
        action: 'analytics_accept',
    });
};

const onReject = () => {
    dis.dispatch({
        action: "analytics_reject",
    });
};

const onLearnMore = (privacyPolicyUrl?: string, analyticsOwner: string) => {
    Modal.createTrackedDialog(
        "Analytics Learn More",
        "",
        AnalyticsLearnMoreDialog,
        {
            analyticsOwner,
            privacyPolicyUrl,
            onFinished: (analyticsEnabled?: boolean) => {
                if (analyticsEnabled === true) {
                    onAccept();
                } else if (analyticsEnabled === false) {
                    onReject();
                }
                // otherwise, the user closed the dialog without making a choice, leave the toast open
            },
        },
        "mx_AnalyticsLearnMoreDialog_wrapper",
    );
};

const onUsageDataClicked = () => {
    Analytics.showDetailsModal();
};

const TOAST_KEY = "analytics";

const getAnonymousDescription = (): ReactNode => {
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

const showToast = (props: Omit<React.ComponentProps<typeof GenericToast>, "toastKey">, analyticsOwner: string) => {
    ToastStore.sharedInstance().addOrReplaceToast({
        key: TOAST_KEY,
        title: _t("Help improve %(analyticsOwner)s", { analyticsOwner }),
        props,
        component: GenericToast,
        className: "mx_AnalyticsToast",
        priority: 10,
    });
};

export const showPseudonymousAnalyticsOptInToast = (privacyPolicyUrl?: string, analyticsOptIn: boolean,
    analyticsOwner: string): void => {
    const learnMoreLink = (sub) => (
        <AccessibleButton kind="link" onClick={() => onLearnMore(privacyPolicyUrl, analyticsOwner)}>{ sub }</AccessibleButton>
    );
    let props;
    if (analyticsOptIn) {
        // The user previously opted into our old analytics system - let them know things have changed and ask
        // them to opt in again.
        props = {
            description: _t(
                "You previously consented to share anonymous usage data with us. We're updating how that works."),
            acceptLabel: _t("Learn more"),
            onAccept,
            rejectLabel: _t("That's fine"),
            onReject: onLearnMore(privacyPolicyUrl, analyticsOwner),
        };
    } else if (analyticsOptIn === null || analyticsOptIn === undefined) {
        // The user had no analytics setting previously set, so we just need to prompt to opt-in, rather than
        // explaining any change.
        props = {
            description: _t(
                "Share anonymous data to help us identify issues. Nothing personal. No third parties. " +
                "<LearnMoreLink>Learn More</LearnMoreLink>", {}, { "LearnMoreLink": learnMoreLink }),
            acceptLabel: _t("Yes"),
            onAccept,
            rejectLabel: _t("No"),
            onReject,
        };
    } else { // false
        // The user previously opted out of analytics, don't ask again
        return;
    }
    showToast(props, analyticsOwner);
};

export const showAnonymousAnalyticsOptInToast = (analyticsOwner: string): void => {
    const props = {
        description: getAnonymousDescription(),
        acceptLabel: _t("Yes"),
        onAccept,
        rejectLabel: _t("No"),
        onReject,
    };
    showToast(props, analyticsOwner);
};

export const hideToast = () => {
    ToastStore.sharedInstance().dismissToast(TOAST_KEY);
};
