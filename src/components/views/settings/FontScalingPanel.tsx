/*
Copyright 2021 - 2023 The Matrix.org Foundation C.I.C.

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

import EventTilePreview from "../elements/EventTilePreview";
import SettingsStore from "../../../settings/SettingsStore";
import Slider from "../elements/Slider";
import { FontWatcher } from "../../../settings/watchers/FontWatcher";
import { Layout } from "../../../settings/enums/Layout";
import { MatrixClientPeg } from "../../../MatrixClientPeg";
import { SettingLevel } from "../../../settings/SettingLevel";
import { _t } from "../../../languageHandler";
import SettingsSubsection from "./shared/SettingsSubsection";

interface IProps {}

interface IState {
    // String displaying the current selected fontSize.
    // Needs to be string for things like '17.' without
    // trailing 0s.
    fontSize: string;
    layout: Layout;
    // User profile data for the message preview
    userId?: string;
    displayName?: string;
    avatarUrl?: string;
}

const formatRelativeFontSize = (fontSize: number): string => {
    const delta = fontSize - FontWatcher.DEFAULT_SIZE;
    if (delta === 0) {
        return _t("settings|appearance|font_size_default");
    }
    return new Intl.NumberFormat(undefined, { signDisplay: "always" }).format(delta);
};

export default class FontScalingPanel extends React.Component<IProps, IState> {
    private readonly MESSAGE_PREVIEW_TEXT = _t("common|preview_message");
    private layoutWatcherRef?: string;
    private unmounted = false;

    public constructor(props: IProps) {
        super(props);

        this.state = {
            fontSize: SettingsStore.getValue("baseFontSizeV2", null).toString(),
            layout: SettingsStore.getValue("layout"),
        };
    }

    public async componentDidMount(): Promise<void> {
        // Fetch the current user profile for the message preview
        const client = MatrixClientPeg.safeGet();
        const userId = client.getSafeUserId();
        const profileInfo = await client.getProfileInfo(userId);
        this.layoutWatcherRef = SettingsStore.watchSetting("layout", null, () => {
            // Update the layout for the preview window according to the user selection
            const value = SettingsStore.getValue("layout");
            if (this.state.layout !== value) {
                this.setState({
                    layout: value,
                });
            }
        });
        if (this.unmounted) return;

        this.setState({
            userId,
            displayName: profileInfo.displayname,
            avatarUrl: profileInfo.avatar_url,
        });
    }

    public componentWillUnmount(): void {
        this.unmounted = true;
        if (this.layoutWatcherRef) {
            SettingsStore.unwatchSetting(this.layoutWatcherRef);
        }
    }

    private onFontSizeChanged = (size: number): void => {
        this.setState({ fontSize: size.toString() });
        SettingsStore.setValue("baseFontSizeV2", null, SettingLevel.DEVICE, size);
    };

    public render(): React.ReactNode {
        return (
            <SettingsSubsection
                heading={_t("settings|appearance|font_size")}
                stretchContent
                data-testid="mx_FontScalingPanel"
            >
                <EventTilePreview
                    className="mx_FontScalingPanel_preview"
                    message={this.MESSAGE_PREVIEW_TEXT}
                    layout={this.state.layout}
                    userId={this.state.userId}
                    displayName={this.state.displayName}
                    avatarUrl={this.state.avatarUrl}
                />
                <div className="mx_FontScalingPanel_fontSlider">
                    <div className="mx_FontScalingPanel_fontSlider_smallText">Aa</div>
                    <Slider
                        min={FontWatcher.MIN_SIZE}
                        max={FontWatcher.MAX_SIZE}
                        step={1}
                        value={parseInt(this.state.fontSize, 10)}
                        onChange={this.onFontSizeChanged}
                        displayFunc={formatRelativeFontSize}
                        label={_t("settings|appearance|font_size")}
                    />
                    <div className="mx_FontScalingPanel_fontSlider_largeText">Aa</div>
                </div>
            </SettingsSubsection>
        );
    }
}
