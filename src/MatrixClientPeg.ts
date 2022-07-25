/*
Copyright 2015, 2016 OpenMarket Ltd
Copyright 2017 Vector Creations Ltd.
Copyright 2017, 2018, 2019 New Vector Ltd
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

import { ICreateClientOpts, PendingEventOrdering } from 'matrix-js-sdk/src/matrix';
import { IStartClientOpts, MatrixClient } from 'matrix-js-sdk/src/client';
import { MemoryStore } from 'matrix-js-sdk/src/store/memory';
import * as utils from 'matrix-js-sdk/src/utils';
import { EventTimeline } from 'matrix-js-sdk/src/models/event-timeline';
import { EventTimelineSet } from 'matrix-js-sdk/src/models/event-timeline-set';
import { verificationMethods } from 'matrix-js-sdk/src/crypto';
import { SHOW_QR_CODE_METHOD } from "matrix-js-sdk/src/crypto/verification/QRCode";
import { logger } from "matrix-js-sdk/src/logger";

import createMatrixClient from './utils/createMatrixClient';
import SettingsStore from './settings/SettingsStore';
import MatrixActionCreators from './actions/MatrixActionCreators';
import Modal from './Modal';
import MatrixClientBackedSettingsHandler from "./settings/handlers/MatrixClientBackedSettingsHandler";
import * as StorageManager from './utils/StorageManager';
import IdentityAuthClient from './IdentityAuthClient';
import { crossSigningCallbacks, tryToUnlockSecretStorageWithDehydrationKey } from './SecurityManager';
import SecurityCustomisations from "./customisations/Security";
import CryptoStoreTooNewDialog from "./components/views/dialogs/CryptoStoreTooNewDialog";

export interface IMatrixClientCreds {
    homeserverUrl: string;
    identityServerUrl?: string;
    userId: string;
    deviceId?: string;
    accessToken: string;
    guest?: boolean;
    pickleKey?: string;
    freshLogin?: boolean;
}

/**
 * Holds the current instance of the `MatrixClient` to use across the codebase.
 * Looking for an `MatrixClient`? Just look for the `MatrixClientPeg` on the peg
 * board. "Peg" is the literal meaning of something you hang something on. So
 * you'll find a `MatrixClient` hanging on the `MatrixClientPeg`.
 */
export interface IMatrixClientPeg {
    opts: IStartClientOpts;

    /**
     * Return the server name of the user's homeserver
     * Throws an error if unable to deduce the homeserver name
     * (eg. if the user is not logged in)
     *
     * @returns {string} The homeserver name, if present.
     */
    getHomeserverName(): string;

    get(): MatrixClient;
    unset(): void;
    assign(): Promise<any>;
    start(): Promise<any>;

    getCredentials(): IMatrixClientCreds;

    /**
     * If we've registered a user ID we set this to the ID of the
     * user we've just registered. If they then go & log in, we
     * can send them to the welcome user (obviously this doesn't
     * guarantee they'll get a chat with the welcome user).
     *
     * @param {string} uid The user ID of the user we've just registered
     */
    setJustRegisteredUserId(uid: string | null): void;

    /**
     * Returns true if the current user has just been registered by this
     * client as determined by setJustRegisteredUserId()
     *
     * @returns {bool} True if user has just been registered
     */
    currentUserIsJustRegistered(): boolean;

    /**
     * If the current user has been registered by this device then this
     * returns a boolean of whether it was within the last N hours given.
     */
    userRegisteredWithinLastHours(hours: number): boolean;

    /**
     * If the current user has been registered by this device then this
     * returns a boolean of whether it was after a given timestamp.
     */
    userRegisteredAfter(date: Date): boolean;

    /**
     * Replace this MatrixClientPeg's client with a client instance that has
     * homeserver / identity server URLs and active credentials
     *
     * @param {IMatrixClientCreds} creds The new credentials to use.
     */
    replaceUsingCreds(creds: IMatrixClientCreds): void;
}

/**
 * Wrapper object for handling the js-sdk Matrix Client object in the react-sdk
 * Handles the creation/initialisation of client objects.
 * This module provides a singleton instance of this class so the 'current'
 * Matrix Client object is available easily.
 */
class MatrixClientPegClass implements IMatrixClientPeg {
    // These are the default options used when when the
    // client is started in 'start'. These can be altered
    // at any time up to after the 'will_start_client'
    // event is finished processing.
    public opts: IStartClientOpts = {
        initialSyncLimit: 20,
    };

    private matrixClient: MatrixClient = null;
    private justRegisteredUserId: string | null = null;

    // the credentials used to init the current client object.
    // used if we tear it down & recreate it with a different store
    private currentClientCreds: IMatrixClientCreds;

    public get(): MatrixClient {
        return this.matrixClient;
    }

    public unset(): void {
        this.matrixClient = null;

        MatrixActionCreators.stop();
    }

    public setJustRegisteredUserId(uid: string | null): void {
        this.justRegisteredUserId = uid;
        if (uid) {
            const registrationTime = Date.now().toString();
            window.localStorage.setItem("mx_registration_time", registrationTime);
        }
    }

    public currentUserIsJustRegistered(): boolean {
        return (
            this.matrixClient &&
            this.matrixClient.credentials.userId === this.justRegisteredUserId
        );
    }

    public userRegisteredWithinLastHours(hours: number): boolean {
        if (hours <= 0) {
            return false;
        }

        try {
            const registrationTime = parseInt(window.localStorage.getItem("mx_registration_time"), 10);
            const diff = Date.now() - registrationTime;
            return (diff / 36e5) <= hours;
        } catch (e) {
            return false;
        }
    }

    public userRegisteredAfter(timestamp: Date): boolean {
        try {
            const registrationTime = parseInt(window.localStorage.getItem("mx_registration_time"), 10);
            return timestamp.getTime() <= registrationTime;
        } catch (e) {
            return false;
        }
    }

    public replaceUsingCreds(creds: IMatrixClientCreds): void {
        this.currentClientCreds = creds;
        this.createClient(creds);
    }

    public async assign(): Promise<any> {
        for (const dbType of ['indexeddb', 'memory']) {
            try {
                const promise = this.matrixClient.store.startup();
                logger.log("MatrixClientPeg: waiting for MatrixClient store to initialise");
                await promise;
                break;
            } catch (err) {
                if (dbType === 'indexeddb') {
                    logger.error('Error starting matrixclient store - falling back to memory store', err);
                    this.matrixClient.store = new MemoryStore({
                        localStorage: localStorage,
                    });
                } else {
                    logger.error('Failed to start memory store!', err);
                    throw err;
                }
            }
        }

        // try to initialise e2e on the new client
        try {
            // check that we have a version of the js-sdk which includes initCrypto
            if (!SettingsStore.getValue("lowBandwidth") && this.matrixClient.initCrypto) {
                await this.matrixClient.initCrypto();
                this.matrixClient.setCryptoTrustCrossSignedDevices(
                    !SettingsStore.getValue('e2ee.manuallyVerifyAllSessions'),
                );
                await tryToUnlockSecretStorageWithDehydrationKey(this.matrixClient);
                StorageManager.setCryptoInitialised(true);
            }
        } catch (e) {
            if (e && e.name === 'InvalidCryptoStoreError') {
                // The js-sdk found a crypto DB too new for it to use
                Modal.createDialog(CryptoStoreTooNewDialog);
            }
            // this can happen for a number of reasons, the most likely being
            // that the olm library was missing. It's not fatal.
            logger.warn("Unable to initialise e2e", e);
        }

        const opts = utils.deepCopy(this.opts);
        // the react sdk doesn't work without this, so don't allow
        opts.pendingEventOrdering = PendingEventOrdering.Detached;
        opts.lazyLoadMembers = true;
        opts.clientWellKnownPollPeriod = 2 * 60 * 60; // 2 hours
        opts.experimentalThreadSupport = SettingsStore.getValue("feature_thread");

        // Connect the matrix client to the dispatcher and setting handlers
        MatrixActionCreators.start(this.matrixClient);
        MatrixClientBackedSettingsHandler.matrixClient = this.matrixClient;

        return opts;
    }

    public async start(): Promise<any> {
        const opts = await this.assign();

        logger.log(`MatrixClientPeg: really starting MatrixClient`);
        await this.get().startClient(opts);
        logger.log(`MatrixClientPeg: MatrixClient started`);
    }

    public getCredentials(): IMatrixClientCreds {
        let copiedCredentials = this.currentClientCreds;
        if (this.currentClientCreds?.userId !== this.matrixClient?.credentials?.userId) {
            // cached credentials belong to a different user - don't use them
            copiedCredentials = null;
        }
        return {
            // Copy the cached credentials before overriding what we can.
            ...(copiedCredentials ?? {}),

            homeserverUrl: this.matrixClient.baseUrl,
            identityServerUrl: this.matrixClient.idBaseUrl,
            userId: this.matrixClient.credentials.userId,
            deviceId: this.matrixClient.getDeviceId(),
            accessToken: this.matrixClient.getAccessToken(),
            guest: this.matrixClient.isGuest(),
        };
    }

    public getHomeserverName(): string {
        const matches = /^@[^:]+:(.+)$/.exec(this.matrixClient.credentials.userId);
        if (matches === null || matches.length < 1) {
            throw new Error("Failed to derive homeserver name from user ID!");
        }
        return matches[1];
    }

    private createClient(creds: IMatrixClientCreds): void {
        const opts: ICreateClientOpts = {
            baseUrl: creds.homeserverUrl,
            idBaseUrl: creds.identityServerUrl,
            accessToken: creds.accessToken,
            userId: creds.userId,
            deviceId: creds.deviceId,
            pickleKey: creds.pickleKey,
            timelineSupport: true,
            forceTURN: !SettingsStore.getValue('webRtcAllowPeerToPeer'),
            fallbackICEServerAllowed: !!SettingsStore.getValue('fallbackICEServerAllowed'),
            // Gather up to 20 ICE candidates when a call arrives: this should be more than we'd
            // ever normally need, so effectively this should make all the gathering happen when
            // the call arrives.
            iceCandidatePoolSize: 20,
            verificationMethods: [
                verificationMethods.SAS,
                SHOW_QR_CODE_METHOD,
                verificationMethods.RECIPROCATE_QR_CODE,
            ],
            identityServer: new IdentityAuthClient(),
            cryptoCallbacks: {},
        };

        // These are always installed regardless of the labs flag so that
        // cross-signing features can toggle on without reloading and also be
        // accessed immediately after login.
        Object.assign(opts.cryptoCallbacks, crossSigningCallbacks);
        if (SecurityCustomisations.getDehydrationKey) {
            opts.cryptoCallbacks.getDehydrationKey =
                SecurityCustomisations.getDehydrationKey;
        }

        this.matrixClient = createMatrixClient(opts);

        // we're going to add eventlisteners for each matrix event tile, so the
        // potential number of event listeners is quite high.
        this.matrixClient.setMaxListeners(500);

        this.matrixClient.setGuest(Boolean(creds.guest));

        const notifTimelineSet = new EventTimelineSet(null, {
            timelineSupport: true,
            pendingEvents: false,
        });
        // XXX: what is our initial pagination token?! it somehow needs to be synchronised with /sync.
        notifTimelineSet.getLiveTimeline().setPaginationToken("", EventTimeline.BACKWARDS);
        this.matrixClient.setNotifTimelineSet(notifTimelineSet);
    }
}

/**
 * Note: You should be using a React context with access to a client rather than
 * using this, as in a multi-account world this will not exist!
 */
export const MatrixClientPeg: IMatrixClientPeg = new MatrixClientPegClass();

if (!window.mxMatrixClientPeg) {
    window.mxMatrixClientPeg = MatrixClientPeg;
}
