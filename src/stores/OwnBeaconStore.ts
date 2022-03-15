import { RoomStateEvent, BeaconEvent, Room, Beacon } from "matrix-js-sdk/src/matrix";

import defaultDispatcher from "../dispatcher/dispatcher";
import { ActionPayload } from "../dispatcher/payloads";
import { AsyncStoreWithClient } from "./AsyncStoreWithClient";

const isOwnBeacon = (beacon: Beacon, userId: string): boolean => beacon.beaconInfoId === userId;

type OwnBeaconStoreState = {
    beacons: Map<string, Beacon>;
    beaconsByRoomId: Map<Room['roomId'], Set<string>>;
    roomIdsWithLiveBeacons: Room['roomId'][];
}
export class OwnBeaconStore extends AsyncStoreWithClient<OwnBeaconStoreState> {
    public readonly beacons = new Map<string, Beacon>();
    public readonly beaconsByRoomId = new Map<Room['roomId'], Set<string>>();
    private roomIdsWithLiveBeacons = [];
    private static internalInstance = new OwnBeaconStore();


    private constructor() {
        super(defaultDispatcher);
    }

    public static get instance(): OwnBeaconStore {
        return OwnBeaconStore.internalInstance;
    }

    protected async onNotReady() {

        await this.reset({});
    }

    protected async onReady() {
        this.matrixClient.on(BeaconEvent.LivenessChange, this.onBeaconLiveness);
        this.matrixClient.on(BeaconEvent.New, this.onNewBeacon);

        this.initialiseBeaconState();
    }

    protected async onAction(payload: ActionPayload): Promise<void> {
        // we don't actually do anything here
    }


    public hasLiveBeacons(roomId?: string): boolean {
        if (!roomId) {
            return !!this.roomIdsWithLiveBeacons.length;
        }
        return this.roomIdsWithLiveBeacons.includes(roomId);
    }

    private onNewBeacon(beacon: Beacon): void {
        console.log('hhh', 'this.onNewBeacon', beacon);
        if (!isOwnBeacon(beacon, this.matrixClient.getUserId())) {
            return;
        }
        this.addBeacon(beacon);
    }


    private onBeaconLiveness(isLive: boolean, beacon: Beacon): void {
        // check if we care about this beacon
        if (!this.beacons.has(beacon.beaconInfoId)) {
            return;
        }

        if (!isLive && this.roomIdsWithLiveBeacons.includes(beacon.beaconInfoId)) {
            this.roomIdsWithLiveBeacons = this.roomIdsWithLiveBeacons.filter(beaconId => beaconId !== beacon.beaconInfoId);
            // TODO emit something here?
        }

        if (isLive && !this.roomIdsWithLiveBeacons.includes(beacon.beaconInfoId)) {
            this.roomIdsWithLiveBeacons.push(beacon.beaconInfoId);
            // TODO emit something here?
        }

        console.log('hhh', 'this.onBeaconLiveness', isLive, beacon.beaconInfoId);
        // TODO stop or start polling here
        // if not content is live but beacon is not, update state event with live: false
    }

    private initialiseBeaconState() {
        const userId = this.matrixClient.getUserId();
        const visibleRooms = this.matrixClient.getVisibleRooms();
        visibleRooms
            // .filter(room => room.currentState.hasLiveBeacons)
            .forEach(room => {
                const roomState = room.currentState;
                const beacons = roomState.beacons;

                [...beacons.values()].filter(beacon => isOwnBeacon(beacon, userId)).forEach(beacon => this.addBeacon(beacon))

                console.log('hhh', 'beacons', beacons);
            })
    }

    private addBeacon(beacon: Beacon): void {
        this.beacons.set(beacon.beaconInfoId, beacon);

        if (!this.beaconsByRoomId.has(beacon.roomId)) {
            this.beaconsByRoomId.set(beacon.roomId, new Set<string>());
        }

        this.beaconsByRoomId.get(beacon.roomId).add(beacon.beaconInfoId);
        beacon.monitorLiveness();

        console.log('hhh', 'addBeacon', this.beacons, this.beaconsByRoomId)
    }

    private checkLiveness(): void {

    }
}

export default OwnBeaconStore.instance;