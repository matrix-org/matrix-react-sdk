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
import { logger } from "matrix-js-sdk/src/logger";

import defaultDispatcher from "../dispatcher/dispatcher";
import { ActionPayload } from "../dispatcher/payloads";
import { AsyncStoreWithClient } from "./AsyncStoreWithClient";
import { arrayDiff } from "../utils/arrays";
import {
    ClearWatchCallback,
    GeolocationError,
    mapGeolocationPositionToTimedGeo,
    TimedGeoUri,
    watchPosition,
} from "../utils/beacon";
import { getCurrentPosition } from "../utils/beacon/geolocation";

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
     * Track when the last position was published
     * So we can manually get position on slow interval
     * when the target is stationary
     */
    private lastPublishedPositionTimestamp: number | undefined;

    public constructor() {
        super(defaultDispatcher);
    }

    public static get instance(): OwnBeaconStore {
        return OwnBeaconStore.internalInstance;
    }

    /**
     * True when we have live beacons
     * and geolocation.watchPosition is active
     */
    public get isMonitoringLiveLocation(): boolean {
        return !!this.clearPositionWatch;
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

        // beacon expired, update beacon to un-alive state
        if (!isLive) {
            this.stopBeacon(beacon.identifier);
        }

        this.checkLiveness();

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

        const diff = arrayDiff(prevLiveBeaconIds, this.liveBeaconIds);

        if (diff.added.length || diff.removed.length) {
            this.emit(OwnBeaconStoreEvent.LivenessChange, this.liveBeaconIds);
        }

        // publish current location immediately
        // when there are new live beacons
        // and we already have a live monitor
        // so first position is published quickly
        // even when target is stationary
        //
        // when there is no existing live monitor
        // it will be created below by togglePollingLocation
        // and publish first position quickly
        if (diff.added.length && this.isMonitoringLiveLocation) {
            this.publishCurrentLocationToBeacons();
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

    private togglePollingLocation = async (): Promise<void> => {
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
            if (!this.lastPublishedPositionTimestamp) {
                return;
            }
            // if position was last updated STATIC_UPDATE_INTERVAL ms ago or more
            // get our position and publish it
            if (this.lastPublishedPositionTimestamp <= Date.now() - STATIC_UPDATE_INTERVAL) {
                this.publishCurrentLocationToBeacons();
            }
        }, STATIC_UPDATE_INTERVAL);
    };

    private onWatchedPosition = (position: GeolocationPosition) => {
        const timedGeoPosition = mapGeolocationPositionToTimedGeo(position);

        // if this is our first position, publish immediateley
        if (!this.lastPublishedPositionTimestamp) {
            this.publishLocationToBeacons(timedGeoPosition);
        } else {
            this.debouncedPublishLocationToBeacons(timedGeoPosition);
        }
    };

    private onWatchedPositionError = (error: GeolocationError) => {
        this.geolocationError = error;
        logger.error(this.geolocationError);
    };

    private stopPollingLocation = () => {
        clearInterval(this.locationInterval);
        this.locationInterval = undefined;
        this.lastPublishedPositionTimestamp = undefined;
        this.geolocationError = undefined;

        if (this.clearPositionWatch) {
            this.clearPositionWatch();
            this.clearPositionWatch = undefined;
        }
    };

    /**
     * Sends m.location events to all live beacons
     * Sets last published beacon
     */
    private publishLocationToBeacons = async (position: TimedGeoUri) => {
        this.lastPublishedPositionTimestamp = Date.now();
        // TODO handle failure in individual beacon without rejecting rest
        await Promise.all(this.liveBeaconIds.map(beaconId =>
            this.sendLocationToBeacon(this.beacons.get(beaconId), position)),
        );
    };

    private debouncedPublishLocationToBeacons = debounce(this.publishLocationToBeacons, MOVING_UPDATE_INTERVAL);

    /**
     * Sends m.location event to referencing given beacon
     */
    private sendLocationToBeacon = async (beacon: Beacon, { geoUri, timestamp }: TimedGeoUri) => {
        const content = makeBeaconContent(geoUri, timestamp, beacon.beaconInfoId);
        await this.matrixClient.sendEvent(beacon.roomId, M_BEACON.name, content);
    };

    /**
     * Gets the current location
     * (as opposed to using watched location)
     * and publishes it to all live beacons
     */
    private publishCurrentLocationToBeacons = async () => {
        const position = await getCurrentPosition();
        // TODO error handling
        this.publishLocationToBeacons(mapGeolocationPositionToTimedGeo(position));
    };
}
