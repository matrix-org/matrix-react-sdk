/*
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

import SettingController from "./SettingController";
import PlatformPeg from "../../PlatformPeg";
import { SettingLevel } from "../SettingLevel";
import SdkConfig from "../../SdkConfig";
import { logger } from "matrix-js-sdk/src/logger";
import SettingsStore from "../SettingsStore";

export default class SlidingSyncController extends SettingController {

    public async onChange(level: SettingLevel, roomId: string, newValue: any) {
        if (newValue) {
            // run checks against the "proxy" to make sure it is valid BEFORE we start doing things
            const url = SdkConfig.get().sliding_sync_proxy_url;
            if (!url) {
                logger.error("cannot enable sliding sync without 'sliding_sync_proxy_url' being present");
                return;
            }
            try {
                await proxyHealthCheck(url);
            } catch (err) {
                console.error(err);
                // force the value to false, this is a bit ew, it would be nice if we could return
                // a bool as to whether to go through with the change or not.
                SettingsStore.setValue("slidingSync", roomId, level, false);
                return;
            }
        }
        PlatformPeg.get().reload();
    }

    public get settingDisabled(): boolean {
        return !SdkConfig.get().sliding_sync_proxy_url;
    }
}

/**
 * Check that the proxy url is in fact a sliding sync proxy endpoint and it is up.
 * @param endpoint The proxy endpoint url
 * @param hsUrl The homeserver url of the logged in user. 
 * @returns True if the proxy is valid, else throws.
 */
function proxyHealthCheck(endpoint: string, hsUrl?: string): Promise<boolean> {
    // TODO: when HSes natively support sliding sync, we should just hit the /sync endpoint to see
    // if it 200 OKs.
    return new Promise<boolean>((resolve, reject) => {
        const req = new XMLHttpRequest();
        req.open("GET", endpoint + "/client/server.json");
        req.responseType = "json";
        req.timeout = 10 * 1000;
        req.onreadystatechange = function() {
            if (req.readyState !== XMLHttpRequest.DONE) {
                return;
            }
            if (req.status !== 200) {
                reject(new Error(`HTTP ${req.status}`));
                return;
            }
            // The proxy is hard-coded on startup to talk to a single HS. Make sure that HS matches
            // the client's HS else we might give an access_token to a different homeserver!
            if (hsUrl && hsUrl !== req.response.server) {
                reject(new Error("homeserver mismatch: client="+hsUrl+" proxy="+req.response.server));
                return;
            }
            resolve(true);
        };
        req.send();
    });
}