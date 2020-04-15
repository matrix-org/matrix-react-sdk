/*
Copyright 2017 Vector Creations Ltd
Copyright 2020 The Matrix.org Foundation C.I.C.

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

import * as sdk from './index';
import Modal from './Modal';
import SettingsStore from './settings/SettingsStore';

// TODO: We can remove this once cross-signing is the only way.
// https://github.com/vector-im/riot-web/issues/11908
export default class KeyRequestHandler {
    constructor(matrixClient) {
        this._matrixClient = matrixClient;

        // the user/device for which we currently have a dialog open
        this._currentUser = null;
        this._currentDevice = null;

        // userId -> deviceId -> [keyRequest]
        this._pendingKeyRequests = Object.create(null);
    }

    handleKeyRequest(keyRequest) {
        // Ignore own device key requests
    }

    handleKeyRequestCancellation(cancellation) {
        // Ignore own device key requests
    }

    _processNextRequest() {
        const userId = Object.keys(this._pendingKeyRequests)[0];
        if (!userId) {
            return;
        }
        const deviceId = Object.keys(this._pendingKeyRequests[userId])[0];
        if (!deviceId) {
            return;
        }
        console.log(`Starting KeyShareDialog for ${userId}:${deviceId}`);

        const finished = (r) => {
            this._currentUser = null;
            this._currentDevice = null;

            if (!this._pendingKeyRequests[userId] || !this._pendingKeyRequests[userId][deviceId]) {
                // request was removed in the time the dialog was displayed
                this._processNextRequest();
                return;
            }

            if (r) {
                for (const req of this._pendingKeyRequests[userId][deviceId]) {
                    req.share();
                }
            }
            delete this._pendingKeyRequests[userId][deviceId];
            if (Object.keys(this._pendingKeyRequests[userId]).length === 0) {
                delete this._pendingKeyRequests[userId];
            }

            this._processNextRequest();
        };

        const KeyShareDialog = sdk.getComponent("dialogs.KeyShareDialog");
        Modal.appendTrackedDialog('Key Share', 'Process Next Request', KeyShareDialog, {
            matrixClient: this._matrixClient,
            userId: userId,
            deviceId: deviceId,
            onFinished: finished,
        });
        this._currentUser = userId;
        this._currentDevice = deviceId;
    }
}

