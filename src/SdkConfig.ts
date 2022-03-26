/*
Copyright 2016 OpenMarket Ltd
Copyright 2019 - 2022 The Matrix.org Foundation C.I.C.

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

import { Optional } from "matrix-events-sdk";

import { SnakedObject } from "./utils/SnakedObject";
import { IConfigOptions, ISsoRedirectOptions } from "./IConfigOptions";
import { KeysWithObjectShape } from "./@types/common";

// see element-web config.md for docs, or the IConfigOptions interface for dev docs
export const DEFAULTS: IConfigOptions = {
    brand: "Element",
    integrations_ui_url: "https://scalar.vector.im/",
    integrations_rest_url: "https://scalar.vector.im/api",
    bug_report_endpoint_url: null,
    jitsi: {
        preferred_domain: "meet.element.io",
    },

    // @ts-ignore - we deliberately use the camelCase version here so we trigger
    // the fallback behaviour. If we used the snake_case version then we'd break
    // everyone's config which has the camelCase property because our default would
    // be preferred over their config.
    desktopBuilds: {
        available: true,
        logo: require("../res/img/element-desktop-logo.svg").default,
        url: "https://element.io/get-started",
    },
    spaces_learn_more_url: "https://element.io/blog/spaces-blast-out-of-beta/",
};

export default class SdkConfig {
    private static instance: IConfigOptions;
    private static fallback: SnakedObject<IConfigOptions>;

    private static setInstance(i: IConfigOptions) {
        SdkConfig.instance = i;
        SdkConfig.fallback = new SnakedObject(i);

        // For debugging purposes
        window.mxReactSdkConfig = i;
    }

    public static get(): IConfigOptions;
    public static get<K extends keyof IConfigOptions>(key: K, altCaseName?: string): IConfigOptions[K];
    public static get<K extends keyof IConfigOptions = never>(
        key?: K, altCaseName?: string,
    ): IConfigOptions | IConfigOptions[K] {
        if (key === undefined) {
            // safe to cast as a fallback - we want to break the runtime contract in this case
            return SdkConfig.instance || <IConfigOptions>{};
        }
        return SdkConfig.fallback.get(key, altCaseName);
    }

    public static getObject<K extends KeysWithObjectShape<IConfigOptions>>(
        key: K, altCaseName?: string,
    ): Optional<SnakedObject<IConfigOptions[K]>> {
        const val = SdkConfig.get(key, altCaseName);
        if (val !== null && val !== undefined) {
            return new SnakedObject(val);
        }

        // return the same type for sensitive callers (some want `undefined` specifically)
        return val === undefined ? undefined : null;
    }

    public static put(cfg: IConfigOptions) {
        const defaultKeys = Object.keys(DEFAULTS);
        for (let i = 0; i < defaultKeys.length; ++i) {
            if (cfg[defaultKeys[i]] === undefined) {
                cfg[defaultKeys[i]] = DEFAULTS[defaultKeys[i]];
            }
        }
        SdkConfig.setInstance(cfg);
    }

    /**
     * Resets the config to be completely empty.
     */
    public static unset() {
        SdkConfig.setInstance(<IConfigOptions>{}); // safe to cast - defaults will be applied
    }

    public static add(cfg: Partial<IConfigOptions>) {
        const liveConfig = SdkConfig.get();
        const newConfig = Object.assign({}, liveConfig, cfg);
        SdkConfig.put(newConfig);
    }
}

export function parseSsoRedirectOptions(config: IConfigOptions): ISsoRedirectOptions {
    // Ignore deprecated options if the config is using new ones
    if (config.sso_redirect_options) return config.sso_redirect_options;

    // We can cheat here because the default is false anyways
    if (config.sso_immediate_redirect) return { immediate: true };

    // Default: do nothing
    return {};
}
