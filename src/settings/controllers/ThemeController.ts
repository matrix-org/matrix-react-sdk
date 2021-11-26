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

import { CustomTheme } from "../../Theme"
import SettingController from "./SettingController";
import { SettingLevel } from "../SettingLevel";
import ThemeWatcher from "../watchers/ThemeWatcher"

export default class ThemeController extends SettingController {

    public constructor() {
        super()
    }

    public getValueOverride(
        level: SettingLevel,
        roomId: string,
        calculatedValue: any,
        calculatedAtLevel: SettingLevel,
    ): any {
        if (!calculatedValue) return null; // Don't override null themes

        const themes = ThemeWatcher.availableThemes;

        // Override in case some no longer supported theme is stored here
        if (!themes[calculatedValue]) {
            return ThemeWatcher.currentTheme();
        }

        return null; // no override
    }

    /**
     * Called whenever someone changes the theme
     * Async function that returns once the theme has been set
     * (ie. the CSS has been loaded)
     *
     * @param {string} theme new theme
     */
    public static async setTheme(theme?: string): Promise<void> {
        if (!theme) {
            theme = ThemeWatcher.currentTheme();
        }
        ThemeController.clearCustomTheme();
        let stylesheetName = theme;
        if (theme.startsWith("custom-")) {
            stylesheetName = new CustomTheme(theme.substr(7)).is_dark ? "dark-custom" : "light-custom";
        }

        // look for the stylesheet elements.
        // styleElements is a map from style name to HTMLLinkElement.
        const styleElements = Object.create(null);
        const themes = Array.from(document.querySelectorAll('[data-mx-theme]'));
        themes.forEach(theme => {
            styleElements[theme.attributes['data-mx-theme'].value.toLowerCase()] = theme;
        });

        if (!(stylesheetName in styleElements)) {
            throw new Error("Unknown theme " + stylesheetName);
        }

        // disable all of them first, then enable the one we want. Chrome only
        // bothers to do an update on a true->false transition, so this ensures
        // that we get exactly one update, at the right time.
        //
        // ^ This comment was true when we used to use alternative stylesheets
        // for the CSS.  Nowadays we just set them all as disabled in index.html
        // and enable them as needed.  It might be cleaner to disable them all
        // at the same time to prevent loading two themes simultaneously and
        // having them interact badly... but this causes a flash of unstyled app
        // which is even uglier.  So we don't.

        styleElements[stylesheetName].disabled = false;

        return new Promise((resolve) => {
            const switchTheme = function() {
                // we re-enable our theme here just in case we raced with another
                // theme set request as per https://github.com/vector-im/element-web/issues/5601.
                // We could alternatively lock or similar to stop the race, but
                // this is probably good enough for now.
                styleElements[stylesheetName].disabled = false;
                Object.values(styleElements).forEach((a: HTMLStyleElement) => {
                    if (a == styleElements[stylesheetName]) return;
                    a.disabled = true;
                });
                const bodyStyles = global.getComputedStyle(document.body);
                if (bodyStyles.backgroundColor) {
                    const metaElement: HTMLMetaElement = document.querySelector('meta[name="theme-color"]');
                    metaElement.content = bodyStyles.backgroundColor;
                }
                resolve();
            };

            // turns out that Firefox preloads the CSS for link elements with
            // the disabled attribute, but Chrome doesn't.

            let cssLoaded = false;

            styleElements[stylesheetName].onload = () => {
                switchTheme();
            };

            for (let i = 0; i < document.styleSheets.length; i++) {
                const ss = document.styleSheets[i];
                if (ss && ss.href === styleElements[stylesheetName].href) {
                    cssLoaded = true;
                    break;
                }
            }

            if (cssLoaded) {
                styleElements[stylesheetName].onload = undefined;
                switchTheme();
            }
        });
    }

    private static clearCustomTheme(): void {
        // remove all css variables, we assume these are there because of the custom theme
        const inlineStyleProps = Object.values(document.body.style);
        for (const prop of inlineStyleProps) {
            if (prop.startsWith("--")) {
                document.body.style.removeProperty(prop);
            }
        }
        const customFontFaceStyle = document.querySelector("head > style[title='custom-theme-font-faces']");
        if (customFontFaceStyle) {
            customFontFaceStyle.remove();
        }
    }
}
