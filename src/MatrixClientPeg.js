/*
Copyright 2015, 2016 OpenMarket Ltd

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

const localStorage = window.localStorage;

function deviceId() {
    // XXX: is Math.random()'s deterministicity a problem here?
    var id = Math.floor(Math.random()*16777215).toString(16);
    id = "W" + "000000".substring(id.length) + id;
    return id;
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
    }

    get(): MatrixClient {
        return this.matrixClient;
    }

    unset() {
        this.matrixClient = null;
    }

    /**
     * Replace this MatrixClientPeg's client with a client instance that has
     * Home Server / Identity Server URLs but no credentials
     */
    replaceUsingUrls(hs_url, is_url) {
        this._replaceClient({
            hs_url: hs_url,
            is_url: is_url,
            device_id: deviceId(),
        });
    }

    /**
     * Replace this MatrixClientPeg's client with a client instance that has
     * Home Server / Identity Server URLs and active credentials
     */
    replaceUsingAccessToken(hs_url, is_url, user_id, access_token, isGuest,
                            device_id) {
        if (hs_url == null || is_url == null || user_id == null
            || access_token == null || isGuest == null
            || device_id == null
        ) {
            throw new Error("invalid parameters for replaceUsingAccessToken");
        }

        this._replaceClient({
            hs_url: hs_url,
            is_url: is_url,
            access_token: access_token,
            user_id: user_id,
            is_guest: isGuest,
        });
    }

    _replaceClient(opts) {
        if (localStorage) {
            try {
                localStorage.clear();
            } catch (e) {
                console.warn("Error clearing local storage", e);
            }
        }

        this._createClient(opts);

        if (localStorage) {
            try {
                localStorage.setItem("mx_hs_url", opts.hs_url);
                localStorage.setItem("mx_is_url", opts.is_url);

                if (opts.user_id !== undefined && opts.access_token !== undefined) {
                    localStorage.setItem("mx_user_id", opts.user_id);
                    localStorage.setItem("mx_access_token", opts.access_token);
                    localStorage.setItem("mx_is_guest", JSON.stringify(opts.is_guest));
                    console.log("Session persisted for %s", opts.user_id);
                }
            } catch (e) {
                console.warn("Error using local storage: can't persist session!", e);
            }
        } else {
            console.warn("No local storage available: can't persist session!");
        }
    }

    tryRestore() {
        if (localStorage) {
            const hs_url = localStorage.getItem("mx_hs_url");
            const is_url = localStorage.getItem("mx_is_url") || 'https://matrix.org';
            const access_token = localStorage.getItem("mx_access_token");
            const user_id = localStorage.getItem("mx_user_id");

            let is_guest;
            if (localStorage.getItem("mx_is_guest") !== null) {
                is_guest = localStorage.getItem("mx_is_guest") === "true";
            } else {
                // legacy key name
                is_guest = localStorage.getItem("matrix-is-guest") === "true";
            }

            if (access_token && user_id && hs_url) {
                console.log("Restoring session for %s", user_id);
                this._createClient({
                    hs_url: hs_url,
                    is_url: is_url,
                    access_token: access_token,
                    user_id: user_id,
                    is_guest: is_guest,
                });
            } else {
                console.log("Session not found.");
            }
        }
    }

    _createClient(opts) {
        console.log("Creating client with", opts);

        var clientOpts = {
            baseUrl: opts.hs_url,
            idBaseUrl: opts.is_url,
            accessToken: opts.access_token,
            userId: opts.user_id,
            timelineSupport: true,
        };

        if (localStorage) {
            clientOpts.sessionStore = new Matrix.WebStorageSessionStore(localStorage);
            clientOpts.deviceId = deviceId();
        }

        this.matrixClient = Matrix.createClient(clientOpts);

        // we're going to add eventlisteners for each matrix event tile, so the
        // potential number of event listeners is quite high.
        this.matrixClient.setMaxListeners(500);

        this.matrixClient.setGuest(Boolean(opts.is_guest));
    }
}

if (!global.mxMatrixClientPeg) {
    global.mxMatrixClientPeg = new MatrixClientPeg();
    global.mxMatrixClientPeg.tryRestore();
}
module.exports = global.mxMatrixClientPeg;
