/*
Copyright 2021 New Vector Ltd

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

import EventEmitter from 'events';
import { MatrixEvent } from "matrix-js-sdk/src";

import { MatrixClientPeg } from '../MatrixClientPeg';
import SdkConfig from '../SdkConfig';
import SettingsStore from '../settings/SettingsStore';
import sendBugReport from '../rageshake/submit-rageshake';

// Minimum interval of 5 minutes between reports, especially important when we're doing an initial sync with a lot of decryption errors
const RAGESHAKE_INTERVAL = 5*60*1000;
// Event type for to-device messages requesting sender auto-rageshakes
const AUTO_RS_REQUEST = "im.vector.auto_rs_request";

/**
 * Watches for decryption errors to auto-report if the relevant lab is
 * enabled, and keeps track of session IDs that have already been
 * reported.
 */
export default class AutoRageshakeStore extends EventEmitter {
    private static internalInstance: AutoRageshakeStore;

    public static get instance(): AutoRageshakeStore {
        if (!AutoRageshakeStore.internalInstance) {
            AutoRageshakeStore.internalInstance = new AutoRageshakeStore();
        }
        return AutoRageshakeStore.internalInstance;
    }

    private reportedSessionIds = new Set<string>();
    private lastRageshakeTime = 0;

    public start(): void {
        this.onDecryptionAttempt = this.onDecryptionAttempt.bind(this);
        this.onDeviceMessage = this.onDeviceMessage.bind(this);
        MatrixClientPeg.get().on('Event.decrypted', this.onDecryptionAttempt);
        MatrixClientPeg.get().on('toDeviceEvent', this.onDeviceMessage);
    }

    public stop(): void {
        if (MatrixClientPeg.get()) {
            MatrixClientPeg.get().removeListener('toDeviceEvent', this.onDeviceMessage);
            MatrixClientPeg.get().removeListener('Event.decrypted', this.onDecryptionAttempt);
        }
    }

    private async onDecryptionAttempt(ev: MatrixEvent): Promise<void> {
        if (!SettingsStore.getValue("automaticDecryptionErrorReporting")) return;

        const wireContent = ev.getWireContent();
        const sessionId = wireContent.session_id;
        if (ev.isDecryptionFailure() && !this.reportedSessionIds.has(sessionId)) {
            this.reportedSessionIds.add(sessionId);
            const messageContent = {
                "event_id": ev.getId(),
                "room_id": ev.getRoomId(),
                "session_id": sessionId,
                "device_id": wireContent.device_id,
                "user_id": ev.getSender(),
                "sender_key": wireContent.sender_key,
            };
            MatrixClientPeg.get().sendToDevice(
                AUTO_RS_REQUEST,
                { [messageContent.user_id]: { [messageContent.device_id]: messageContent } },
            );

            const now = new Date().getTime();
            if (now - this.lastRageshakeTime > RAGESHAKE_INTERVAL) {
                this.lastRageshakeTime = now;
                await sendBugReport(SdkConfig.get().bug_report_endpoint_url, {
                    userText: "Auto-reporting decryption error (recipient)",
                    sendLogs: true,
                    label: "Z-UISI",
                });
            }
        }
    }

    private async onDeviceMessage(ev: MatrixEvent): Promise<void> {
        if (!SettingsStore.getValue("automaticDecryptionErrorReporting")) return;

        if (ev.getType() !== AUTO_RS_REQUEST) return;
        const now = new Date().getTime();
        if (now - this.lastRageshakeTime > RAGESHAKE_INTERVAL) {
            this.lastRageshakeTime = now;
            await sendBugReport(SdkConfig.get().bug_report_endpoint_url, {
                userText: "Auto-reporting decryption error (sender)",
                sendLogs: true,
                label: "Z-UISI",
            });
        }
    }
}

window.mxAutoRageshakeStore = AutoRageshakeStore.instance;
