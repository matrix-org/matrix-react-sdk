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

import React from "react";
import { MatrixClient, Method } from "matrix-js-sdk/src/matrix";
import { logger } from "matrix-js-sdk/src/logger";

import { _t } from "../../../languageHandler";
import SettingsStore from "../../../settings/SettingsStore";
import TextInputDialog from "./TextInputDialog";
import withValidation from "../elements/Validation";
import { MatrixClientPeg } from "../../../MatrixClientPeg";
import { useAsyncMemo } from "../../../hooks/useAsyncMemo";
import { SettingLevel } from "../../../settings/SettingLevel";

/**
 * Check if the server declares support for sliding sync via a proxy in its client `.well-known`.
 * @param cli The MatrixClient of the logged in user.
 * @throws if the proxy server is unreachable or not configured to the given homeserver
 */
async function proxySlidingSyncSupportCheck(cli: MatrixClient): Promise<void> {
    const controller = new AbortController();
    const id = window.setTimeout(() => controller.abort(), 10 * 1000); // 10s
    const res = await fetch(cli.baseUrl + "/.well-known/matrix/client", {
        signal: controller.signal,
    });
    clearTimeout(id);
    if (res.status != 200) {
        throw new Error(`nativeSlidingSyncSupportCheck: server-side .well-known check gave HTTP ${res.status}`);
    }
    const body = await res.json();
    const proxyUrl = body["org.matrix.msc3575.proxy"]?.url;
    if (proxyUrl == undefined) {
        throw new Error(`nativeSlidingSyncSupportCheck: no proxy defined in our client well-known`);
    }
    SettingsStore.setValue("feature_sliding_sync_proxy_url", null, SettingLevel.DEVICE, proxyUrl);
    logger.info("server natively support sliding sync OK");
}

/**
 * Check if the server natively supports sliding sync.
 * @param cli The MatrixClient of the logged in user.
 * @throws if the server is unreachable or doesn't natively support sliding sync
 */
async function nativeSlidingSyncSupportCheck(cli: MatrixClient): Promise<void> {
    await cli.http.authedRequest(Method.Post, "/sync", undefined, undefined, {
        localTimeoutMs: 10 * 1000, // 10s
        prefix: "/_matrix/client/unstable/org.matrix.msc3575",
    });
    logger.info("nativeSlidingSyncSupportCheck: server natively supports sliding sync");
}

export const SlidingSyncOptionsDialog: React.FC<{ onFinished(enabled: boolean): void }> = ({ onFinished }) => {
    const cli = MatrixClientPeg.safeGet();
    const hasProxySupport = useAsyncMemo(
        () =>
            proxySlidingSyncSupportCheck(cli).then(
                () => true,
                () => false,
            ),
        [],
        null,
    );

    let nativeSupport: string;
    if (hasNativeSupport === null) {
        nativeSupport = _t("labs|sliding_sync_checking");
    } else {
        nativeSupport = hasNativeSupport
            ? _t("labs|sliding_sync_server_support")
            : _t("labs|sliding_sync_server_no_support");
    }

    return (
        <TextInputDialog
            title={_t("labs|sliding_sync_configuration")}
            description={
                <div>
                    <div>
                        <b>{_t("labs|sliding_sync_disable_warning")}</b>
                    </div>
                    {nativeSupport}
                </div>
            }
            placeholder={
                hasNativeSupport
                    ? _t("labs|sliding_sync_proxy_url_optional_label")
                    : _t("labs|sliding_sync_proxy_url_label")
            }
            button={_t("action|enable")}
            onFinished={(enable) => {
                if (enable) {
                    onFinished(true);
                } else {
                    onFinished(false);
                }
            }}
        />
    );
};
