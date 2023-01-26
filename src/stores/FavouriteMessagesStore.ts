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

import { IContent } from "matrix-js-sdk/src/models/event";

import SettingsStore from "../settings/SettingsStore";
import defaultDispatcher from "../dispatcher/dispatcher";
import { Action } from "../dispatcher/actions";
import { ActionPayload } from "../dispatcher/payloads";
import { AsyncStore } from "./AsyncStore";
import { SettingLevel } from "../settings/SettingLevel";

export interface FavouriteStorage {
    eventId: string;
    roomId: string;
    content: IContent;
}

interface IState {
    favourite_messages: FavouriteStorage[];
}

const settingName = "favourite_messages";

/**
 * Stores favourite messages, backed by the SettingsStore.
 */
export class FavouriteMessagesStore extends AsyncStore<IState> {
    private static internalInstance = new FavouriteMessagesStore();
    private updateListeners: (() => void)[] = [];

    /**
     * Public for test. For normal usage, use the global instance at
     * FavouriteMessagesStore.instance
     */
    public constructor() {
        super(defaultDispatcher, { favourite_messages: SettingsStore.getValue(settingName) });
        SettingsStore.monitorSetting(settingName, null);
    }

    /**
     * Get the global instance of this store.
     *
     * NOTE: you can also make your own instance for testing. If you do make a
     * new instance, anyone who is listening to a different instane will not
     * be notified about changes to this instance.
     */
    public static get instance(): FavouriteMessagesStore {
        return FavouriteMessagesStore.internalInstance;
    }

    /**
     * @returns true if the message with this eventId is a favourite.
     */
    public isFavourite(eventId: string): boolean {
        return this.state.favourite_messages.some((f) => f.eventId === eventId);
    }

    /**
     * If the message with the supplied eventId is a favourite, make it not a
     * favourite. If it's not a favourite, make it a favourite.
     *
     * Requires only eventId to match to find an existing message.
     *
     * Ignores roomId and content if the favourite already exists and we are just
     * unfavouriting it.
     *
     * If we are making a new favourite, stores roomId and content alongside it.
     */
    public async toggleFavourite(eventId: string, roomId: string, content: IContent): Promise<void> {
        // Take a copy to modify
        const favouriteMessages = this.state.favourite_messages.slice();

        const idx = favouriteMessages.findIndex((f) => f.eventId === eventId);
        if (idx !== -1) {
            favouriteMessages.splice(idx, 1);
        } else {
            favouriteMessages.push({ eventId, roomId, content });
        }

        const newState: IState = { favourite_messages: favouriteMessages };
        await this.updateState(newState);

        // Don't await SettingsStore.setValue - fire and forget
        SettingsStore.setValue(settingName, null, SettingLevel.ACCOUNT, favouriteMessages);
    }

    /**
     * Clear the entire list of favourite messages, so no messages are favourite
     * any more.
     */
    public async clearAll(): Promise<void> {
        const newState: IState = { favourite_messages: [] };
        await this.reset(newState);
        // Don't await SettingsStore.setValue - fire and forget
        SettingsStore.setValue(settingName, null, SettingLevel.ACCOUNT, []);
    }

    /**
     * @returns a copy of the list of all favourite messages.
     */
    public allFavourites(): FavouriteStorage[] {
        return JSON.parse(JSON.stringify(this.state.favourite_messages));
    }

    public addUpdatedListener(listener: () => void): void {
        this.updateListeners.push(listener);
    }

    public removeUpdatedListener(listener: () => void): void {
        this.updateListeners = this.updateListeners.filter((l) => l !== listener);
    }

    protected async onDispatch(payload: ActionPayload): Promise<void> {
        if (payload.action === Action.SettingUpdated && payload.settingName === settingName) {
            const newValue = payload.newValueAtLevel;
            this.updateState({ favourite_messages: newValue });
            for (const listener of this.updateListeners) {
                listener();
            }
        }
    }
}
