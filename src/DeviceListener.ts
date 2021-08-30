/*
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

import { MatrixClientPeg } from './MatrixClientPeg';
import dis from "./dispatcher/dispatcher";
import {
    hideToast as hideBulkUnverifiedSessionsToast,
    showToast as showBulkUnverifiedSessionsToast,
} from "./toasts/BulkUnverifiedSessionsToast";
import {
    hideToast as hideSetupEncryptionToast,
    Kind as SetupKind,
    showToast as showSetupEncryptionToast,
} from "./toasts/SetupEncryptionToast";
import {
    hideToast as hideUnverifiedSessionsToast,
    showToast as showUnverifiedSessionsToast,
} from "./toasts/UnverifiedSessionToast";
import { isSecretStorageBeingAccessed, accessSecretStorage } from "./SecurityManager";
import { isSecureBackupRequired } from './utils/WellKnownUtils';
import { isLoggedIn } from './components/structures/MatrixChat';
import { MatrixEvent } from "matrix-js-sdk/src/models/event";
import { ActionPayload } from "./dispatcher/payloads";

const KEY_BACKUP_POLL_INTERVAL = 5 * 60 * 1000;

export default class DeviceListener {
    private dispatcherRef: string;
    // device IDs for which the user has dismissed the verify toast ('Later')
    private dismissed = new Set<string>();
    // has the user dismissed any of the various nag toasts to setup encryption on this device?
    private dismissedThisDeviceToast = false;
    // cache of the key backup info
    private keyBackupInfo: object = null;
    private keyBackupFetchedAt: number = null;
    // We keep a list of our own device IDs so we can batch ones that were already
    // there the last time the app launched into a single toast, but display new
    // ones in their own toasts.
    private ourDeviceIdsAtStart: Set<string> = null;
    // The set of device IDs we're currently displaying toasts for
    private displayingToastsForDeviceIds = new Set<string>();

    static sharedInstance() {
        if (!window.mxDeviceListener) window.mxDeviceListener = new DeviceListener();
        return window.mxDeviceListener;
    }

    start() {
        MatrixClientPeg.get().on('crypto.willUpdateDevices', this.onWillUpdateDevices);
        MatrixClientPeg.get().on('crypto.devicesUpdated', this.onDevicesUpdated);
        MatrixClientPeg.get().on('deviceVerificationChanged', this.onDeviceVerificationChanged);
        MatrixClientPeg.get().on('userTrustStatusChanged', this.onUserTrustStatusChanged);
        MatrixClientPeg.get().on('crossSigning.keysChanged', this.onCrossSingingKeysChanged);
        MatrixClientPeg.get().on('accountData', this.onAccountData);
        MatrixClientPeg.get().on('sync', this.onSync);
        MatrixClientPeg.get().on('RoomState.events', this.onRoomStateEvents);
        this.dispatcherRef = dis.register(this.onAction);
        this.recheck();
    }

    stop() {
        if (MatrixClientPeg.get()) {
            MatrixClientPeg.get().removeListener('crypto.willUpdateDevices', this.onWillUpdateDevices);
            MatrixClientPeg.get().removeListener('crypto.devicesUpdated', this.onDevicesUpdated);
            MatrixClientPeg.get().removeListener('deviceVerificationChanged', this.onDeviceVerificationChanged);
            MatrixClientPeg.get().removeListener('userTrustStatusChanged', this.onUserTrustStatusChanged);
            MatrixClientPeg.get().removeListener('crossSigning.keysChanged', this.onCrossSingingKeysChanged);
            MatrixClientPeg.get().removeListener('accountData', this.onAccountData);
            MatrixClientPeg.get().removeListener('sync', this.onSync);
            MatrixClientPeg.get().removeListener('RoomState.events', this.onRoomStateEvents);
        }
        if (this.dispatcherRef) {
            dis.unregister(this.dispatcherRef);
            this.dispatcherRef = null;
        }
        this.dismissed.clear();
        this.dismissedThisDeviceToast = false;
        this.keyBackupInfo = null;
        this.keyBackupFetchedAt = null;
        this.ourDeviceIdsAtStart = null;
        this.displayingToastsForDeviceIds = new Set();
    }

    /**
     * Dismiss notifications about our own unverified devices
     *
     * @param {String[]} deviceIds List of device IDs to dismiss notifications for
     */
    async dismissUnverifiedSessions(deviceIds: Iterable<string>) {
        for (const d of deviceIds) {
            this.dismissed.add(d);
        }

        this.recheck();
    }

    dismissEncryptionSetup() {
        this.dismissedThisDeviceToast = true;
        this.recheck();
    }

    private ensureDeviceIdsAtStartPopulated() {
        if (this.ourDeviceIdsAtStart === null) {
            const cli = MatrixClientPeg.get();
            this.ourDeviceIdsAtStart = new Set(
                cli.getStoredDevicesForUser(cli.getUserId()).map(d => d.deviceId),
            );
        }
    }

    private onWillUpdateDevices = async (users: string[], initialFetch?: boolean) => {
        // If we didn't know about *any* devices before (ie. it's fresh login),
        // then they are all pre-existing devices, so ignore this and set the
        // devicesAtStart list to the devices that we see after the fetch.
        if (initialFetch) return;

        const myUserId = MatrixClientPeg.get().getUserId();
        if (users.includes(myUserId)) this.ensureDeviceIdsAtStartPopulated();

        // No need to do a recheck here: we just need to get a snapshot of our devices
        // before we download any new ones.
    };

    private onDevicesUpdated = (users: string[]) => {
        if (!users.includes(MatrixClientPeg.get().getUserId())) return;
        this.recheck();
    };

    private onDeviceVerificationChanged = (userId: string) => {
        if (userId !== MatrixClientPeg.get().getUserId()) return;
        this.recheck();
    };

    private onUserTrustStatusChanged = (userId: string) => {
        if (userId !== MatrixClientPeg.get().getUserId()) return;
        this.recheck();
    };

    private onCrossSingingKeysChanged = () => {
        this.recheck();
    };

    private onAccountData = (ev: MatrixEvent) => {
        // User may have:
        // * migrated SSSS to symmetric
        // * uploaded keys to secret storage
        // * completed secret storage creation
        // which result in account data changes affecting checks below.
        if (
            ev.getType().startsWith('m.secret_storage.') ||
            ev.getType().startsWith('m.cross_signing.') ||
            ev.getType() === 'm.megolm_backup.v1'
        ) {
            this.recheck();
        }
    };

    private onSync = (state, prevState) => {
        if (state === 'PREPARED' && prevState === null) this.recheck();
    };

    private onRoomStateEvents = (ev: MatrixEvent) => {
        if (ev.getType() !== "m.room.encryption") {
            return;
        }

        // If a room changes to encrypted, re-check as it may be our first
        // encrypted room. This also catches encrypted room creation as well.
        this.recheck();
    };

    private onAction = ({ action }: ActionPayload) => {
        if (action !== "on_logged_in") return;
        this.recheck();
    };

    // The server doesn't tell us when key backup is set up, so we poll
    // & cache the result
    private async getKeyBackupInfo() {
        const now = (new Date()).getTime();
        if (!this.keyBackupInfo || this.keyBackupFetchedAt < now - KEY_BACKUP_POLL_INTERVAL) {
            this.keyBackupInfo = await MatrixClientPeg.get().getKeyBackupVersion();
            this.keyBackupFetchedAt = now;
        }
        return this.keyBackupInfo;
    }

    private shouldShowSetupEncryptionToast() {
        // If we're in the middle of a secret storage operation, we're likely
        // modifying the state involved here, so don't add new toasts to setup.
        if (isSecretStorageBeingAccessed()) return false;
        // Show setup toasts once the user is in at least one encrypted room.
        const cli = MatrixClientPeg.get();
        return cli && cli.getRooms().some(r => cli.isRoomEncrypted(r.roomId));
    }

    private async recheck() {
        const cli = MatrixClientPeg.get();

        if (!await cli.doesServerSupportUnstableFeature("org.matrix.e2e_cross_signing")) return;

        if (!cli.isCryptoEnabled()) return;
        // don't recheck until the initial sync is complete: lots of account data events will fire
        // while the initial sync is processing and we don't need to recheck on each one of them
        // (we add a listener on sync to do once check after the initial sync is done)
        if (!cli.isInitialSyncComplete()) return;

        const crossSigningReady = await cli.isCrossSigningReady();
        const secretStorageReady = await cli.isSecretStorageReady();
        const allSystemsReady = crossSigningReady && secretStorageReady;

        if (this.dismissedThisDeviceToast || allSystemsReady) {
            hideSetupEncryptionToast();
        } else if (this.shouldShowSetupEncryptionToast()) {
            // make sure our keys are finished downloading
            await cli.downloadKeys([cli.getUserId()]);
            // cross signing isn't enabled - nag to enable it
            // There are 3 different toasts for:
            if (
                !cli.getCrossSigningId() &&
                cli.getStoredCrossSigningForUser(cli.getUserId())
            ) {
                // Cross-signing on account but this device doesn't trust the master key (verify this session)
                showSetupEncryptionToast(SetupKind.VERIFY_THIS_SESSION);
            } else {
                const backupInfo = await this.getKeyBackupInfo();
                if (backupInfo) {
                    // No cross-signing on account but key backup available (upgrade encryption)
                    showSetupEncryptionToast(SetupKind.UPGRADE_ENCRYPTION);
                } else {
                    // No cross-signing or key backup on account (set up encryption)
                    await cli.waitForClientWellKnown();
                    if (isSecureBackupRequired() && isLoggedIn()) {
                        // If we're meant to set up, and Secure Backup is required,
                        // trigger the flow directly without a toast once logged in.
                        hideSetupEncryptionToast();
                        accessSecretStorage();
                    } else {
                        showSetupEncryptionToast(SetupKind.SET_UP_ENCRYPTION);
                    }
                }
            }
        }

        // This needs to be done after awaiting on downloadKeys() above, so
        // we make sure we get the devices after the fetch is done.
        this.ensureDeviceIdsAtStartPopulated();

        // Unverified devices that were there last time the app ran
        // (technically could just be a boolean: we don't actually
        // need to remember the device IDs, but for the sake of
        // symmetry...).
        const oldUnverifiedDeviceIds = new Set<string>();
        // Unverified devices that have appeared since then
        const newUnverifiedDeviceIds = new Set<string>();

        // as long as cross-signing isn't ready,
        // you can't see or dismiss any device toasts
        if (crossSigningReady) {
            const devices = cli.getStoredDevicesForUser(cli.getUserId());
            for (const device of devices) {
                if (device.deviceId === cli.deviceId) continue;

                const deviceTrust = await cli.checkDeviceTrust(cli.getUserId(), device.deviceId);
                if (!deviceTrust.isCrossSigningVerified() && !this.dismissed.has(device.deviceId)) {
                    if (this.ourDeviceIdsAtStart.has(device.deviceId)) {
                        oldUnverifiedDeviceIds.add(device.deviceId);
                    } else {
                        newUnverifiedDeviceIds.add(device.deviceId);
                    }
                }
            }
        }

        // Display or hide the batch toast for old unverified sessions
        if (oldUnverifiedDeviceIds.size > 0) {
            showBulkUnverifiedSessionsToast(oldUnverifiedDeviceIds);
        } else {
            hideBulkUnverifiedSessionsToast();
        }

        // Show toasts for new unverified devices if they aren't already there
        for (const deviceId of newUnverifiedDeviceIds) {
            showUnverifiedSessionsToast(deviceId);
        }

        // ...and hide any we don't need any more
        for (const deviceId of this.displayingToastsForDeviceIds) {
            if (!newUnverifiedDeviceIds.has(deviceId)) {
                hideUnverifiedSessionsToast(deviceId);
            }
        }

        this.displayingToastsForDeviceIds = newUnverifiedDeviceIds;
    }
}
