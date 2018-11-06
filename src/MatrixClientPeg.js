/*
Copyright 2015, 2016 OpenMarket Ltd
Copyright 2017 Vector Creations Ltd.
Copyright 2017 New Vector Ltd

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

'use strict';

import Matrix from 'matrix-js-sdk';

import utils from 'matrix-js-sdk/lib/utils';
import EventTimeline from 'matrix-js-sdk/lib/models/event-timeline';
import EventTimelineSet from 'matrix-js-sdk/lib/models/event-timeline-set';
import createMatrixClient from './utils/createMatrixClient';
import SettingsStore from './settings/SettingsStore';
import MatrixActionCreators from './actions/MatrixActionCreators';
import {phasedRollOutExpiredForUser} from "./PhasedRollOut";

interface MatrixClientCreds {
    homeserverUrl: string,
    identityServerUrl: string,
    userId: string,
    deviceId: string,
    accessToken: string,
    guest: boolean,
}

/**
 * Wrapper object for handling the js-sdk Matrix Client object in the react-sdk
 * Handles the creation/initialisation of client objects.
 * This module provides a singleton instance of this class so the 'current'
 * Matrix Client object is available easily.
 */
class MatrixClientPeg {
    constructor() {
        this.matrixClient = null;

        // These are the default options used when when the
        // client is started in 'start'. These can be altered
        // at any time up to after the 'will_start_client'
        // event is finished processing.
        this.opts = {
            initialSyncLimit: 20,
        };
        // the credentials used to init the current client object.
        // used if we tear it down & recreate it with a different store
        this._currentClientCreds = null;
    }

    /**
     * Sets the script href passed to the IndexedDB web worker
     * If set, a separate web worker will be started to run the IndexedDB
     * queries on.
     *
     * @param {string} script href to the script to be passed to the web worker
     */
    setIndexedDbWorkerScript(script) {
        createMatrixClient.indexedDbWorkerScript = script;
    }

    get(): MatrixClient {
        return this.matrixClient;
    }

    unset() {
        this.matrixClient = null;

        MatrixActionCreators.stop();
    }

    /**
     * Replace this MatrixClientPeg's client with a client instance that has
     * Home Server / Identity Server URLs and active credentials
     */
    replaceUsingCreds(creds: MatrixClientCreds) {
        this._currentClientCreds = creds;
        this._createClient(creds);
    }

    async start() {
        for (const dbType of ['indexeddb', 'memory']) {
            try {
                const promise = this.matrixClient.store.startup();
                console.log("MatrixClientPeg: waiting for MatrixClient store to initialise");
                await promise;
                break;
            } catch (err) {
                if (dbType === 'indexeddb') {
                    console.error('Error starting matrixclient store - falling back to memory store', err);
                    this.matrixClient.store = new Matrix.MatrixInMemoryStore({
                      localStorage: global.localStorage,
                    });
                } else {
                    console.error('Failed to start memory store!', err);
                    throw err;
                }
            }
        }

        // try to initialise e2e on the new client
        try {
            // check that we have a version of the js-sdk which includes initCrypto
            if (this.matrixClient.initCrypto) {
                await this.matrixClient.initCrypto();
            }
        } catch (e) {
            // this can happen for a number of reasons, the most likely being
            // that the olm library was missing. It's not fatal.
            console.warn("Unable to initialise e2e: " + e);
        }

        const opts = utils.deepCopy(this.opts);
        // the react sdk doesn't work without this, so don't allow
        opts.pendingEventOrdering = "detached";

        const LAZY_LOADING_FEATURE = "feature_lazyloading";
        if (SettingsStore.isFeatureEnabled(LAZY_LOADING_FEATURE)) {
            const userId = this.matrixClient.credentials.userId;
            if (phasedRollOutExpiredForUser(userId, LAZY_LOADING_FEATURE, Date.now())) {
                opts.lazyLoadMembers = true;
            }
        }

        // Connect the matrix client to the dispatcher
        MatrixActionCreators.start(this.matrixClient);

        console.log(`MatrixClientPeg: really starting MatrixClient`);
        await this.get().startClient(opts);
        console.log(`MatrixClientPeg: MatrixClient started`);
    }

    getCredentials(): MatrixClientCreds {
        return {
            homeserverUrl: this.matrixClient.baseUrl,
            identityServerUrl: this.matrixClient.idBaseUrl,
            userId: this.matrixClient.credentials.userId,
            deviceId: this.matrixClient.getDeviceId(),
            accessToken: this.matrixClient.getAccessToken(),
            guest: this.matrixClient.isGuest(),
        };
    }

    /**
     * Return the server name of the user's home server
     * Throws an error if unable to deduce the home server name
     * (eg. if the user is not logged in)
     */
    getHomeServerName() {
        const matches = /^@.+:(.+)$/.exec(this.matrixClient.credentials.userId);
        if (matches === null || matches.length < 1) {
            throw new Error("Failed to derive home server name from user ID!");
        }
        return matches[1];
    }

    _createClient(creds: MatrixClientCreds, useIndexedDb) {
        const opts = {
            baseUrl: creds.homeserverUrl,
            idBaseUrl: creds.identityServerUrl,
            accessToken: creds.accessToken,
            userId: creds.userId,
            deviceId: creds.deviceId,
            timelineSupport: true,
            forceTURN: SettingsStore.getValue('webRtcForceTURN', false),
        };

        this.matrixClient = createMatrixClient(opts, useIndexedDb);

        // we're going to add eventlisteners for each matrix event tile, so the
        // potential number of event listeners is quite high.
        this.matrixClient.setMaxListeners(500);

        this.matrixClient.setGuest(Boolean(creds.guest));

        const notifTimelineSet = new EventTimelineSet(null, {
            timelineSupport: true,
        });
        // XXX: what is our initial pagination token?! it somehow needs to be synchronised with /sync.
        notifTimelineSet.getLiveTimeline().setPaginationToken("", EventTimeline.BACKWARDS);
        this.matrixClient.setNotifTimelineSet(notifTimelineSet);
    }
}

if (!global.mxMatrixClientPeg) {
    global.mxMatrixClientPeg = new MatrixClientPeg();
}
export default global.mxMatrixClientPeg;
