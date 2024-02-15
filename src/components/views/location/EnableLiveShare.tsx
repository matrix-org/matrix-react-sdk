/*
Copyright 2022 The Matrix.org Foundation C.I.C.

Licensed under the Apache License, Version 2.0 (the 'License');
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

    http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an 'AS IS' BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.
*/

import React, { useState } from "react";

import { _t } from "../../../languageHandler";
import StyledLiveBeaconIcon from "../beacon/StyledLiveBeaconIcon";
import AccessibleButton from "../elements/AccessibleButton";
import LabelledToggleSwitch from "../elements/LabelledToggleSwitch";
import Heading from "../typography/Heading";

interface Props {
    onSubmit: () => void;
}

export const EnableLiveShare: React.FC<Props> = ({ onSubmit }) => {
    const [isEnabled, setEnabled] = useState(false);
    return (
        <div data-testid="location-picker-enable-live-share" className="mx_EnableLiveShare">
            <StyledLiveBeaconIcon className="mx_EnableLiveShare_icon" />
            <Heading className="mx_EnableLiveShare_heading" size="3">
                {_t("location_sharing|live_enable_heading")}
            </Heading>
            <p className="mx_EnableLiveShare_description">{_t("location_sharing|live_enable_description")}</p>
            <LabelledToggleSwitch
                data-testid="enable-live-share-toggle"
                value={isEnabled}
                onChange={setEnabled}
                label={_t("location_sharing|live_toggle_label")}
            />
            <AccessibleButton
                data-testid="enable-live-share-submit"
                className="mx_EnableLiveShare_button"
                element="button"
                kind="primary"
                onClick={onSubmit}
                disabled={!isEnabled}
            >
                {_t("action|ok")}
            </AccessibleButton>
        </div>
    );
};
