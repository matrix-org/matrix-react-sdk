/*
Copyright 2015, 2016 OpenMarket Ltd
Copyright 2017 Vector Creations Ltd

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

import q from 'q';
import Matrix from 'matrix-js-sdk';

import MatrixClientPeg from './MatrixClientPeg';
import Analytics from './Analytics';
import Notifier from './Notifier';
import UserActivity from './UserActivity';
import Presence from './Presence';
import dis from './dispatcher';
import DMRoomMap from './utils/DMRoomMap';
import RtsClient from './RtsClient';
import Modal from './Modal';
import sdk from './index';
import { _t } from './languageHandler';

/**
 * Called at startup, to attempt to build a logged-in Matrix session. It tries
 * a number of things:
 *
 * 0. if it looks like we are in the middle of a registration process, it does
 *    nothing.
 *
 * 1. if we have a loginToken in the (real) query params, it uses that to log
 *    in.
 *
 * 2. if we have a guest access token in the fragment query params, it uses
 *    that.
 *
 * 3. if an access token is stored in local storage (from a previous session),
 *    it uses that.
 *
 * 4. it attempts to auto-register as a guest user.
 *
 * If any of steps 1-4 are successful, it will call {setLoggedIn}, which in
 * turn will raise on_logged_in and will_start_client events.
 *
 * @param {object} opts
 *
 * @param {object} opts.realQueryParams: string->string map of the
 *     query-parameters extracted from the real query-string of the starting
 *     URI.
 *
 * @param {object} opts.fragmentQueryParams: string->string map of the
 *     query-parameters extracted from the #-fragment of the starting URI.
 *
 * @param {boolean} opts.enableGuest: set to true to enable guest access tokens
 *     and auto-guest registrations.
 *
 * @params {string} opts.guestHsUrl: homeserver URL. Only used if enableGuest is
 *     true; defines the HS to register against.
 *
 * @params {string} opts.guestIsUrl: homeserver URL. Only used if enableGuest is
 *     true; defines the IS to use.
 *
 * @returns {Promise} a promise which resolves when the above process completes.
 */
export function loadSession(opts) {
    const realQueryParams = opts.realQueryParams || {};
    const fragmentQueryParams = opts.fragmentQueryParams || {};
    let enableGuest = opts.enableGuest || false;
    const guestHsUrl = opts.guestHsUrl;
    const guestIsUrl = opts.guestIsUrl;
    const defaultDeviceDisplayName = opts.defaultDeviceDisplayName;

    if (fragmentQueryParams.client_secret && fragmentQueryParams.sid) {
        // this happens during email validation: the email contains a link to the
        // IS, which in turn redirects back to vector. We let MatrixChat create a
        // Registration component which completes the next stage of registration.
        console.log("Not registering as guest: registration already in progress.");
        return q();
    }

    if (!guestHsUrl) {
        console.warn("Cannot enable guest access: can't determine HS URL to use");
        enableGuest = false;
    }

    if (realQueryParams.loginToken) {
        if (!realQueryParams.homeserver) {
            console.warn("Cannot log in with token: can't determine HS URL to use");
        } else {
            return _loginWithToken(realQueryParams, defaultDeviceDisplayName);
        }
    }

    if (enableGuest &&
        fragmentQueryParams.guest_user_id &&
        fragmentQueryParams.guest_access_token
       ) {
        console.log("Using guest access credentials");
        setLoggedIn({
            userId: fragmentQueryParams.guest_user_id,
            accessToken: fragmentQueryParams.guest_access_token,
            homeserverUrl: guestHsUrl,
            identityServerUrl: guestIsUrl,
            guest: true,
        });
        return q();
    }

    return _restoreFromLocalStorage().then((success) => {
        if (success) {
            return;
        }

        if (enableGuest) {
            return _registerAsGuest(guestHsUrl, guestIsUrl, defaultDeviceDisplayName);
        }

        // fall back to login screen
    });
}

function _loginWithToken(queryParams, defaultDeviceDisplayName) {
    // create a temporary MatrixClient to do the login
    const client = Matrix.createClient({
        baseUrl: queryParams.homeserver,
    });

    return client.login(
        "m.login.token", {
            token: queryParams.loginToken,
            initial_device_display_name: defaultDeviceDisplayName,
        },
    ).then(function(data) {
        console.log("Logged in with token");
        setLoggedIn({
            userId: data.user_id,
            deviceId: data.device_id,
            accessToken: data.access_token,
            homeserverUrl: queryParams.homeserver,
            identityServerUrl: queryParams.identityServer,
            guest: false,
        });
    }, (err) => {
        console.error("Failed to log in with login token: " + err + " " +
                      err.data);
    });
}

function _registerAsGuest(hsUrl, isUrl, defaultDeviceDisplayName) {
    console.log("Doing guest login on %s", hsUrl);

    // TODO: we should probably de-duplicate this and Login.loginAsGuest.
    // Not really sure where the right home for it is.

    // create a temporary MatrixClient to do the login
    const client = Matrix.createClient({
        baseUrl: hsUrl,
    });

    return client.registerGuest({
        body: {
            initial_device_display_name: defaultDeviceDisplayName,
        },
    }).then((creds) => {
        console.log("Registered as guest: %s", creds.user_id);
        setLoggedIn({
            userId: creds.user_id,
            deviceId: creds.device_id,
            accessToken: creds.access_token,
            homeserverUrl: hsUrl,
            identityServerUrl: isUrl,
            guest: true,
        });
    }, (err) => {
        console.error("Failed to register as guest: " + err + " " + err.data);
    });
}

// returns a promise which resolves to true if a session is found in
// localstorage
function _restoreFromLocalStorage() {
    if (!localStorage) {
        return q(false);
    }
    const hsUrl = localStorage.getItem("mx_hs_url");
    const isUrl = localStorage.getItem("mx_is_url") || 'https://matrix.org';
    const accessToken = localStorage.getItem("mx_access_token");
    const userId = localStorage.getItem("mx_user_id");
    const deviceId = localStorage.getItem("mx_device_id");

    let isGuest;
    if (localStorage.getItem("mx_is_guest") !== null) {
        isGuest = localStorage.getItem("mx_is_guest") === "true";
    } else {
        // legacy key name
        isGuest = localStorage.getItem("matrix-is-guest") === "true";
    }

    if (accessToken && userId && hsUrl) {
        console.log("Restoring session for %s", userId);
        try {
            setLoggedIn({
                userId: userId,
                deviceId: deviceId,
                accessToken: accessToken,
                homeserverUrl: hsUrl,
                identityServerUrl: isUrl,
                guest: isGuest,
            });
            return q(true);
        } catch (e) {
            return _handleRestoreFailure(e);
        }
    } else {
        console.log("No previous session found.");
        return q(false);
    }
}

function _handleRestoreFailure(e) {
    console.log("Unable to restore session", e);

    let msg = e.message;
    if (msg == "OLM.BAD_LEGACY_ACCOUNT_PICKLE") {
        msg = _t(
            'You need to log back in to generate end-to-end encryption keys'
            + ' for this device and submit the public key to your homeserver.'
            + ' This is a once off; sorry for the inconvenience.',
        );

        _clearStorage();

        return q.reject(new Error(
            _t('Unable to restore previous session') + ': ' + msg,
        ));
    }

    const def = q.defer();
    const SessionRestoreErrorDialog =
          sdk.getComponent('views.dialogs.SessionRestoreErrorDialog');

    Modal.createDialog(SessionRestoreErrorDialog, {
        error: msg,
        onFinished: (success) => {
            def.resolve(success);
        },
    });

    return def.promise.then((success) => {
        if (success) {
            // user clicked continue.
            _clearStorage();
            return false;
        }

        // try, try again
        return _restoreFromLocalStorage();
    });
}

let rtsClient = null;
export function initRtsClient(url) {
    rtsClient = new RtsClient(url);
}

/**
 * Transitions to a logged-in state using the given credentials
 * @param {MatrixClientCreds} credentials The credentials to use
 */
export function setLoggedIn(credentials) {
    credentials.guest = Boolean(credentials.guest);

    Analytics.setGuest(credentials.guest);

    console.log(
        "setLoggedIn: mxid:", credentials.userId,
        "deviceId:", credentials.deviceId,
        "guest:", credentials.guest,
        "hs:", credentials.homeserverUrl,
    );
    // This is dispatched to indicate that the user is still in the process of logging in
    // because `teamPromise` may take some time to resolve, breaking the assumption that
    // `setLoggedIn` takes an "instant" to complete, and dispatch `on_logged_in` a few ms
    // later than MatrixChat might assume.
    dis.dispatch({action: 'on_logging_in'});

    // Resolves by default
    let teamPromise = Promise.resolve(null);

    // persist the session
    if (localStorage) {
        try {
            localStorage.setItem("mx_hs_url", credentials.homeserverUrl);
            localStorage.setItem("mx_is_url", credentials.identityServerUrl);
            localStorage.setItem("mx_user_id", credentials.userId);
            localStorage.setItem("mx_access_token", credentials.accessToken);
            localStorage.setItem("mx_is_guest", JSON.stringify(credentials.guest));

            // if we didn't get a deviceId from the login, leave mx_device_id unset,
            // rather than setting it to "undefined".
            //
            // (in this case MatrixClient doesn't bother with the crypto stuff
            // - that's fine for us).
            if (credentials.deviceId) {
                localStorage.setItem("mx_device_id", credentials.deviceId);
            }

            console.log("Session persisted for %s", credentials.userId);
        } catch (e) {
            console.warn("Error using local storage: can't persist session!", e);
        }

        if (rtsClient && !credentials.guest) {
            teamPromise = rtsClient.login(credentials.userId).then((body) => {
                if (body.team_token) {
                    localStorage.setItem("mx_team_token", body.team_token);
                }
                return body.team_token;
            });
        }
    } else {
        console.warn("No local storage available: can't persist session!");
    }

    // stop any running clients before we create a new one with these new credentials
    //
    // XXX: why do we have any running clients here? Maybe on sign-in after
    // initial use as a guest? but what about our persistent storage? we need to
    // be careful not to leak e2e data created as one user into another session.
    stopMatrixClient();

    MatrixClientPeg.replaceUsingCreds(credentials);

    teamPromise.then((teamToken) => {
        dis.dispatch({action: 'on_logged_in', teamToken: teamToken});
    }, (err) => {
        console.warn("Failed to get team token on login", err);
        dis.dispatch({action: 'on_logged_in', teamToken: null});
    });

    startMatrixClient();
}

/**
 * Logs the current session out and transitions to the logged-out state
 */
export function logout() {
    if (MatrixClientPeg.get().isGuest()) {
        // logout doesn't work for guest sessions
        // Also we sometimes want to re-log in a guest session
        // if we abort the login

        // use settimeout to avoid racing with react unmounting components
        // which need a valid matrixclientpeg
        setTimeout(()=>{
            onLoggedOut();
        }, 0);
        return;
    }

    MatrixClientPeg.get().logout().then(onLoggedOut,
        (err) => {
            // Just throwing an error here is going to be very unhelpful
            // if you're trying to log out because your server's down and
            // you want to log into a different server, so just forget the
            // access token. It's annoying that this will leave the access
            // token still valid, but we should fix this by having access
            // tokens expire (and if you really think you've been compromised,
            // change your password).
            console.log("Failed to call logout API: token will not be invalidated");
            onLoggedOut();
        },
    ).done();
}

/**
 * Starts the matrix client and all other react-sdk services that
 * listen for events while a session is logged in.
 */
export function startMatrixClient() {
    // dispatch this before starting the matrix client: it's used
    // to add listeners for the 'sync' event so otherwise we'd have
    // a race condition (and we need to dispatch synchronously for this
    // to work).
    dis.dispatch({action: 'will_start_client'}, true);

    Notifier.start();
    UserActivity.start();
    Presence.start();
    DMRoomMap.makeShared().start();

    MatrixClientPeg.start();
}

/*
 * Stops a running client and all related services, used after
 * a session has been logged out / ended.
 */
export function onLoggedOut() {
    stopMatrixClient(true);
    dis.dispatch({action: 'on_logged_out'});
}

function _clearStorage() {
    Analytics.logout();

    const cli = MatrixClientPeg.get();
    if (cli) {
        // TODO: *really* ought to wait for the promise to complete
        cli.clearStores().done();
    }

    if (!window.localStorage) {
        return;
    }
    const hsUrl = window.localStorage.getItem("mx_hs_url");
    const isUrl = window.localStorage.getItem("mx_is_url");
    window.localStorage.clear();

    // preserve our HS & IS URLs for convenience
    // N.B. we cache them in hsUrl/isUrl and can't really inline them
    // as getCurrentHsUrl() may call through to localStorage.
    // NB. We do clear the device ID (as well as all the settings)
    if (hsUrl) window.localStorage.setItem("mx_hs_url", hsUrl);
    if (isUrl) window.localStorage.setItem("mx_is_url", isUrl);
}

/**
 * Stop all the background processes related to the current client.
 *
 * Optionally clears persistent stores.
 *
 * @param {boolean} clearStores true to clear the persistent stores.
 */
export function stopMatrixClient(clearStores) {
    Notifier.stop();
    UserActivity.stop();
    Presence.stop();
    if (DMRoomMap.shared()) DMRoomMap.shared().stop();
    const cli = MatrixClientPeg.get();
    if (cli) {
        cli.stopClient();
        cli.removeAllListeners();
    }

    if (clearStores) {
        // note that we have to do this *after* stopping the client, but
        // *before* clearing the MatrixClientPeg.
        _clearStorage();
    }

    MatrixClientPeg.unset();
}
