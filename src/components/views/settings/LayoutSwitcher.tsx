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

import React, { JSX, useEffect, useState } from "react";
import { InlineField, ToggleControl, Label, Root, RadioControl } from "@vector-im/compound-web";

import SettingsSubsection from "./shared/SettingsSubsection";
import { _t } from "../../../languageHandler";
import SettingsStore from "../../../settings/SettingsStore";
import { SettingLevel } from "../../../settings/SettingLevel";
import { useSettingValue } from "../../../hooks/useSettings";
import { Layout } from "../../../settings/enums/Layout";
import EventTilePreview from "../elements/EventTilePreview";
import { useMatrixClientContext } from "../../../contexts/MatrixClientContext";

/**
 * A section to switch between different message layouts.
 */
export function LayoutSwitcher(): JSX.Element {
    return (
        <SettingsSubsection heading={_t("common|message_layout")} newUi={true} data-testid="layoutPanel">
            <LayoutSelector />
            <ToggleCompactLayout />
        </SettingsSubsection>
    );
}

/**
 * A selector to choose the layout of the messages.
 */
function LayoutSelector(): JSX.Element {
    return (
        <Root
            className="mx_LayoutSwitcher_LayoutSelector"
            onChange={async (evt) => {
                // We don't have any file in the form, we can cast it as string safely
                const newLayout = new FormData(evt.currentTarget).get("layout") as string | null;
                await SettingsStore.setValue("layout", null, SettingLevel.DEVICE, newLayout);
            }}
        >
            <LayoutRadio layout={Layout.Group} label={_t("common|modern")} />
            <LayoutRadio layout={Layout.Bubble} label={_t("settings|appearance|layout_bubbles")} />
            <LayoutRadio layout={Layout.IRC} label={_t("settings|appearance|layout_irc")} />
        </Root>
    );
}

/**
 * A radio button to select a layout.
 */
interface LayoutRadioProps {
    /**
     * The value of the layout.
     */
    layout: Layout;
    /**
     * The label to display for the layout.
     */
    label: string;
}

/**
 * A radio button to select a layout.
 * @param layout
 * @param label
 */
function LayoutRadio({ layout, label }: LayoutRadioProps): JSX.Element {
    const currentLayout = useSettingValue<Layout>("layout");
    const eventTileInfo = useEventTileInfo();

    return (
        <div className="mxLayoutSwitcher_LayoutSelector_LayoutRadio">
            <InlineField
                className="mxLayoutSwitcher_LayoutSelector_LayoutRadio_InlineField"
                control={<RadioControl name="layout" value={layout} defaultChecked={currentLayout === layout} />}
                name="layout"
            >
                <Label>{label}</Label>
            </InlineField>
            <div role="separator" className="mxLayoutSwitcher_LayoutSelector_LayoutRadio_separator" />
            <EventTilePreview
                message={_t("common|preview_message")}
                layout={layout}
                className="mxLayoutSwitcher_LayoutSelector_LayoutRadio_EventTilePreview"
                {...eventTileInfo}
            />
        </div>
    );
}

type EventTileInfo = {
    /**
     * The ID of the user to display.
     */
    userId: string;
    /**
     * The display name of the user to display.
     */
    displayName?: string;
    /**
     * The avatar URL of the user to display.
     */
    avatarUrl?: string;
};

/**
 * Fetch the information to display in the event tile preview.
 */
function useEventTileInfo(): EventTileInfo {
    const matrixClient = useMatrixClientContext();
    const userId = matrixClient.getSafeUserId();
    const [eventTileInfo, setEventTileInfo] = useState<EventTileInfo>({ userId });

    useEffect(() => {
        const run = async (): Promise<void> => {
            const profileInfo = await matrixClient.getProfileInfo(userId);
            setEventTileInfo({
                userId,
                displayName: profileInfo.displayname,
                avatarUrl: profileInfo.avatar_url,
            });
        };

        run();
    }, [userId, matrixClient, setEventTileInfo]);
    return eventTileInfo;
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
