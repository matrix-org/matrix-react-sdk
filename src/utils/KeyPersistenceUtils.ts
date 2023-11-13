/*
Copyright 2019, 2023 The Matrix.org Foundation C.I.C.

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
import { SecretStorageKeyDescription } from "matrix-js-sdk/src/secret-storage";
import { decodeRecoveryKey } from "matrix-js-sdk/src/crypto/recoverykey";

import { MatrixClientPeg } from "../MatrixClientPeg";
import PlatformPeg from "../PlatformPeg";

function platformSSSSKeyIdentifier(keyId: string): string {
    const cli = MatrixClientPeg.safeGet();
    return `${cli.getUserId()}|ssss|${keyId}`;
}

export async function storeSSSSKeyAsPlatformSecret(keyId: string, encodedPrivateKey: string): Promise<boolean> {
    const identifier = platformSSSSKeyIdentifier(keyId);
    const result = await PlatformPeg.get()?.savePlatformSecret(identifier, encodedPrivateKey);
    if (result === encodedPrivateKey) {
        logger.info(`PlatformSecret: persisted key ${identifier}`);
        return true;
    } else {
        logger.warn(`PlatformSecret: Failed to persist key ${identifier}`);
        return false;
    }
}

export async function getSSSSKeyFromPlatformSecret(
    keyId: string,
    keyInfo: SecretStorageKeyDescription,
): Promise<Uint8Array | null> {
    const identifier = platformSSSSKeyIdentifier(keyId);
    try {
        logger.info(`PlatformSecret: fetching SSSS key ${identifier}`);
        const cli = MatrixClientPeg.safeGet();
        const encodedKey = await PlatformPeg.get()?.getPlatformSecret(platformSSSSKeyIdentifier(keyId));
        if (encodedKey) {
            const key = decodeRecoveryKey(encodedKey);
            if (await cli.secretStorage.checkKey(key, keyInfo)) {
                logger.info(`PlatformSecret: SSSS key ${identifier} is valid`);
                return key;
            } else {
                logger.warn(`PlatformSecret: SSSS key ${identifier} is invalid`);
            }
        } else {
            logger.info(`PlatformSecret: No such SSSS key: ${identifier}`);
        }
    } catch (e) {
        logger.warn("PlatformSecret: Failed fetch key", e);
    }
    return null;
}
