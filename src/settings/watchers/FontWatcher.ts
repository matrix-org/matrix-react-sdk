/*
Copyright 2020 - 2023 The Matrix.org Foundation C.I.C.

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

import dis from "../../dispatcher/dispatcher";
import SettingsStore from "../SettingsStore";
import IWatcher from "./Watcher";
import { toPx } from "../../utils/units";
import { Action } from "../../dispatcher/actions";
import { SettingLevel } from "../SettingLevel";
import { UpdateSystemFontPayload } from "../../dispatcher/payloads/UpdateSystemFontPayload";
import { ActionPayload } from "../../dispatcher/payloads";
import { clamp } from "../../utils/numbers";

export class FontWatcher implements IWatcher {
    /**
     * This Compound value is using `100%` of the default browser font size.
     * It allows EW to use the browser's default font size instead of a fixed value.
     * All the Compound font size are using `rem`, they are relative to the root font size
     * and therefore of the browser font size.
     */
    private static readonly DEFAULT_SIZE = "var(--cpd-font-size-root)";
    /**
     * Default delta added to the ${@link DEFAULT_SIZE}
     */
    public static readonly DEFAULT_DELTA = 0;
    /**
     * The lowest value that can be added to the ${@link DEFAULT_SIZE}
     */
    public static readonly MIN_DELTA = -5;
    /**
     * The highest value that can be added to the ${@link DEFAULT_SIZE}
     */
    public static readonly MAX_DELTA = 5;

    private dispatcherRef: string | null;

    public constructor() {
        this.dispatcherRef = null;
    }

    public async start(): Promise<void> {
        this.updateFont();
        this.dispatcherRef = dis.register(this.onAction);
        /**
         * TODO To change before review
         * baseFontSize is an account level setting which is loaded after the initial
         * sync. Hence why we can't do that in the `constructor`
         */
        await this.migrateBaseFontSize();
    }

    /**
     * Migrating the old `baseFontSize` for Compound.
     * Everything will becomes slightly larger, and getting rid of the `SIZE_DIFF`
     * weirdness for locally persisted values
     */
    private async migrateBaseFontSize(): Promise<void> {
        const legacyBaseFontSize = SettingsStore.getValue("baseFontSize");
        if (legacyBaseFontSize) {
            console.log("Migrating base font size for Compound, current value", legacyBaseFontSize);

            // For some odd reason, the persisted value in user storage has an offset
            // of 5 pixels for all values stored under `baseFontSize`
            const LEGACY_SIZE_DIFF = 5;
            // Compound uses a base font size of `16px`, whereas the old Element
            // styles based their calculations off a `15px` root font size.
            const ROOT_FONT_SIZE_INCREASE = 1;

            const baseFontSize = legacyBaseFontSize + ROOT_FONT_SIZE_INCREASE + LEGACY_SIZE_DIFF;

            await SettingsStore.setValue("baseFontSizeV2", null, SettingLevel.DEVICE, baseFontSize);
            await SettingsStore.setValue("baseFontSize", null, SettingLevel.DEVICE, "");
            console.log("Migration complete, deleting legacy `baseFontSize`");
        }
    }

    public stop(): void {
        if (!this.dispatcherRef) return;
        dis.unregister(this.dispatcherRef);
    }

    private updateFont(): void {
        this.setRootFontSize(SettingsStore.getValue<number>("baseFontSizeV3"));
        this.setSystemFont({
            useBundledEmojiFont: SettingsStore.getValue("useBundledEmojiFont"),
            useSystemFont: SettingsStore.getValue("useSystemFont"),
            font: SettingsStore.getValue("systemFont"),
        });
    }

    private onAction = (payload: ActionPayload): void => {
        if (payload.action === Action.MigrateBaseFontSize) {
            // TODO Migration to v3
            this.migrateBaseFontSize();
        } else if (payload.action === Action.UpdateFontSizeDeltaSize) {
            this.setRootFontSize(payload.delta);
        } else if (payload.action === Action.UpdateSystemFont) {
            this.setSystemFont(payload as UpdateSystemFontPayload);
        } else if (payload.action === Action.OnLoggedOut) {
            // Clear font overrides when logging out
            this.setRootFontSize(FontWatcher.DEFAULT_DELTA);
            this.setSystemFont({
                useBundledEmojiFont: false,
                useSystemFont: false,
                font: "",
            });
        } else if (payload.action === Action.OnLoggedIn) {
            // Font size can be saved on the account, so grab value when logging in
            this.updateFont();
        }
    };

    private setRootFontSize = async (delta: number): Promise<void> => {
        // Check that the new delta doesn't exceed the limits
        const fontDelta = clamp(delta, FontWatcher.MIN_DELTA, FontWatcher.MAX_DELTA);

        if (fontDelta !== delta) {
            await SettingsStore.setValue("baseFontSizeV3", null, SettingLevel.DEVICE, fontDelta);
        }

        // Add the delta to the browser default font size
        document.querySelector<HTMLElement>(":root")!.style.fontSize =
            `calc(${FontWatcher.DEFAULT_SIZE} + ${toPx(fontDelta)})`;
    };

    public static readonly FONT_FAMILY_CUSTOM_PROPERTY = "--cpd-font-family-sans";
    public static readonly EMOJI_FONT_FAMILY_CUSTOM_PROPERTY = "--emoji-font-family";
    public static readonly BUNDLED_EMOJI_FONT = "Twemoji";

    private setSystemFont = ({
        useBundledEmojiFont,
        useSystemFont,
        font,
    }: Pick<UpdateSystemFontPayload, "useBundledEmojiFont" | "useSystemFont" | "font">): void => {
        if (useSystemFont) {
            let fontString = font
                .split(",")
                .map((font) => {
                    font = font.trim();
                    if (!font.startsWith('"') && !font.endsWith('"')) {
                        font = `"${font}"`;
                    }
                    return font;
                })
                .join(",");

            if (useBundledEmojiFont) {
                fontString += ", " + FontWatcher.BUNDLED_EMOJI_FONT;
            }

            /**
             * Overrides the default font family from Compound
             * Make sure that fonts with spaces in their names get interpreted properly
             */
            document.body.style.setProperty(FontWatcher.FONT_FAMILY_CUSTOM_PROPERTY, fontString);
        } else {
            document.body.style.removeProperty(FontWatcher.FONT_FAMILY_CUSTOM_PROPERTY);

            if (useBundledEmojiFont) {
                document.body.style.setProperty(
                    FontWatcher.EMOJI_FONT_FAMILY_CUSTOM_PROPERTY,
                    FontWatcher.BUNDLED_EMOJI_FONT,
                );
            } else {
                document.body.style.removeProperty(FontWatcher.EMOJI_FONT_FAMILY_CUSTOM_PROPERTY);
            }
        }
    };
}
