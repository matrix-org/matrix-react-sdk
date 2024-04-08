/*
Copyright 2022 The Matrix.org Foundation C.I.C.
Copyright 2024 Ed Geraghty <ed@geraghty.family>

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

import { Method } from "matrix-js-sdk/src/matrix";
import { logger } from "matrix-js-sdk/src/logger";

import SettingController from "./SettingController";
import PlatformPeg from "../../PlatformPeg";
import { SettingLevel } from "../SettingLevel";
import SettingsStore from "../SettingsStore";
import { _t } from "../../languageHandler";
import { MatrixClientPeg } from "../../MatrixClientPeg";

export default class SlidingSyncController extends SettingController {
    /**
     * Check if the server declares support for sliding sync via a proxy in its client
     * `.well-known`, and check that the endpoint is, in fact, a sliding sync endpoint.
     * @return {boolean} Whether the client well-known contains working proxy url
     */
    private async proxySlidingSyncSupport(): Promise<boolean> {
        const clientWellKnown = MatrixClientPeg.safeGet().getClientWellKnown();
        const proxyUrl = clientWellKnown?.["org.matrix.msc3575.proxy"]?.url;
        return proxyUrl != undefined;
    }

    /**
     * Check if the server "natively" supports sliding sync (at the unstable endpoint),
     * and check that the endpoint is, in fact, a sliding sync endpoint.
     * @return {boolean} Whether the "native" (unstable) endpoint is up
     */
    private async nativeSlidingSyncSupport(): Promise<boolean> {
        const cli = MatrixClientPeg.safeGet();
        return cli.http.authedRequest(Method.Post, "/sync", undefined, undefined, {
            localTimeoutMs: 10 * 1000, // 10s
            prefix: "/_matrix/client/unstable/org.matrix.msc3575",
        });
    }

    /**
     * Check whether our homeserver has sliding sync support, that the endpoint is up, and
     * is a sliding sync endpoint.
     * @return {boolean} Whether the server has a working sliding sync implementation
     */
    private async slidingSyncHealthCheck(): Promise<boolean> {
        let baseUrl: String
        if (await this.proxySlidingSyncSupport()) {
            baseUrl = MatrixClientPeg.safeGet().getClientWellKnown()?.["org.matrix.msc3575.proxy"]!.url;
        }
        else if (await this.nativeSlidingSyncSupport()) {
            baseUrl = MatrixClientPeg.safeGet().getHomeserverUrl();
        }
        else {
            return false;
        }

        const controller = new AbortController();
        const id = window.setTimeout(() => controller.abort(), 10 * 1000); // 10s
        const res = await fetch(baseUrl + "/client/server.json", {
            signal: controller.signal,
        });
        clearTimeout(id);
        logger.info("slidingSyncHealthCheck: sliding sync endpoint is up");
        return (res.status === 200)
    }

    public async beforeChange(level: SettingLevel, roomId: string, newValue: any): Promise<boolean> {
        const value = await this.slidingSyncHealthCheck();
        return newValue === value; // abort the operation if we're already in the state the user chose via modal
    }

    public async onChange(): Promise<void> {
        PlatformPeg.get()?.reload();
    }

    public get settingDisabled(): boolean | string {
        // Cannot be disabled once enabled, user has been warned and must log out and back in.
        if (SettingsStore.getValue("feature_sliding_sync")) {
            return _t("labs|sliding_sync_disabled_notice");
        }
        if (!this.slidingSyncHealthCheck()) {
            return _t("labs|sliding_sync_disabled_notice");
        }

        return false;
    }
}
