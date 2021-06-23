/*
Copyright 2017 OpenMarket Ltd
Copyright 2018 New Vector Ltd
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

import pako from 'pako';

import {MatrixClientPeg} from '../MatrixClientPeg';
import PlatformPeg from '../PlatformPeg';
import { _t } from '../languageHandler';
import Tar from "tar-js";

import * as rageshake from './rageshake';

import SettingsStore from "../settings/SettingsStore";
import SdkConfig from "../SdkConfig";

interface IOpts {
    label?: string;
    userText?: string;
    sendLogs?: boolean;
    progressCallback?: (string) => void;
}

async function collectBugReport(opts: IOpts = {}, gzipLogs = true) {
    const progressCallback = opts.progressCallback || (() => {});

    progressCallback(_t("Collecting app version information"));
    let version = "UNKNOWN";
    try {
        version = await PlatformPeg.get().getAppVersion();
    } catch (err) {} // PlatformPeg already logs this.

    let userAgent = "UNKNOWN";
    if (window.navigator && window.navigator.userAgent) {
        userAgent = window.navigator.userAgent;
    }

    let installedPWA = "UNKNOWN";
    try {
        // Known to work at least for desktop Chrome
        installedPWA = String(window.matchMedia('(display-mode: standalone)').matches);
    } catch (e) {}

    let touchInput = "UNKNOWN";
    try {
        // MDN claims broad support across browsers
        touchInput = String(window.matchMedia('(pointer: coarse)').matches);
    } catch (e) { }

    const client = MatrixClientPeg.get();

    console.log("Sending bug report.");

    const body = new FormData();
    body.append('text', opts.userText || "User did not supply any additional text.");
    body.append('app', 'element-web');
    body.append('version', version);
    body.append('user_agent', userAgent);
    body.append('installed_pwa', installedPWA);
    body.append('touch_input', touchInput);

    if (client) {
        body.append('user_id', client.credentials.userId);
        body.append('device_id', client.deviceId);

        if (client.isCryptoEnabled()) {
            const keys = [`ed25519:${client.getDeviceEd25519Key()}`];
            if (client.getDeviceCurve25519Key) {
                keys.push(`curve25519:${client.getDeviceCurve25519Key()}`);
            }
            body.append('device_keys', keys.join(', '));
            body.append('cross_signing_key', client.getCrossSigningId());

            // add cross-signing status information
            const crossSigning = client.crypto._crossSigningInfo;
            const secretStorage = client.crypto._secretStorage;

            body.append("cross_signing_ready", String(await client.isCrossSigningReady()));
            body.append("cross_signing_supported_by_hs",
                String(await client.doesServerSupportUnstableFeature("org.matrix.e2e_cross_signing")));
            body.append("cross_signing_key", crossSigning.getId());
            body.append("cross_signing_pk_in_secret_storage",
                String(!!(await crossSigning.isStoredInSecretStorage(secretStorage))));

            const pkCache = client.getCrossSigningCacheCallbacks();
            body.append("cross_signing_master_pk_cached",
                String(!!(pkCache && await pkCache.getCrossSigningKeyCache("master"))));
            body.append("cross_signing_self_signing_pk_cached",
                String(!!(pkCache && await pkCache.getCrossSigningKeyCache("self_signing"))));
            body.append("cross_signing_user_signing_pk_cached",
                String(!!(pkCache && await pkCache.getCrossSigningKeyCache("user_signing"))));

            body.append("secret_storage_ready", String(await client.isSecretStorageReady()));
            body.append("secret_storage_key_in_account", String(!!(await secretStorage.hasKey())));

            body.append("session_backup_key_in_secret_storage", String(!!(await client.isKeyBackupKeyStored())));
            const sessionBackupKeyFromCache = await client.crypto.getSessionBackupPrivateKey();
            body.append("session_backup_key_cached", String(!!sessionBackupKeyFromCache));
            body.append("session_backup_key_well_formed", String(sessionBackupKeyFromCache instanceof Uint8Array));
        }
    }

    if (opts.label) {
        body.append('label', opts.label);
    }

    // add labs options
    const enabledLabs = SettingsStore.getFeatureSettingNames().filter(f => SettingsStore.getValue(f));
    if (enabledLabs.length) {
        body.append('enabled_labs', enabledLabs.join(', '));
    }
    // if low bandwidth mode is enabled, say so over rageshake, it causes many issues
    if (SettingsStore.getValue("lowBandwidth")) {
        body.append("lowBandwidth", "enabled");
    }

    // add storage persistence/quota information
    if (navigator.storage && navigator.storage.persisted) {
        try {
            body.append("storageManager_persisted", String(await navigator.storage.persisted()));
        } catch (e) {}
    } else if (document.hasStorageAccess) { // Safari
        try {
            body.append("storageManager_persisted", String(await document.hasStorageAccess()));
        } catch (e) {}
    }
    if (navigator.storage && navigator.storage.estimate) {
        try {
            const estimate = await navigator.storage.estimate();
            body.append("storageManager_quota", String(estimate.quota));
            body.append("storageManager_usage", String(estimate.usage));
            if (estimate.usageDetails) {
                Object.keys(estimate.usageDetails).forEach(k => {
                    body.append(`storageManager_usage_${k}`, String(estimate.usageDetails[k]));
                });
            }
        } catch (e) {}
    }

    if (window.Modernizr) {
        const missingFeatures = Object.keys(window.Modernizr).filter(key => window.Modernizr[key] === false);
        if (missingFeatures.length > 0) {
            body.append("modernizr_missing_features", missingFeatures.join(", "));
        }
    }

    body.append("mx_local_settings", localStorage.getItem('mx_local_settings'));

    if (opts.sendLogs) {
        progressCallback(_t("Collecting logs"));
        const logs = await rageshake.getLogsForReport();
        for (const entry of logs) {
            // encode as UTF-8
            let buf = new TextEncoder().encode(entry.lines);

            // compress
            if (gzipLogs) {
                buf = pako.gzip(buf);
            }

            body.append('compressed-log', new Blob([buf]), entry.id);
        }
    }

    return body;
}

/**
 * Send a bug report.
 *
 * @param {string} bugReportEndpoint HTTP url to send the report to
 *
 * @param {object} opts optional dictionary of options
 *
 * @param {string} opts.userText Any additional user input.
 *
 * @param {boolean} opts.sendLogs True to send logs
 *
 * @param {function(string)} opts.progressCallback Callback to call with progress updates
 *
 * @return {Promise} Resolved when the bug report is sent.
 */
export default async function sendBugReport(bugReportEndpoint: string, opts: IOpts = {}) {
    if (!bugReportEndpoint) {
        throw new Error("No bug report endpoint has been set.");
    }

    const progressCallback = opts.progressCallback || (() => {});
    const body = await collectBugReport(opts);

    progressCallback(_t("Uploading logs"));
    await _submitReport(bugReportEndpoint, body, progressCallback);
}

/**
 * Downloads the files from a bug report. This is the same as sendBugReport,
 * but instead causes the browser to download the files locally.
 *
 * @param {object} opts optional dictionary of options
 *
 * @param {string} opts.userText Any additional user input.
 *
 * @param {boolean} opts.sendLogs True to send logs
 *
 * @param {function(string)} opts.progressCallback Callback to call with progress updates
 *
 * @return {Promise} Resolved when the bug report is downloaded (or started).
 */
export async function downloadBugReport(opts: IOpts = {}) {
    const progressCallback = opts.progressCallback || (() => {});
    const body = await collectBugReport(opts, false);

    progressCallback(_t("Downloading logs"));
    let metadata = "";
    const tape = new Tar();
    let i = 0;
    for (const [key, value] of body.entries()) {
        if (key === 'compressed-log') {
            await new Promise<void>((resolve => {
                const reader = new FileReader();
                reader.addEventListener('loadend', ev => {
                    tape.append(`log-${i++}.log`, new TextDecoder().decode(ev.target.result as ArrayBuffer));
                    resolve();
                });
                reader.readAsArrayBuffer(value as Blob);
            }));
        } else {
            metadata += `${key} = ${value}\n`;
        }
    }
    tape.append('issue.txt', metadata);

    // We have to create a new anchor to download if we want a filename. Otherwise we could
    // just use window.open.
    const dl = document.createElement('a');
    dl.href = `data:application/octet-stream;base64,${btoa(uint8ToString(tape.out))}`;
    dl.download = 'rageshake.tar';
    document.body.appendChild(dl);
    dl.click();
    document.body.removeChild(dl);
}

// Source: https://github.com/beatgammit/tar-js/blob/master/examples/main.js
function uint8ToString(buf: Buffer) {
    let out = '';
    for (let i = 0; i < buf.length; i += 1) {
        out += String.fromCharCode(buf[i]);
    }
    return out;
}

export async function submitFeedback(
    endpoint: string,
    label: string,
    comment: string,
    canContact = false,
    extraData: Record<string, string> = {},
) {
    let version = "UNKNOWN";
    try {
        version = await PlatformPeg.get().getAppVersion();
    } catch (err) {} // PlatformPeg already logs this.

    const body = new FormData();
    body.append("label", label);
    body.append("text", comment);
    body.append("can_contact", canContact ? "yes" : "no");

    body.append("app", "element-web");
    body.append("version", version);
    body.append("platform", PlatformPeg.get().getHumanReadableName());
    body.append("user_id", MatrixClientPeg.get()?.getUserId());

    for (const k in extraData) {
        body.append(k, extraData[k]);
    }

    await _submitReport(SdkConfig.get().bug_report_endpoint_url, body, () => {});
}

function _submitReport(endpoint: string, body: FormData, progressCallback: (string) => void) {
    return new Promise<void>((resolve, reject) => {
        const req = new XMLHttpRequest();
        req.open("POST", endpoint);
        req.timeout = 5 * 60 * 1000;
        req.onreadystatechange = function() {
            if (req.readyState === XMLHttpRequest.LOADING) {
                progressCallback(_t("Waiting for response from server"));
            } else if (req.readyState === XMLHttpRequest.DONE) {
                // on done
                if (req.status < 200 || req.status >= 400) {
                    reject(new Error(`HTTP ${req.status}`));
                    return;
                }
                resolve();
            }
        };
        req.send(body);
    });
}
