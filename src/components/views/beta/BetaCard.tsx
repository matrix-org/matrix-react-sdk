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

import React, { ReactNode, useState } from "react";
import { sleep } from "matrix-js-sdk/src/utils";

import { _t } from "../../../languageHandler";
import AccessibleButton from "../elements/AccessibleButton";
import SettingsStore from "../../../settings/SettingsStore";
import { SettingLevel } from "../../../settings/SettingLevel";
import Modal from "../../../Modal";
import BetaFeedbackDialog from "../dialogs/BetaFeedbackDialog";
import SdkConfig from "../../../SdkConfig";
import SettingsFlag from "../elements/SettingsFlag";
import { useFeatureEnabled } from "../../../hooks/useSettings";
import InlineSpinner from "../elements/InlineSpinner";
import AccessibleTooltipButton from "../elements/AccessibleTooltipButton";

// XXX: Keep this around for re-use in future Betas

interface IProps {
    title?: string;
    featureId: string;
}

export const BetaPill = ({ onClick }: { onClick?: () => void }) => {
    if (onClick) {
        return <AccessibleTooltipButton
            className="mx_BetaCard_betaPill"
            title={_t("This is a beta feature. Click for more info")}
            tooltip={<div>
                <div className="mx_Tooltip_title">
                    { _t("This is a beta feature") }
                </div>
                <div className="mx_Tooltip_sub">
                    { _t("Click for more info") }
                </div>
            </div>}
            onClick={onClick}
            yOffset={-10}
        >
            { _t("Beta") }
        </AccessibleTooltipButton>;
    }

    return <span className="mx_BetaCard_betaPill">
        { _t("Beta") }
    </span>;
};

const BetaCard = ({ title: titleOverride, featureId }: IProps) => {
    const info = SettingsStore.getBetaInfo(featureId);
    const value = useFeatureEnabled(featureId);
    const [busy, setBusy] = useState(false);
    if (!info) return null; // Beta is invalid/disabled

    const {
        title,
        caption,
        disclaimer,
        image,
        feedbackLabel,
        feedbackSubheading,
        extraSettings,
        requiresRefresh,
    } = info;

    let feedbackButton;
    if (value && feedbackLabel && feedbackSubheading && SdkConfig.get().bug_report_endpoint_url) {
        feedbackButton = <AccessibleButton
            onClick={() => {
                Modal.createTrackedDialog("Beta Feedback", featureId, BetaFeedbackDialog, { featureId });
            }}
            kind="primary"
        >
            { _t("Feedback") }
        </AccessibleButton>;
    }

    let content: ReactNode;
    if (busy) {
        content = <InlineSpinner />;
    } else if (value) {
        content = _t("Leave the beta");
    } else {
        content = _t("Join the beta");
    }

    return <div className="mx_BetaCard">
        <div className="mx_BetaCard_columns">
            <div>
                <h3 className="mx_BetaCard_title">
                    { titleOverride || _t(title) }
                    <BetaPill />
                </h3>
                <span className="mx_BetaCard_caption">{ caption() }</span>
                <div className="mx_BetaCard_buttons">
                    { feedbackButton }
                    <AccessibleButton
                        onClick={async () => {
                            setBusy(true);
                            // make it look like we're doing something for two seconds,
                            // otherwise users think clicking did nothing
                            if (!requiresRefresh) {
                                await sleep(2000);
                            }
                            await SettingsStore.setValue(featureId, null, SettingLevel.DEVICE, !value);
                            if (!requiresRefresh) {
                                setBusy(false);
                            }
                        }}
                        kind={feedbackButton ? "primary_outline" : "primary"}
                        disabled={busy}
                    >
                        { content }
                    </AccessibleButton>
                </div>
                { disclaimer && <div className="mx_BetaCard_disclaimer">
                    { disclaimer(value) }
                </div> }
            </div>
            <img src={image} alt="" />
        </div>
        { extraSettings && value && <div className="mx_BetaCard_relatedSettings">
            { extraSettings.map(key => (
                <SettingsFlag key={key} name={key} level={SettingLevel.DEVICE} />
            )) }
        </div> }
    </div>;
};

export default BetaCard;
