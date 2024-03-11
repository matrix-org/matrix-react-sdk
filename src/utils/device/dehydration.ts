/*
Copyright 2024 The Matrix.org Foundation C.I.C.

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

import { logger } from "matrix-js-sdk/src/logger";
import { MatrixClientPeg } from "../../MatrixClientPeg";

// the interval between creating dehydrated devices
const DEHYDRATION_INTERVAL = 7*24*60*60*1000;

// check if device dehydration is enabled
export async function deviceDehydrationEnabled(): Promise<boolean> {
    const crypto = MatrixClientPeg.safeGet().getCrypto();
    if (!(await crypto.isDehydrationSupported())) {
        return false;
    }
    if (await crypto.isDehydrationKeyStored()) {
        return true;
    }
    return true;
    const wellknown = await MatrixClientPeg.safeGet().waitForClientWellKnown();
    return !!wellknown?.["org.matrix.msc3814"];
}

// if dehydration is enabled, rehydrate a device (if available) and create
// a new dehydrated device
export async function initializeDehydration(reset?: boolean): Promise<void> {
    const crypto = MatrixClientPeg.safeGet().getCrypto();
    if (crypto && await deviceDehydrationEnabled()) {
        logger.log("Device dehydration enabled");
        if (reset) {
            await crypto.resetDehydrationKey();
        } else {
            try {
                await crypto.rehydrateDeviceIfAvailable();
            } catch (e) {
                logger.error("Error rehydrating device:", e);
            }
        }
        await crypto.scheduleDeviceDehydration(DEHYDRATION_INTERVAL);
    }
}
