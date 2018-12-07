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

import dis from './dispatcher';
import Timer from './utils/Timer';

const CURRENTLY_ACTIVE_THRESHOLD_MS = 2000;

/**
 * This class watches for user activity (moving the mouse or pressing a key)
 * and starts/stops attached timers while the user is active.
 */
class UserActivity {

    constructor() {
        this._attachedTimers = [];
        this._activityTimeout = new Timer(CURRENTLY_ACTIVE_THRESHOLD_MS);
        this._onUserActivity = this._onUserActivity.bind(this);
        this.lastScreenX = 0;
        this.lastScreenY = 0;
    }

    /**
     * Runs the given timer (or the returned copy if it ran already)
     * while the user is active, aborting when the user becomes inactive.
     * Can be called multiple times with the same already running timer, which is a NO-OP.
     * Can be called before the user becomes active,
     * in which case it is only started later on when the user does become active.
     * @return {Timer} the timer, or a clone
     */
    timeWhileActive(timer) {
        // important this happens first
        const index = this._attachedTimers.indexOf(timer);
        if (index === -1) {
            this._attachedTimers.push(timer);
            // remove when done or aborted
            timer.finished().finally(() => {
                const index = this._attachedTimers.indexOf(timer);
                if (index !== -1) { // should not happen
                    this._attachedTimers.splice(index, 1);
                }
            }).catch((err) => {});  // as we fork the promise here,
                                    // avoid unhandled rejection warnings
        }
        if (this.userCurrentlyActive()) {
            timer.start();
        }
    }

    /**
     * Start listening to user activity
     */
    start() {
        document.onmousedown = this._onUserActivity;
        document.onmousemove = this._onUserActivity;
        document.onkeydown = this._onUserActivity;
        // can't use document.scroll here because that's only the document
        // itself being scrolled. Need to use addEventListener's useCapture.
        // also this needs to be the wheel event, not scroll, as scroll is
        // fired when the view scrolls down for a new message.
        window.addEventListener('wheel', this._onUserActivity,
                                { passive: true, capture: true });
    }

    /**
     * Stop tracking user activity
     */
    stop() {
        document.onmousedown = undefined;
        document.onmousemove = undefined;
        document.onkeydown = undefined;
        window.removeEventListener('wheel', this._onUserActivity,
                                   { passive: true, capture: true });
    }

    /**
     * Return true if there has been user activity very recently
     * (ie. within a few seconds)
     * @returns {boolean} true if user is currently/very recently active
     */
    userCurrentlyActive() {
        return this._activityTimeout.isRunning();
    }

    async _onUserActivity(event) {
        if (event.screenX && event.type === "mousemove") {
            if (event.screenX === this.lastScreenX && event.screenY === this.lastScreenY) {
                // mouse hasn't actually moved
                return;
            }
            this.lastScreenX = event.screenX;
            this.lastScreenY = event.screenY;
        }

        if (!this._activityTimeout.isRunning()) {
            this._activityTimeout.start();
            console.log("user is active now");
            dis.dispatch({action: 'user_activity_start'});
            this._attachedTimers.forEach((t) => t.start());
            await this._activityTimeout.finished();
            this._attachedTimers.forEach((t) => t.abort());
            console.log("user is inactive now");
        } else {
            this._activityTimeout.restart();
        }
    }
}


module.exports = new UserActivity();
