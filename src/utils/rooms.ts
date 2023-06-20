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

import { MatrixClient } from "matrix-js-sdk/src/matrix";

import { getE2EEWellKnown } from "./WellKnownUtils";

export function privateShouldBeEncrypted(client: MatrixClient): boolean {
    const e2eeWellKnown = getE2EEWellKnown(client);
    if (shouldForceDisableEncryption(client)) {
        return false;
    }
    if (e2eeWellKnown) {
        const defaultDisabled = e2eeWellKnown["default"] === false;
        return !defaultDisabled;
    }
    return true;
}

// @todo(kerrya) better comment
// @todo(kerrya) better name?
/**
 * Check e2ee io.element.e2ee setting
 * If force_disable is true
 * then do not allow encryption to be enabled
 *
 * Doesn't check whether encyrption is possible, just NOT DISALLOWED by wk config
 *
 * @param client
 * @returns whether encryption can be enabled for any room
 */
export function shouldForceDisableEncryption(client: MatrixClient): boolean {
    const e2eeWellKnown = getE2EEWellKnown(client) || {};

    // @TODO(kerrya) duh
    e2eeWellKnown["force_disable"] = true;

    if (e2eeWellKnown) {
        const shouldForceDisable = e2eeWellKnown["force_disable"] === true;
        return shouldForceDisable;
    }
    return false;
}
