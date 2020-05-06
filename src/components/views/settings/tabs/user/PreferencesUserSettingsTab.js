/*
Copyright 2019 New Vector Ltd
Copyright 2019 Michael Telatynski <7t3chguy@gmail.com>

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
import {_t} from "../../../../../languageHandler";
import {SettingLevel} from "../../../../../settings/SettingsStore";
import LabelledToggleSwitch from "../../../elements/LabelledToggleSwitch";
import SettingsStore from "../../../../../settings/SettingsStore";
import Field from "../../../elements/Field";
import AccessibleButton from "../../../elements/AccessibleButton";
import * as sdk from "../../../../..";
import PlatformPeg from "../../../../../PlatformPeg";
import {enumerateThemes, ThemeWatcher} from "../../../../../theme";
import dis from "../../../../../dispatcher";

export default class PreferencesUserSettingsTab extends React.Component {
    static ROOM_LIST_SETTINGS = [
        'RoomList.orderAlphabetically',
        'RoomList.orderByImportance',
        'breadcrumbs',
    ];

    static COMPOSER_SETTINGS = [
        'MessageComposerInput.autoReplaceEmoji',
        'MessageComposerInput.suggestEmoji',
        'sendTypingNotifications',
    ];

    static TIMELINE_SETTINGS = [
        'showTypingNotifications',
        'autoplayGifsAndVideos',
        'urlPreviewsEnabled',
        'TextualBody.enableBigEmoji',
        'showReadReceipts',
        'showTwelveHourTimestamps',
        'alwaysShowTimestamps',
        'showRedactions',
        'enableSyntaxHighlightLanguageDetection',
        'showJoinLeaves',
        'showAvatarChanges',
        'showDisplaynameChanges',
        'showImages',
        'useCompactLayout',
    ];

    static ADVANCED_SETTINGS = [
        'alwaysShowEncryptionIcons',
        'Pill.shouldShowPillAvatar',
        'TagPanel.enableTagPanel',
        'promptBeforeInviteUnknownUsers',
        // Start automatically after startup (electron-only)
        // Autocomplete delay (niche text box)
    ];

    constructor() {
        super();

        this.state = {
            autoLaunch: false,
            autoLaunchSupported: false,
            alwaysShowMenuBar: true,
            alwaysShowMenuBarSupported: false,
            minimizeToTray: true,
            minimizeToTraySupported: false,
            autocompleteDelay:
                SettingsStore.getValueAt(SettingLevel.DEVICE, 'autocompleteDelay').toString(10),
            readMarkerInViewThresholdMs:
                SettingsStore.getValueAt(SettingLevel.DEVICE, 'readMarkerInViewThresholdMs').toString(10),
            readMarkerOutOfViewThresholdMs:
                SettingsStore.getValueAt(SettingLevel.DEVICE, 'readMarkerOutOfViewThresholdMs').toString(10),
            ...this._calculateThemeState(),
        };
    }

    async componentDidMount(): void {
        const platform = PlatformPeg.get();

        const autoLaunchSupported = await platform.supportsAutoLaunch();
        let autoLaunch = false;
        if (autoLaunchSupported) {
            autoLaunch = await platform.getAutoLaunchEnabled();
        }

        const alwaysShowMenuBarSupported = await platform.supportsAutoHideMenuBar();
        let alwaysShowMenuBar = true;
        if (alwaysShowMenuBarSupported) {
            alwaysShowMenuBar = !await platform.getAutoHideMenuBarEnabled();
        }

        const minimizeToTraySupported = await platform.supportsMinimizeToTray();
        let minimizeToTray = true;
        if (minimizeToTraySupported) {
            minimizeToTray = await platform.getMinimizeToTrayEnabled();
        }

        this.setState({
            autoLaunch,
            autoLaunchSupported,
            alwaysShowMenuBarSupported,
            alwaysShowMenuBar,
            minimizeToTraySupported,
            minimizeToTray,
        });
    }

    _calculateThemeState() {
        // We have to mirror the logic from ThemeWatcher.getEffectiveTheme so we
        // show the right values for things.

        const themeChoice = SettingsStore.getValueAt(SettingLevel.ACCOUNT, "theme");
        const systemThemeExplicit = SettingsStore.getValueAt(
            SettingLevel.DEVICE, "use_system_theme", null, false, true);
        const themeExplicit = SettingsStore.getValueAt(
            SettingLevel.DEVICE, "theme", null, false, true);

        // If the user has enabled system theme matching, use that.
        if (systemThemeExplicit) {
            return {
                theme: themeChoice,
                useSystemTheme: true,
            };
        }

        // If the user has set a theme explicitly, use that (no system theme matching)
        if (themeExplicit) {
            return {
                theme: themeChoice,
                useSystemTheme: false,
            };
        }

        // Otherwise assume the defaults for the settings
        return {
            theme: themeChoice,
            useSystemTheme: SettingsStore.getValueAt(SettingLevel.DEVICE, "use_system_theme"),
        };
    }

    _onAutoLaunchChange = (checked) => {
        PlatformPeg.get().setAutoLaunchEnabled(checked).then(() => this.setState({autoLaunch: checked}));
    };

    _onAlwaysShowMenuBarChange = (checked) => {
        PlatformPeg.get().setAutoHideMenuBarEnabled(!checked).then(() => this.setState({alwaysShowMenuBar: checked}));
    };

    _onMinimizeToTrayChange = (checked) => {
        PlatformPeg.get().setMinimizeToTrayEnabled(checked).then(() => this.setState({minimizeToTray: checked}));
    };

    _onAutocompleteDelayChange = (e) => {
        this.setState({autocompleteDelay: e.target.value});
        SettingsStore.setValue("autocompleteDelay", null, SettingLevel.DEVICE, e.target.value);
    };

    _onReadMarkerInViewThresholdMs = (e) => {
        this.setState({readMarkerInViewThresholdMs: e.target.value});
        SettingsStore.setValue("readMarkerInViewThresholdMs", null, SettingLevel.DEVICE, e.target.value);
    };

    _onReadMarkerOutOfViewThresholdMs = (e) => {
        this.setState({readMarkerOutOfViewThresholdMs: e.target.value});
        SettingsStore.setValue("readMarkerOutOfViewThresholdMs", null, SettingLevel.DEVICE, e.target.value);
    };

    _onThemeChange = (e) => {
        const newTheme = e.target.value;
        if (this.state.theme === newTheme) return;

        // doing getValue in the .catch will still return the value we failed to set,
        // so remember what the value was before we tried to set it so we can revert
        const oldTheme = SettingsStore.getValue('theme');
        SettingsStore.setValue("theme", null, SettingLevel.ACCOUNT, newTheme).catch(() => {
            dis.dispatch({action: 'recheck_theme'});
            this.setState({theme: oldTheme});
        });
        this.setState({theme: newTheme});
        // The settings watcher doesn't fire until the echo comes back from the
        // server, so to make the theme change immediately we need to manually
        // do the dispatch now
        // XXX: The local echoed value appears to be unreliable, in particular
        // when settings custom themes(!) so adding forceTheme to override
        // the value from settings.
        dis.dispatch({action: 'recheck_theme', forceTheme: newTheme});
    };

    _onAddCustomTheme = async () => {
        let currentThemes = SettingsStore.getValue("custom_themes");
        if (!currentThemes) currentThemes = [];
        currentThemes = currentThemes.map(c => c); // cheap clone

        if (this._themeTimer) {
            clearTimeout(this._themeTimer);
        }

        try {
            const r = await fetch(this.state.customThemeUrl);
            const themeInfo = await r.json();
            if (!themeInfo || typeof(themeInfo['name']) !== 'string' || typeof(themeInfo['colors']) !== 'object') {
                this.setState({customThemeMessage: {text: _t("Invalid theme schema."), isError: true}});
                return;
            }
            currentThemes.push(themeInfo);
        } catch (e) {
            console.error(e);
            this.setState({customThemeMessage: {text: _t("Error downloading theme information."), isError: true}});
            return; // Don't continue on error
        }

        await SettingsStore.setValue("custom_themes", null, SettingLevel.ACCOUNT, currentThemes);
        this.setState({customThemeUrl: "", customThemeMessage: {text: _t("Theme added!"), isError: false}});

        this._themeTimer = setTimeout(() => {
            this.setState({customThemeMessage: {text: "", isError: false}});
        }, 3000);
    };

    _onCustomThemeChange = (e) => {
        this.setState({customThemeUrl: e.target.value});
    };

    _onUseSystemThemeChanged = (checked) => {
        this.setState({useSystemTheme: checked});
        SettingsStore.setValue("use_system_theme", null, SettingLevel.DEVICE, checked);
        dis.dispatch({action: 'recheck_theme'});
    };

    _renderGroup(settingIds) {
        const SettingsFlag = sdk.getComponent("views.elements.SettingsFlag");
        return settingIds.map(i => <SettingsFlag key={i} name={i} level={SettingLevel.ACCOUNT} />);
    }

    _renderThemeSection() {
        const LabelledToggleSwitch = sdk.getComponent("views.elements.LabelledToggleSwitch");

        const themeWatcher = new ThemeWatcher();
        let systemThemeSection;
        if (themeWatcher.isSystemThemeSupported()) {
            systemThemeSection = <div>
                <LabelledToggleSwitch
                    value={this.state.useSystemTheme}
                    label={SettingsStore.getDisplayName("use_system_theme")}
                    onChange={this._onUseSystemThemeChanged}
                />
            </div>;
        }

        let customThemeForm;
        if (SettingsStore.isFeatureEnabled("feature_custom_themes")) {
            let messageElement = null;
            if (this.state.customThemeMessage.text) {
                if (this.state.customThemeMessage.isError) {
                    messageElement = <div className='text-error'>{this.state.customThemeMessage.text}</div>;
                } else {
                    messageElement = <div className='text-success'>{this.state.customThemeMessage.text}</div>;
                }
            }
            customThemeForm = (
                <div className='mx_SettingsTab_section'>
                    <form onSubmit={this._onAddCustomTheme}>
                        <Field
                            label={_t("Custom theme URL")}
                            type='text'
                            autoComplete="off"
                            onChange={this._onCustomThemeChange}
                            value={this.state.customThemeUrl}
                        />
                        <AccessibleButton
                            onClick={this._onAddCustomTheme}
                            type="submit" kind="primary_sm"
                            disabled={!this.state.customThemeUrl.trim()}
                        >{_t("Add theme")}</AccessibleButton>
                        {messageElement}
                    </form>
                </div>
            );
        }

        const themes = Object.entries(enumerateThemes())
            .map(p => ({id: p[0], name: p[1]})); // convert pairs to objects for code readability
        const builtInThemes = themes.filter(p => !p.id.startsWith("custom-"));
        const customThemes = themes.filter(p => !builtInThemes.includes(p))
            .sort((a, b) => a.name.localeCompare(b.name));
        const orderedThemes = [...builtInThemes, ...customThemes];
        return (
            <div className="mx_SettingsTab_section mx_GeneralUserSettingsTab_themeSection">
                <span className="mx_SettingsTab_subheading">{_t("Theme")}</span>
                {systemThemeSection}
                <Field label={_t("Theme")} element="select"
                       value={this.state.theme} onChange={this._onThemeChange}
                       disabled={this.state.useSystemTheme}
                >
                    {orderedThemes.map(theme => {
                        return <option key={theme.id} value={theme.id}>{theme.name}</option>;
                    })}
                </Field>
                {customThemeForm}
            </div>
        );
    }

    render() {
        let autoLaunchOption = null;
        if (this.state.autoLaunchSupported) {
            autoLaunchOption = <LabelledToggleSwitch
                value={this.state.autoLaunch}
                onChange={this._onAutoLaunchChange}
                label={_t('Start automatically after system login')} />;
        }

        let autoHideMenuOption = null;
        if (this.state.alwaysShowMenuBarSupported) {
            autoHideMenuOption = <LabelledToggleSwitch
                value={this.state.alwaysShowMenuBar}
                onChange={this._onAlwaysShowMenuBarChange}
                label={_t('Always show the window menu bar')} />;
        }

        let minimizeToTrayOption = null;
        if (this.state.minimizeToTraySupported) {
            minimizeToTrayOption = <LabelledToggleSwitch
                value={this.state.minimizeToTray}
                onChange={this._onMinimizeToTrayChange}
                label={_t('Show tray icon and minimize window to it on close')} />;
        }

        return (
            <div className="mx_SettingsTab mx_PreferencesUserSettingsTab">
                <div className="mx_SettingsTab_heading">{_t("Preferences")}</div>

                {this._renderThemeSection()}

                <div className="mx_SettingsTab_section">
                    <span className="mx_SettingsTab_subheading">{_t("Room list")}</span>
                    {this._renderGroup(PreferencesUserSettingsTab.ROOM_LIST_SETTINGS)}
                </div>

                <div className="mx_SettingsTab_section">
                    <span className="mx_SettingsTab_subheading">{_t("Composer")}</span>
                    {this._renderGroup(PreferencesUserSettingsTab.COMPOSER_SETTINGS)}
                </div>

                <div className="mx_SettingsTab_section">
                    <span className="mx_SettingsTab_subheading">{_t("Timeline")}</span>
                    {this._renderGroup(PreferencesUserSettingsTab.TIMELINE_SETTINGS)}
                </div>

                <div className="mx_SettingsTab_section">
                    <span className="mx_SettingsTab_subheading">{_t("Advanced")}</span>
                    {this._renderGroup(PreferencesUserSettingsTab.ADVANCED_SETTINGS)}
                    {minimizeToTrayOption}
                    {autoHideMenuOption}
                    {autoLaunchOption}
                    <Field
                        label={_t('Autocomplete delay (ms)')}
                        type='number'
                        value={this.state.autocompleteDelay}
                        onChange={this._onAutocompleteDelayChange} />
                    <Field
                        label={_t('Read Marker lifetime (ms)')}
                        type='number'
                        value={this.state.readMarkerInViewThresholdMs}
                        onChange={this._onReadMarkerInViewThresholdMs} />
                    <Field
                        label={_t('Read Marker off-screen lifetime (ms)')}
                        type='number'
                        value={this.state.readMarkerOutOfViewThresholdMs}
                        onChange={this._onReadMarkerOutOfViewThresholdMs} />
                </div>
            </div>
        );
    }
}
