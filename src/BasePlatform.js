// @flow

/*
Copyright 2016 Aviral Dasgupta
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

import dis from './dispatcher';

/**
 * Base class for classes that provide platform-specific functionality
 * eg. Setting an application badge or displaying notifications
 *
 * Instances of this class are provided by the application.
 */
export default class BasePlatform {
    constructor() {
        this.notificationCount = 0;
        this.errorDidOccur = false;

        dis.register(this._onAction.bind(this));
    }

    _onAction(payload: Object) {
        switch (payload.action) {
            case 'on_logged_out':
                this.setNotificationCount(0);
                break;
        }
    }

    // Used primarily for Analytics
    getHumanReadableName(): string {
        return 'Base Platform';
    }

    setNotificationCount(count: number) {
        this.notificationCount = count;
    }

    setErrorStatus(errorDidOccur: boolean) {
        this.errorDidOccur = errorDidOccur;
    }

    /**
     * Returns true if the platform supports displaying
     * notifications, otherwise false.
     * @returns {boolean} whether the platform supports displaying notifications
     */
    supportsNotifications(): boolean {
        return false;
    }

    /**
     * Returns true if the application currently has permission
     * to display notifications. Otherwise false.
     * @returns {boolean} whether the application has permission to display notifications
     */
    maySendNotifications(): boolean {
        return false;
    }

    /**
     * Requests permission to send notifications. Returns
     * a promise that is resolved when the user has responded
     * to the request. The promise has a single string argument
     * that is 'granted' if the user allowed the request or
     * 'denied' otherwise.
     */
    requestNotificationPermission(): Promise<string> {
    }

    displayNotification(title: string, msg: string, avatarUrl: string, room: Object) {
    }

    loudNotification(ev: Event, room: Object) {
    }

    /**
     * Returns a promise that resolves to a string representing
     * the current version of the application.
     */
    getAppVersion(): Promise<string> {
        throw new Error("getAppVersion not implemented!");
    }

    /*
     * If it's not expected that capturing the screen will work
     * with getUserMedia, return a string explaining why not.
     * Otherwise, return null.
     */
    screenCaptureErrorString(): string {
        return "Not implemented";
    }

    isElectron(): boolean { return false; }

    setupScreenSharingForIframe() {
    }

    /**
     * Restarts the application, without neccessarily reloading
     * any application code
     */
    reload() {
        throw new Error("reload not implemented!");
    }
}
