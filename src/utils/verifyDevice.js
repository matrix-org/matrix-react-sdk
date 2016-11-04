/*
Copyright 2016 OpenMarket Ltd

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

import sdk from '../index';
import Modal from '../Modal';

/* opens a modal dialog to do a device verification */
export default function(matrixClient, userId, device, onVerified) {
    var Dialog = sdk.getComponent("dialogs.DeviceVerificationDialog");
    return Modal.createDialog(Dialog, {
        userId: userId,
        device: device,
        onFinished: (confirm) => {
            if (confirm) {
                matrixClient.setDeviceVerified(
                    userId, device.deviceId, true
                );
                if (onVerified) {
                    onVerified();
                }
            }
        }
    });
}
