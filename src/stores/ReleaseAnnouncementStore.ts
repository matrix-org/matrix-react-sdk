/*
 *
 * Copyright 2024 The Matrix.org Foundation C.I.C.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 * /
 */

import { TypedEventEmitter } from "matrix-js-sdk/src/matrix";
import { logger } from "matrix-js-sdk/src/logger";

import SettingsStore from "../settings/SettingsStore";
import { SettingLevel } from "../settings/SettingLevel";

/**
 * The features are shown in the array order.
 */
const FEATURES = ["threadsActivityCentre"] as const;
/**
 * All the features that can be shown in the release announcements.
 */
export type Features = (typeof FEATURES)[number];
/**
 * The stored settings for the release announcements.
 */
type StoredSettings = Record<Features, boolean>;

/**
 * The events emitted by the ReleaseAnnouncementStore.
 */
type ReleaseAnnouncementStoreEvents = "releaseAnnouncementChanged";
/**
 * The handlers for the ReleaseAnnouncementStore events.
 */
type HandlerMap = {
    releaseAnnouncementChanged: (newName: Features | null) => void;
};

/**
 * The ReleaseAnnouncementStore is responsible for managing the release announcements.
 * It keeps track of the viewed release announcements and emits events when the release announcement changes.
 */
export class ReleaseAnnouncementStore extends TypedEventEmitter<ReleaseAnnouncementStoreEvents, HandlerMap> {
    /**
     * The singleton instance of the ReleaseAnnouncementStore.
     * @private
     */
    private static internalInstance: ReleaseAnnouncementStore;
    /**
     * The index of the feature to show.
     * @private
     */
    private index = 0;

    /**
     * The singleton instance of the ReleaseAnnouncementStore.
     */
    public static get instance(): ReleaseAnnouncementStore {
        if (!ReleaseAnnouncementStore.internalInstance) {
            ReleaseAnnouncementStore.internalInstance = new ReleaseAnnouncementStore();
        }
        return ReleaseAnnouncementStore.internalInstance;
    }

    /**
     * The constructor is private to prevent multiple instances.
     * @private
     */
    private constructor() {
        super();
        SettingsStore.watchSetting("releaseAnnouncement", null, () =>
            this.emit("releaseAnnouncementChanged", this.getReleaseAnnouncement()),
        );
    }

    /**
     * Get the viewed release announcements from the settings.
     * @private
     */
    private getViewedReleaseAnnouncements(): StoredSettings {
        return SettingsStore.getValue<StoredSettings>("releaseAnnouncement", null);
    }

    /**
     * Get the release announcement that should be displayed
     * @returns The feature to announce or null if there is no feature to announce
     */
    public getReleaseAnnouncement(): Features | null {
        const viewedReleaseAnnouncements = this.getViewedReleaseAnnouncements();

        // Find the first feature that has not been viewed
        for (let i = this.index; i < FEATURES.length; i++) {
            if (!viewedReleaseAnnouncements[FEATURES[i]]) {
                this.index = i;
                return FEATURES[this.index];
            }
        }

        // All features have been viewed
        return null;
    }

    /**
     * Mark the current release announcement as viewed.
     * This will update the account settings
     * @private
     */
    private async markReleaseAnnouncementAsViewed(): Promise<void> {
        const viewedReleaseAnnouncements = this.getViewedReleaseAnnouncements();

        // If the index is out of bounds, do nothing
        // Normally it shouldn't happen, but it's better to be safe
        const feature = FEATURES[this.index];
        if (!feature) return;

        // Mark the feature as viewed
        viewedReleaseAnnouncements[FEATURES[this.index]] = true;

        // Do sanity check id we can store the new value in the settings
        const isSupported = SettingsStore.isLevelSupported(SettingLevel.ACCOUNT);
        if (!isSupported) return;

        const canSetValue = SettingsStore.canSetValue("releaseAnnouncement", null, SettingLevel.ACCOUNT);
        if (canSetValue) {
            try {
                await SettingsStore.setValue(
                    "releaseAnnouncement",
                    null,
                    SettingLevel.ACCOUNT,
                    viewedReleaseAnnouncements,
                );
            } catch (e) {
                logger.log("Failed to set release announcement settings", e);
            }
        }
    }

    /**
     * Mark the current release announcement as viewed and move to the next release announcement.
     * This will update the account settings and emit the `releaseAnnouncementChanged` event
     */
    public async nextReleaseAnnouncement(): Promise<void> {
        await this.markReleaseAnnouncementAsViewed();

        this.index++;
        this.emit("releaseAnnouncementChanged", this.getReleaseAnnouncement());
    }
}
