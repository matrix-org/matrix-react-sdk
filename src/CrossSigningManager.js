/*
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

import Modal from './Modal';
import * as sdk from './index';
import {MatrixClientPeg} from './MatrixClientPeg';
import { deriveKey } from 'matrix-js-sdk/src/crypto/key_passphrase';
import { decodeRecoveryKey } from 'matrix-js-sdk/src/crypto/recoverykey';
import { _t } from './languageHandler';
import SettingsStore from './settings/SettingsStore';

// This stores the secret storage private keys in memory for the JS SDK. This is
// only meant to act as a cache to avoid prompting the user multiple times
// during the same single operation. Use `accessSecretStorage` below to scope a
// single secret storage operation, as it will clear the cached keys once the
// operation ends.
let secretStorageKeys = {};
let secretStorageBeingAccessed = false;

function isCachingAllowed() {
    return (
        secretStorageBeingAccessed ||
        SettingsStore.getValue("keepSecretStoragePassphraseForSession")
    );
}

export class AccessCancelledError extends Error {
    constructor() {
        super("Secret storage access canceled");
    }
}

async function confirmToDismiss(name) {
    let description;
    if (name === "m.cross_signing.user_signing") {
        description = _t("If you cancel now, you won't complete verifying the other user.");
    } else if (name === "m.cross_signing.self_signing") {
        description = _t("If you cancel now, you won't complete verifying your other session.");
    } else {
        description = _t("If you cancel now, you won't complete your secret storage operation.");
    }

    const QuestionDialog = sdk.getComponent("dialogs.QuestionDialog");
    const [sure] = await Modal.createDialog(QuestionDialog, {
        title: _t("Cancel entering passphrase?"),
        description,
        danger: true,
        cancelButton: _t("Enter passphrase"),
        button: _t("Cancel"),
    }).finished;
    return sure;
}

async function getSecretStorageKey({ keys: keyInfos }, ssssItemName) {
    const keyInfoEntries = Object.entries(keyInfos);
    if (keyInfoEntries.length > 1) {
        throw new Error("Multiple storage key requests not implemented");
    }
    const [name, info] = keyInfoEntries[0];

    // Check the in-memory cache
    if (isCachingAllowed() && secretStorageKeys[name]) {
        return [name, secretStorageKeys[name]];
    }

    const inputToKey = async ({ passphrase, recoveryKey }) => {
        if (passphrase) {
            return deriveKey(
                passphrase,
                info.passphrase.salt,
                info.passphrase.iterations,
            );
        } else {
            return decodeRecoveryKey(recoveryKey);
        }
    };
    const AccessSecretStorageDialog =
        sdk.getComponent("dialogs.secretstorage.AccessSecretStorageDialog");
    const { finished } = Modal.createTrackedDialog("Access Secret Storage dialog", "",
        AccessSecretStorageDialog,
        /* props= */
        {
            keyInfo: info,
            checkPrivateKey: async (input) => {
                const key = await inputToKey(input);
                return MatrixClientPeg.get().checkSecretStoragePrivateKey(key, info.pubkey);
            },
        },
        /* className= */ null,
        /* isPriorityModal= */ false,
        /* isStaticModal= */ false,
        /* options= */ {
            onBeforeClose: async (reason) => {
                if (reason === "backgroundClick") {
                    return confirmToDismiss(ssssItemName);
                }
                return true;
            },
        },
    );
    const [input] = await finished;
    if (!input) {
        throw new AccessCancelledError();
    }
    const key = await inputToKey(input);

    // Save to cache to avoid future prompts in the current session
    if (isCachingAllowed()) {
        secretStorageKeys[name] = key;
    }

    return [name, key];
}

export const crossSigningCallbacks = {
    getSecretStorageKey,
};

/**
 * This helper should be used whenever you need to access secret storage. It
 * ensures that secret storage (and also cross-signing since they each depend on
 * each other in a cycle of sorts) have been bootstrapped before running the
 * provided function.
 *
 * Bootstrapping secret storage may take one of these paths:
 * 1. Create secret storage from a passphrase and store cross-signing keys
 *    in secret storage.
 * 2. Access existing secret storage by requesting passphrase and accessing
 *    cross-signing keys as needed.
 * 3. All keys are loaded and there's nothing to do.
 *
 * Additionally, the secret storage keys are cached during the scope of this function
 * to ensure the user is prompted only once for their secret storage
 * passphrase. The cache is then cleared once the provided function completes.
 *
 * @param {Function} [func] An operation to perform once secret storage has been
 * bootstrapped. Optional.
 * @param {bool} [force] Reset secret storage even if it's already set up
 */
export async function accessSecretStorage(func = async () => { }, force = false) {
    const cli = MatrixClientPeg.get();
    secretStorageBeingAccessed = true;
    try {
        if (!await cli.hasSecretStorageKey() || force) {
            // This dialog calls bootstrap itself after guiding the user through
            // passphrase creation.
            const { finished } = Modal.createTrackedDialogAsync('Create Secret Storage dialog', '',
                import("./async-components/views/dialogs/secretstorage/CreateSecretStorageDialog"),
                {
                    force,
                },
                null, /* priority = */ false, /* static = */ true,
            );
            const [confirmed] = await finished;
            if (!confirmed) {
                throw new Error("Secret storage creation canceled");
            }
        } else {
            const InteractiveAuthDialog = sdk.getComponent("dialogs.InteractiveAuthDialog");
            await cli.bootstrapSecretStorage({
                authUploadDeviceSigningKeys: async (makeRequest) => {
                    const { finished } = Modal.createTrackedDialog(
                        'Cross-signing keys dialog', '', InteractiveAuthDialog,
                        {
                            title: _t("Setting up keys"),
                            matrixClient: MatrixClientPeg.get(),
                            makeRequest,
                        },
                    );
                    const [confirmed] = await finished;
                    if (!confirmed) {
                        throw new Error("Cross-signing key upload auth canceled");
                    }
                },
            });
        }

        // `return await` needed here to ensure `finally` block runs after the
        // inner operation completes.
        return await func();
    } finally {
        // Clear secret storage key cache now that work is complete
        secretStorageBeingAccessed = false;
        if (!isCachingAllowed()) {
            secretStorageKeys = {};
        }
    }
}
