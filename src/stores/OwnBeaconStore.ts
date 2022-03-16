import {
    BeaconEvent,
    Room,
    Beacon,
} from "matrix-js-sdk/src/matrix";

import defaultDispatcher from "../dispatcher/dispatcher";
import { ActionPayload } from "../dispatcher/payloads";
import { AsyncStoreWithClient } from "./AsyncStoreWithClient";

const isOwnBeacon = (beacon: Beacon, userId: string): boolean => beacon.beaconInfoOwner === userId;

export enum OwnBeaconStoreEvent {
    LivenessChange = 'OwnBeaconStore.LivenessChange'
}

type OwnBeaconStoreState = {
    beacons: Map<string, Beacon>;
    beaconsByRoomId: Map<Room['roomId'], Set<string>>;
    liveBeaconIds: string[];
};
export class OwnBeaconStore extends AsyncStoreWithClient<OwnBeaconStoreState> {
    private static internalInstance = new OwnBeaconStore();
    public readonly beacons = new Map<string, Beacon>();
    public readonly beaconsByRoomId = new Map<Room['roomId'], Set<string>>();
    private liveBeaconIds = [];

    public constructor() {
        super(defaultDispatcher);
    }

    public static get instance(): OwnBeaconStore {
        return OwnBeaconStore.internalInstance;
    }

    protected async onNotReady() {
        await this.reset({});
    }

    protected async onReady() {
        this.matrixClient.on(BeaconEvent.LivenessChange, this.onBeaconLiveness.bind(this));
        this.matrixClient.on(BeaconEvent.New, this.onNewBeacon.bind(this));
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

    private onNewBeacon(beacon: Beacon): void {
        if (!isOwnBeacon(beacon, this.matrixClient.getUserId())) {
            return;
        }
        this.addBeacon(beacon);
        this.checkLiveness();
    }

    private onBeaconLiveness(isLive: boolean, beacon: Beacon): void {
        // check if we care about this beacon
        if (!this.beacons.has(beacon.beaconInfoId)) {
            return;
        }

        if (!isLive && this.liveBeaconIds.includes(beacon.beaconInfoId)) {
            this.liveBeaconIds =
                this.liveBeaconIds.filter(beaconId => beaconId !== beacon.beaconInfoId);
        }

        if (isLive && !this.liveBeaconIds.includes(beacon.beaconInfoId)) {
            this.liveBeaconIds.push(beacon.beaconInfoId);
        }

        this.emit(OwnBeaconStoreEvent.LivenessChange, this.hasLiveBeacons());
        // TODO stop or start polling here
        // if not content is live but beacon is not, update state event with live: false
    }

    private initialiseBeaconState() {
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
    }

    private addBeacon(beacon: Beacon): void {
        this.beacons.set(beacon.beaconInfoId, beacon);

        if (!this.beaconsByRoomId.has(beacon.roomId)) {
            this.beaconsByRoomId.set(beacon.roomId, new Set<string>());
        }

        this.beaconsByRoomId.get(beacon.roomId).add(beacon.beaconInfoId);
        beacon.monitorLiveness();
    }

    private checkLiveness(): void {
        const prevLiveness = this.hasLiveBeacons();
        this.liveBeaconIds = [...this.beacons.values()]
            .filter(beacon => beacon.isLive)
            .map(beacon => beacon.beaconInfoId);

        const newLiveness = this.hasLiveBeacons();

        if (prevLiveness !== newLiveness) {
            this.emit(OwnBeaconStoreEvent.LivenessChange, newLiveness);
        }
    }
}
