/*
 * Copyright 2024 The Matrix.org Foundation C.I.C.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import React, { JSX } from "react";
import { InlineField, ToggleControl, Label, Root } from "@vector-im/compound-web";

import SettingsSubsection from "./shared/SettingsSubsection";
import { _t } from "../../../languageHandler";
import SettingsStore from "../../../settings/SettingsStore";
import { SettingLevel } from "../../../settings/SettingLevel";
import { useSettingValue } from "../../../hooks/useSettings";

export function LayoutSwitcher(): JSX.Element {
    return (
        <SettingsSubsection heading={_t("common|message_layout")} newUi={true} data-testid="layoutPanel">
            <ToggleCompactLayout />
        </SettingsSubsection>
    );
}

/**
 * A toggleable setting to enable or disable the compact layout.
 */
function ToggleCompactLayout(): JSX.Element {
    const compactLayoutEnabled = useSettingValue<boolean>("useCompactLayout");

    return (
        <Root
            onChange={async (evt) => {
                const checked = new FormData(evt.currentTarget).get("compactLayout") === "on";
                await SettingsStore.setValue("useCompactLayout", null, SettingLevel.DEVICE, checked);
            }}
        >
            <InlineField
                name="compactLayout"
                control={<ToggleControl name="compactLayout" defaultChecked={compactLayoutEnabled} />}
            >
                <Label>{_t("settings|appearance|compact_layout")}</Label>
            </InlineField>
        </Root>
    );
}
