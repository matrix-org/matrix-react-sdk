/*
Copyright 2019 Michael Telatynski <7t3chguy@gmail.com>
Copyright 2019, 2020 The Matrix.org Foundation C.I.C.

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

import { Action } from '../../dispatcher/actions';
import { ActionPayload } from '../../dispatcher/payloads';
import dis from '../../dispatcher/dispatcher';
import { CustomTheme } from "../../Theme";
import { SETTINGS } from '../Settings';
import SettingsStore from '../SettingsStore';
import { SettingLevel } from '../SettingLevel';
import { _t } from '../../languageHandler';
import { Theme } from '../../Theme';
import ThemeController from '../controllers/ThemeController';

import { logger } from 'matrix-js-sdk/src/logger';

interface IThemeWatcherOpts {
    sanitized?: boolean
    newInstance?: boolean
}

export default class ThemeWatcher {

    private static instance_: ThemeWatcher;

    private themeWatchRef: string;
    private systemThemeWatchRef: string;
    private dispatcherRef: string;

    private preferDark: MediaQueryList;
    private preferLight: MediaQueryList;
    private preferHighContrast: MediaQueryList;

    private initialTheme: string;

    static BUILTIN_THEMES = {
        'light': _t('Light'),
        'light-high-contrast': _t('Light high contrast'),
        'dark': _t('Dark'),
    };

    public static get availableThemes(): {[key: string]: string} {
        const customThemes = SettingsStore.getValue('custom_themes');
        const customThemeNames = {};
        for (const { name } of customThemes) {
            customThemeNames[`custom-${name}`] = name;
        }
        return Object.assign({}, customThemeNames, ThemeWatcher.BUILTIN_THEMES);
    }

    public static get customThemes() {
        return SettingsStore.getValue('custom_themes')
    }

    public static currentTheme(opts: IThemeWatcherOpts = {}): string {
        // Dev note: Much of this logic is replicated in the AppearanceUserSettingsTab

        // If the user has specifically enabled the system matching option (excluding default),
        // then use that over anything else. We pick the lowest possible level for the setting
        // to ensure the ordering otherwise works.
        if (ThemeWatcher.instance(opts).useSystemTheme) {
            logger.log('returning explicit system theme');
            const theme = ThemeWatcher.instance(opts).systemTheme();
            if (theme) {
                return theme;
            }
        }

        // If the user has specifically enabled the theme (without the system matching option being
        // enabled specifically and excluding the default), use that theme. We pick the lowest possible
        // level for the setting to ensure the ordering otherwise works.
        const settingsTheme = ThemeWatcher.instance(opts).settingsTheme();
        if (settingsTheme) {
            logger.log('returning explicit theme: ' + settingsTheme);
            return settingsTheme;
        }

        // If the above didn't work, try again sanitized
        if (!opts.sanitized) {
            return ThemeWatcher.currentTheme({ sanitized: true });
        }

        // You really shouldn't be able to get this far,
        // since 'sanitized' returns default values
    }

    public static instance(opts: IThemeWatcherOpts = {}): ThemeWatcher {
        if (opts.newInstance || !ThemeWatcher.instance_) {
            ThemeWatcher.instance_ = new ThemeWatcher();
        }
        return ThemeWatcher.instance_;
    }

    public static newInstance(opts: IThemeWatcherOpts = {}): ThemeWatcher {
        return ThemeWatcher.instance({ newInstance: true });
    }

    public static isDarkTheme(opts: IThemeWatcherOpts = {}): boolean {
        if (ThemeWatcher.instance(opts).useSystemTheme) {
            return ThemeWatcher.instance(opts).preferDark.matches;
        } else {
            const theme = ThemeWatcher.instance(opts).settingsTheme();
            if (theme.startsWith('custom-')) {
                return new CustomTheme(theme.substring('custom-'.length)).is_dark;
            }
            return theme === ThemeWatcher.instance(opts).settingsDarkTheme();
        }
    }

    public static isHighContrast(opts: IThemeWatcherOpts = {}): boolean {
        if (ThemeWatcher.instance(opts).useSystemTheme) {
            return ThemeWatcher.instance(opts).preferHighContrast.matches;
        } else {
            const theme = ThemeWatcher.instance(opts).settingsTheme();
            if (theme.startsWith('custom-')) {
                return false;
            }
            return new Theme(theme).isHighContrast;
        }
    }

    // This allows both:
    // * deferring the default dark theme to the settings schema
    // * adding alternate dark themes later
    private settingsDarkTheme(opts: IThemeWatcherOpts = {}): string {
        if (opts.sanitized) {
            return SETTINGS['dark_theme'].default;
        }
        return SettingsStore.getValue('dark_theme');
    }

    // This allows both:
    // * deferring the default dark theme to the settings schema
    // * adding alternate dark themes later
    private settingsLightTheme(opts: IThemeWatcherOpts = {}): string {
        if (opts.sanitized) {
            return SETTINGS['light_theme'].default;
        }
        return SettingsStore.getValue('light_theme');
    }

    private settingsTheme(opts: IThemeWatcherOpts = {}): string {
        let theme = SettingsStore.getValueAt(
            SettingLevel.DEVICE, 'theme', null, false, true);

        if (theme.startsWith('custom-')) {
            if (theme.contains('light') || !new CustomTheme(theme.substr(7)).is_dark) {
                return ThemeWatcher.instance(opts).settingsLightTheme();
            } else {
                return ThemeWatcher.instance(opts).settingsDarkTheme();
            }
        }

        return theme;
    }

    public static supportsSystemTheme(opts: IThemeWatcherOpts = {}): boolean {
        return ThemeWatcher.instance(opts).preferDark.matches || ThemeWatcher.instance(opts).preferLight.matches;
    }

    private systemTheme(opts: IThemeWatcherOpts = {}): string {
        let newTheme: string;
        // default to dark for historical reasons
        // preferHighContrast only supports light for now
        if (ThemeWatcher.instance(opts).preferLight.matches || ThemeWatcher.instance(opts).preferHighContrast.matches) {
            newTheme = ThemeWatcher.instance(opts).settingsLightTheme();
        } else {
            newTheme = ThemeWatcher.instance(opts).settingsDarkTheme();
        }
        if (ThemeWatcher.instance(opts).preferHighContrast.matches && !opts.sanitized) {
            const hcTheme = new Theme(newTheme).highContrast;
            if (hcTheme) {
                newTheme = hcTheme;
            }
        }
        return newTheme;
    }

    private get useSystemTheme(): boolean {
        return SettingsStore.getValueAt(SettingLevel.DEVICE, 'use_system_theme', null, false, true)
    }

    private constructor() {
        this.themeWatchRef = null;
        this.systemThemeWatchRef = null;
        this.dispatcherRef = null;

        // we have both here as each may either match or not match, so by having both
        // we can get the tristate of dark/light/unsupported
        this.preferDark = (<any>global).matchMedia("(prefers-color-scheme: dark)");
        this.preferLight = (<any>global).matchMedia("(prefers-color-scheme: light)");
        this.preferHighContrast = (<any>global).matchMedia("(prefers-contrast: more)");

        this.initialTheme = ThemeWatcher.currentTheme();
    }

    public start(opts: IThemeWatcherOpts = {}) {
        ThemeWatcher.instance(opts).themeWatchRef = SettingsStore.watchSetting('theme', null, ThemeWatcher.instance(opts).onChange);
        ThemeWatcher.instance(opts).systemThemeWatchRef = SettingsStore.watchSetting('use_system_theme', null, ThemeWatcher.instance(opts).onChange);
        if (ThemeWatcher.instance(opts).preferDark.addEventListener) {
            ThemeWatcher.instance(opts).preferDark.addEventListener('change', ThemeWatcher.instance(opts).onChange);
            ThemeWatcher.instance(opts).preferLight.addEventListener('change', ThemeWatcher.instance(opts).onChange);
            ThemeWatcher.instance(opts).preferHighContrast.addEventListener('change', ThemeWatcher.instance(opts).onChange);
        }
        ThemeWatcher.instance(opts).dispatcherRef = dis.register(ThemeWatcher.instance(opts).onAction);
    }

    public stop() {
        if (ThemeWatcher.instance().preferDark.addEventListener) {
            ThemeWatcher.instance().preferDark.removeEventListener('change', ThemeWatcher.instance().onChange);
            ThemeWatcher.instance().preferLight.removeEventListener('change', ThemeWatcher.instance().onChange);
            ThemeWatcher.instance().preferHighContrast.removeEventListener('change', ThemeWatcher.instance().onChange);
        }
        SettingsStore.unwatchSetting(ThemeWatcher.instance().systemThemeWatchRef);
        SettingsStore.unwatchSetting(ThemeWatcher.instance().themeWatchRef);
        dis.unregister(ThemeWatcher.instance().dispatcherRef);
    }

    private onAction = (payload: ActionPayload) => {
        if (payload.action === Action.RecheckTheme) {
            // XXX forceTheme
            ThemeWatcher.instance().recheck(payload.forceTheme);
        }
    };

    private onChange = () => {
        ThemeWatcher.instance().recheck();
    };

    // XXX: forceTheme param added here as local echo appears to be unreliable
    // https://github.com/vector-im/element-web/issues/11443
    public recheck(forceTheme?: string) {
        const oldTheme = ThemeWatcher.instance().initialTheme;
        ThemeWatcher.instance().initialTheme = forceTheme === undefined ? ThemeWatcher.currentTheme() : forceTheme;
        if (oldTheme !== ThemeWatcher.instance().initialTheme) {
            ThemeController.setTheme(ThemeWatcher.instance().initialTheme);
        }
    }
}
