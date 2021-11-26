/*
Copyright 2019 Michael Telatynski <7t3chguy@gmail.com>
Copyright 2019 The Matrix.org Foundation C.I.C.

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

import SettingsStore from "./settings/SettingsStore"
import ThemeWatcher from "./settings/watchers/ThemeWatcher";

interface IFontFaces {
    src: {
        format: string;
        url: string;
        local: string;
    }[];
}

export class Theme {

    static HIGH_CONTRAST_THEMES = {
        'light': 'light-high-contrast',
    };

    themeName: string;

    constructor(themeName: string) {
        this.themeName = themeName;
    }

    /**
     * Given a non-high-contrast theme, find the corresponding high-contrast one
     * if it exists, or return undefined if not.
     */
    public get highContrast(): string {
        return Theme.HIGH_CONTRAST_THEMES[this.themeName];
    }

    /**
     * Given a high-contrast theme, find the corresponding non-high-contrast one
     * if it exists, or return undefined if not.
     */
    public get nonHighContrast(): string {
        for (const theme in Theme.HIGH_CONTRAST_THEMES) {
            if (Theme.HIGH_CONTRAST_THEMES[theme] === this.themeName) {
                return theme;
            }
        }
    }

    /**
     * Decide whether the supplied theme is high contrast.
     */
    public get isHighContrast(): boolean {
        return Object.values(Theme.HIGH_CONTRAST_THEMES).includes(this.themeName);
    }

}

export class CustomTheme extends Theme {

    colors: {
        [key: string]: string;
    };
    fonts: {
        faces: IFontFaces[];
        general: string;
        monospace: string;
    };
    is_dark?: boolean; // eslint-disable-line camelcase

    public constructor(themeName: string) {
        super(themeName)

        // getCustomTheme(themeName: string): ICustomTheme
        // set css variables
        const customThemes = ThemeWatcher.customThemes;
        if (!customThemes) {
            throw new Error(`No custom themes set, can't set custom theme '${this.themeName}'`);
        }
        const customTheme = customThemes.find(t => t.name === this.themeName);
        if (!customTheme) {
            const knownNames = customThemes.map(t => t.name).join(', ');
            throw new Error(`Can't find custom theme '${this.themeName}', only know ${knownNames}`);
        }

        const { style } = document.body;

        function setCSSColorVariable(name, hexColor, doPct = true) {
            style.setProperty(`--${name}`, hexColor);
            if (doPct) {
                // uses #rrggbbaa to define the color with alpha values at 0%, 15% and 50%
                style.setProperty(`--${name}-0pct`, hexColor + "00");
                style.setProperty(`--${name}-15pct`, hexColor + "26");
                style.setProperty(`--${name}-50pct`, hexColor + "7F");
            }
        }

        if (customTheme.colors) {
            for (const [name, value] of Object.entries(customTheme.colors)) {
                if (Array.isArray(value)) {
                    for (let i = 0; i < value.length; i += 1) {
                        setCSSColorVariable(`${name}_${i}`, value[i], false);
                    }
                } else {
                    setCSSColorVariable(name, value);
                }
            }
        }
        if (customTheme.fonts) {
            const { fonts } = customTheme;
            if (fonts.faces) {
                const css = CustomTheme.generateCustomFontFaceCSS(fonts.faces);
                const style = document.createElement("style");
                style.setAttribute("title", "custom-theme-font-faces");
                style.setAttribute("type", "text/css");
                style.appendChild(document.createTextNode(css));
                document.head.appendChild(style);
            }
            if (fonts.general) {
                style.setProperty("--font-family", fonts.general);
            }
            if (fonts.monospace) {
                style.setProperty("--font-family-monospace", fonts.monospace);
            }
        }
    }

    private static generateCustomFontFaceCSS(faces: IFontFaces[]): string {

        const allowedFontFaceProps = [
            'font-display',
            'font-family',
            'font-stretch',
            'font-style',
            'font-weight',
            'font-variant',
            'font-feature-settings',
            'font-variation-settings',
            'src',
            'unicode-range',
        ];

        return faces.map(face => {
            const src = face.src && face.src.map(srcElement => {
                let format;
                if (srcElement.format) {
                    format = `format("${srcElement.format}")`;
                }
                if (srcElement.url) {
                    return `url("${srcElement.url}") ${format}`;
                } else if (srcElement.local) {
                    return `local("${srcElement.local}") ${format}`;
                }
                return "";
            }).join(", ");
            const props = Object.keys(face).filter(prop => allowedFontFaceProps.includes(prop));
            const body = props.map(prop => {
                let value;
                if (prop === "src") {
                    value = src;
                } else if (prop === "font-family") {
                    value = `"${face[prop]}"`;
                } else {
                    value = face[prop];
                }
                return `${prop}: ${value}`;
            }).join(";");
            return `@font-face {${body}}`;
        }).join("\n");
    }
}