/*
Copyright 2022 The Matrix.org Foundation C.I.C.

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

import { debounce } from "lodash";
import {
    Beacon,
    BeaconEvent,
    MatrixEvent,
    Room,
} from "matrix-js-sdk/src/matrix";
import {
    BeaconInfoState, makeBeaconContent, makeBeaconInfoContent,
} from "matrix-js-sdk/src/content-helpers";
import { M_BEACON } from "matrix-js-sdk/src/@types/beacon";

import defaultDispatcher from "../dispatcher/dispatcher";
import { ActionPayload } from "../dispatcher/payloads";
import { AsyncStoreWithClient } from "./AsyncStoreWithClient";
import { arrayHasDiff } from "../utils/arrays";
import {
    ClearWatchCallback,
    GeolocationError,
    mapGeolocationPositionToTimedGeo,
    TimedGeoUri,
    watchPosition,
} from "../utils/beacon";

const isOwnBeacon = (beacon: Beacon, userId: string): boolean => beacon.beaconInfoOwner === userId;

export enum OwnBeaconStoreEvent {
    LivenessChange = 'OwnBeaconStore.LivenessChange',
}

const MOVING_UPDATE_INTERVAL = 2000;
const STATIC_UPDATE_INTERVAL = 30000;

type OwnBeaconStoreState = {
    beacons: Map<string, Beacon>;
    beaconsByRoomId: Map<Room['roomId'], Set<string>>;
    liveBeaconIds: string[];
};
export class OwnBeaconStore extends AsyncStoreWithClient<OwnBeaconStoreState> {
    private static internalInstance = new OwnBeaconStore();
    // users beacons, keyed by event type
    public readonly beacons = new Map<string, Beacon>();
    public readonly beaconsByRoomId = new Map<Room['roomId'], Set<string>>();
    private liveBeaconIds = [];
    private locationInterval: number;
    private geolocationError: GeolocationError | undefined;
    private clearPositionWatch: ClearWatchCallback | undefined;
    /**
     * Track the last published position and when it was published
     * so it can be republished while the user is static
     */
    private lastPublishedPosition: { position: TimedGeoUri, publishedTimestamp: number } | undefined;

    public constructor() {
        super(defaultDispatcher);
    }

    public static get instance(): OwnBeaconStore {
        return OwnBeaconStore.internalInstance;
    }

    protected async onNotReady() {
        this.matrixClient.removeListener(BeaconEvent.LivenessChange, this.onBeaconLiveness);
        this.matrixClient.removeListener(BeaconEvent.New, this.onNewBeacon);

        this.beacons.forEach(beacon => beacon.destroy());

        this.stopPollingLocation();
        this.beacons.clear();
        this.beaconsByRoomId.clear();
        this.liveBeaconIds = [];
    }

    protected async onReady(): Promise<void> {
        this.matrixClient.on(BeaconEvent.LivenessChange, this.onBeaconLiveness);
        this.matrixClient.on(BeaconEvent.New, this.onNewBeacon);

        this.initialiseBeaconState();
    }

    protected async onAction(payload: ActionPayload): Promise<void> {
        // we don't actually do anything here
    }

    public hasLiveBeacons(roomId?: string): boolean {
        return !!this.getLiveBeaconIds(roomId).length;
    }

    public getLiveBeaconIds(roomId?: string): string[] {
        if (!roomId) {
            return this.liveBeaconIds;
        }
        return this.liveBeaconIds.filter(beaconId => this.beaconsByRoomId.get(roomId)?.has(beaconId));
    }

    public getBeaconById(beaconId: string): Beacon | undefined {
        return this.beacons.get(beaconId);
    }

    public stopBeacon = async (beaconInfoType: string): Promise<void> => {
        const beacon = this.beacons.get(beaconInfoType);
        // if no beacon, or beacon is already explicitly set isLive: false
        // do nothing
        if (!beacon?.beaconInfo?.live) {
            return;
        }

        return await this.updateBeaconEvent(beacon, { live: false });
    };

    private onNewBeacon = (_event: MatrixEvent, beacon: Beacon): void => {
        if (!isOwnBeacon(beacon, this.matrixClient.getUserId())) {
            return;
        }
        this.addBeacon(beacon);
        this.checkLiveness();
    };

    private onBeaconLiveness = (isLive: boolean, beacon: Beacon): void => {
        // check if we care about this beacon
        if (!this.beacons.has(beacon.identifier)) {
            return;
        }

        if (!isLive && this.liveBeaconIds.includes(beacon.identifier)) {
            this.liveBeaconIds =
                this.liveBeaconIds.filter(beaconId => beaconId !== beacon.identifier);
        }

        if (isLive && !this.liveBeaconIds.includes(beacon.identifier)) {
            this.liveBeaconIds.push(beacon.identifier);
        }

        // beacon expired, update beacon to un-alive state
        if (!isLive) {
            this.stopBeacon(beacon.identifier);
        }

        // TODO start location polling here

        this.emit(OwnBeaconStoreEvent.LivenessChange, this.getLiveBeaconIds());
    };

    private initialiseBeaconState = () => {
        const userId = this.matrixClient.getUserId();
        const visibleRooms = this.matrixClient.getVisibleRooms();

        visibleRooms
            .forEach(room => {
                const roomState = room.currentState;
                const beacons = roomState.beacons;
                const ownBeaconsArray = [...beacons.values()].filter(beacon => isOwnBeacon(beacon, userId));
                ownBeaconsArray.forEach(beacon => this.addBeacon(beacon));
            });

        this.checkLiveness();
    };

    private addBeacon = (beacon: Beacon): void => {
        this.beacons.set(beacon.identifier, beacon);

        if (!this.beaconsByRoomId.has(beacon.roomId)) {
            this.beaconsByRoomId.set(beacon.roomId, new Set<string>());
        }

        this.beaconsByRoomId.get(beacon.roomId).add(beacon.identifier);

        beacon.monitorLiveness();
    };

    private checkLiveness = (): void => {
        const prevLiveBeaconIds = this.getLiveBeaconIds();
        this.liveBeaconIds = [...this.beacons.values()]
            .filter(beacon => beacon.isLive)
            .map(beacon => beacon.identifier);

        if (arrayHasDiff(prevLiveBeaconIds, this.liveBeaconIds)) {
            this.emit(OwnBeaconStoreEvent.LivenessChange, this.liveBeaconIds);
        }

        // if overall liveness changed
        if (!!prevLiveBeaconIds?.length !== !!this.liveBeaconIds.length) {
            this.togglePollingLocation();
        }
    };

    private updateBeaconEvent = async (beacon: Beacon, update: Partial<BeaconInfoState>): Promise<void> => {
        const { description, timeout, timestamp, live, assetType } = {
            ...beacon.beaconInfo,
            ...update,
        };

        const updateContent = makeBeaconInfoContent(timeout,
            live,
            description,
            assetType,
            timestamp);

        await this.matrixClient.unstable_setLiveBeacon(beacon.roomId, beacon.beaconInfoEventType, updateContent);
    };

    private togglePollingLocation = () => {
        if (!!this.liveBeaconIds.length) {
            return this.startPollingLocation();
        }
        return this.stopPollingLocation();
    };

    private startPollingLocation = async () => {
        // clear any existing interval
        this.stopPollingLocation();

        this.clearPositionWatch = await watchPosition(this.onWatchedPosition, this.onWatchedPositionError);

        this.locationInterval = setInterval(() => {
            if (!this.lastPublishedPosition) {
                return;
            }
            // TODO should this use the timestamp the position was taken,
            // or a new timestamp when we send it
            const { publishedTimestamp, position } = this.lastPublishedPosition;
            // if position was last updated STATIC_UPDATE_INTERVAL ms ago or more
            // republish our last position 
            if (publishedTimestamp <= Date.now() - STATIC_UPDATE_INTERVAL) {
                this.publishLocationToBeacons(position);
            }
        }, STATIC_UPDATE_INTERVAL);
    };

    private onWatchedPosition = (position: GeolocationPosition) => {
        const timedGeoPosition = mapGeolocationPositionToTimedGeo(position);

        // if this is our first position, publish immediateley
        if (!this.lastPublishedPosition) {
            this.publishLocationToBeacons(timedGeoPosition);
        } else {
            this.debouncedPublishLocationToBeacons(timedGeoPosition);
        }
    };

    private onWatchedPositionError = (error: GeolocationError) => {
        this.geolocationError = error;
    };

    private stopPollingLocation = () => {
        clearInterval(this.locationInterval);
        this.locationInterval = null;

        if (this.clearPositionWatch) {
            this.clearPositionWatch();
            this.clearPositionWatch = undefined;
        }
    };

    private publishLocationToBeacons = async (position: TimedGeoUri) => {
        // TODO handle failure in individual beacon without rejecting rest
        await Promise.all(this.liveBeaconIds.map(beaconId =>
            this.sendLocationToBeacon(this.beacons.get(beaconId), position)),
        );

        this.lastPublishedPosition = { position, publishedTimestamp: Date.now() };
    };

    private debouncedPublishLocationToBeacons = debounce(this.publishLocationToBeacons, MOVING_UPDATE_INTERVAL);

    private sendLocationToBeacon = async (beacon: Beacon, { geoUri, timestamp }: TimedGeoUri) => {
        const content = makeBeaconContent(geoUri, timestamp, beacon.beaconInfoId);
        await this.matrixClient.sendEvent(beacon.roomId, M_BEACON.name, content);
    };
}
