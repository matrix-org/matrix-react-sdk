/*
Copyright 2022 The Matrix.org Foundation C.I.C.

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
import { SlidingSyncOptionsDialog } from "../../components/views/dialogs/SlidingSyncOptionsDialog";
import Modal from "../../Modal";
import SettingsStore from "../SettingsStore";
import { _t } from "../../languageHandler";
import { MatrixClientPeg } from "../../MatrixClientPeg";

export default class SlidingSyncController extends SettingController {
    /**
     * Check if the server declares support for sliding sync via a proxy in its client `.well-known`.
     * @throws if the proxy server is unreachable or not configured to the given homeserver
     */
    private async proxySlidingSyncSupportCheck(): Promise<void> {
        const clientWellKnown = MatrixClientPeg.safeGet().getClientWellKnown();
        const proxyUrl = clientWellKnown?.["org.matrix.msc3575.proxy"]?.url;
        if (proxyUrl == undefined) {
            throw new Error(`proxySlidingSyncSupportCheck: no proxy defined in our client well-known`);
        }
        logger.info("proxySlidingSyncSupportCheck: server defines a sliding sync proxy");
    }

    /**
     * Check if the server natively supports sliding sync.
     * @throws if the server is unreachable or doesn't natively support sliding sync
     */
    private async nativeSlidingSyncSupportCheck(): Promise<void> {
        const cli = MatrixClientPeg.safeGet();
        await cli.http.authedRequest(Method.Post, "/sync", undefined, undefined, {
            localTimeoutMs: 10 * 1000, // 10s
            prefix: "/_matrix/client/unstable/org.matrix.msc3575",
        });
        logger.info("nativeSlidingSyncSupportCheck: server natively supports sliding sync");
    }

    /**
     * Check that the sliding sync endpoint is in fact a sliding sync endpoint and is up
     * @param endpoint The proxy endpoint url
     * @throws if the endpoint is unreachable
     */
    private async slidingSyncHealthCheck(endpoint: string): Promise<void> {
        const controller = new AbortController();
        const id = window.setTimeout(() => controller.abort(), 10 * 1000); // 10s
        const res = await fetch(endpoint + "/client/server.json", {
            signal: controller.signal,
        });
        clearTimeout(id);
        if (res.status != 200) {
            throw new Error(`slidingSyncHealthCheck: endpoint returned ${res.status}`);
        }
        logger.info("slidingSyncHealthCheck: sliding sync endpoint is up");
    }

    public async beforeChange(level: SettingLevel, roomId: string, newValue: any): Promise<boolean> {
        const { finished } = Modal.createDialog(SlidingSyncOptionsDialog);
        const [value] = await finished;
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

        return false;
    }
}
