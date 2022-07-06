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

import React from 'react';

import { Action } from '../../../dispatcher/actions';
import { _t } from '../../../languageHandler';
import SdkConfig from '../../../SdkConfig';
import dis from "../../../dispatcher/dispatcher";
import {
    ButtonClicked,
    showDialog as showAnalyticsLearnMoreDialog,
} from '../../views/dialogs/AnalyticsLearnMoreDialog';
import AccessibleButton from '../../views/elements/AccessibleButton';
import SplashPage from '../SplashPage';
import { Icon as AnalyticsIcon } from "../../../../res/img/element-icons/analytics.svg";

interface IProps {
    onFinished?: (accepted: boolean) => void;
}

export default function AnalyticsOptIn({ onFinished }: IProps) {
    const onAccept = () => {
        dis.dispatch({
            action: Action.PseudonymousAnalyticsAccept,
        });
        onFinished?.(true);
    };

    const onSkip = () => {
        dis.dispatch({
            action: Action.PseudonymousAnalyticsReject,
        });
        onFinished?.(false);
    };

    const onLearnMoreNoOptIn = () => {
        showAnalyticsLearnMoreDialog({
            onFinished: (buttonClicked?: ButtonClicked) => {
                if (buttonClicked === ButtonClicked.Primary) {
                    // user clicked "Enable"
                    onAccept();
                }
                // otherwise, the user either clicked "Cancel", or closed the
                // dialog without making a choice, leave the toast open
            },
            primaryButton: _t("Enable"),
        });
    };

    const { brand } = SdkConfig.get();
    return (
        <SplashPage className="mx_CenteredContent mx_AnalyticsOptIn">
            <section className="mx_AnalyticsOptIn_content">
                <AnalyticsIcon className="text-success" style={{ maxWidth: "48px" }} />
                <h1>{ _t('Help improve %(brand)s', { brand }) }</h1>
                <p>
                    { _t("Would you like to send analytics data to help improve "
                   + "%(brand)s? We don't record or profile any personal data, "
                   + "and we don't share information with third parties. You "
                   + "can turn this off anytime. Read all our terms <a>here</a>.",
                    { brand },
                    { a: (sub) => (
                        <AccessibleButton kind="link_inline" onClick={onLearnMoreNoOptIn}>
                            { sub }
                        </AccessibleButton>
                    ) }) }
                </p>
                <AccessibleButton kind="primary" className="mx_AccessibleButton_block" onClick={onAccept}>
                    { _t("Enable") }
                </AccessibleButton>
                <AccessibleButton kind="link_inline" className="mx_AccessibleButton_block" onClick={onSkip}>
                    { _t("Skip") }
                </AccessibleButton>
            </section>
        </SplashPage>
    );
}
