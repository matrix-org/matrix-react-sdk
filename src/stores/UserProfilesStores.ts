/*
Copyright 2023 The Matrix.org Foundation C.I.C.

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

import { logger } from "matrix-js-sdk/src/logger";
import { IMatrixProfile, MatrixClient } from "matrix-js-sdk/src/matrix";

export class UserProfilesStore {
    private profiles = new Map<string, IMatrixProfile>();
    private knownProfiles = new Map<string, IMatrixProfile>();

    public constructor(private client?: MatrixClient) {}

    public getProfile(userId: string): IMatrixProfile | undefined {
        return this.profiles.get(userId);
    }

    public getOnlyKnownProfile(userId: string): IMatrixProfile | undefined {
        return this.knownProfiles.get(userId);
    }

    public async fetchProfile(userId: string): Promise<IMatrixProfile | undefined> {
        const profile = await this.lookUpProfile(userId);
        this.profiles.set(userId, profile);
        return profile;
    }

    public async fetchOnlyKnownProfile(userId: string): Promise<IMatrixProfile | undefined> {
        if (!this.knownProfiles.has(userId) && !this.isUserIdKnown(userId)) return undefined;

        const profile = await this.lookUpProfile(userId);
        this.knownProfiles.set(userId, profile);
        return profile;
    }

    private async lookUpProfile(userId: string): Promise<IMatrixProfile | undefined> {
        try {
            return await this.client?.getProfileInfo(userId);
        } catch (e) {
            logger.warn(`Error retrieving profile for userId ${userId}`, e);
        }

        return undefined;
    }

    private isUserIdKnown(userId: string): boolean {
        if (!this.client) return false;

        return this.client.getRooms().some((room) => {
            return !!room.getMember(userId);
        });
    }
}
