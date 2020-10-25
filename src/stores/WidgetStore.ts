/*
Copyright 2020 The Matrix.org Foundation C.I.C.

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

import { Room } from "matrix-js-sdk/src/models/room";
import { MatrixEvent } from "matrix-js-sdk/src/models/event";
import { IWidget } from "matrix-widget-api";

import { ActionPayload } from "../dispatcher/payloads";
import { AsyncStoreWithClient } from "./AsyncStoreWithClient";
import defaultDispatcher from "../dispatcher/dispatcher";
import SettingsStore from "../settings/SettingsStore";
import WidgetEchoStore from "../stores/WidgetEchoStore";
import RoomViewStore from "../stores/RoomViewStore";
import ActiveWidgetStore from "../stores/ActiveWidgetStore";
import WidgetUtils from "../utils/WidgetUtils";
import {SettingLevel} from "../settings/SettingLevel";
import {WidgetType} from "../widgets/WidgetType";
import {UPDATE_EVENT} from "./AsyncStore";

interface IState {}

export interface IApp extends IWidget {
    roomId: string;
    eventId: string;
    // eslint-disable-next-line camelcase
    avatar_url: string; // MSC2765 https://github.com/matrix-org/matrix-doc/pull/2765
}

interface IRoomWidgets {
    widgets: IApp[];
    pinned: Record<string, boolean>;
}

export const MAX_PINNED = 3;

// TODO consolidate WidgetEchoStore into this
// TODO consolidate ActiveWidgetStore into this
export default class WidgetStore extends AsyncStoreWithClient<IState> {
    private static internalInstance = new WidgetStore();

    private widgetMap = new Map<string, IApp>();
    private roomMap = new Map<string, IRoomWidgets>();

    private constructor() {
        super(defaultDispatcher, {});

        SettingsStore.watchSetting("Widgets.pinned", null, this.onPinnedWidgetsChange);
        WidgetEchoStore.on("update", this.onWidgetEchoStoreUpdate);
    }

    public static get instance(): WidgetStore {
        return WidgetStore.internalInstance;
    }

    private initRoom(roomId: string) {
        if (!this.roomMap.has(roomId)) {
            this.roomMap.set(roomId, {
                pinned: {}, // ordered
                widgets: [],
            });
        }
    }

    protected async onReady(): Promise<any> {
        this.matrixClient.on("RoomState.events", this.onRoomStateEvents);
        this.matrixClient.getRooms().forEach((room: Room) => {
            const pinned = SettingsStore.getValue("Widgets.pinned", room.roomId);

            if (pinned || WidgetUtils.getRoomWidgets(room).length) {
                this.initRoom(room.roomId);
            }

            if (pinned) {
                this.getRoom(room.roomId).pinned = pinned;
            }

            this.loadRoomWidgets(room);
        });
        this.emit(UPDATE_EVENT);
    }

    protected async onNotReady(): Promise<any> {
        this.matrixClient.off("RoomState.events", this.onRoomStateEvents);
        this.widgetMap = new Map();
        this.roomMap = new Map();
        await this.reset({});
    }

    // We don't need this, but our contract says we do.
    protected async onAction(payload: ActionPayload) {
        return;
    }

    private onWidgetEchoStoreUpdate = (roomId: string, widgetId: string) => {
        this.initRoom(roomId);
        this.loadRoomWidgets(this.matrixClient.getRoom(roomId));
        this.emit(UPDATE_EVENT);
    };

    private generateApps(room: Room): IApp[] {
        return WidgetEchoStore.getEchoedRoomWidgets(room.roomId, WidgetUtils.getRoomWidgets(room)).map((ev) => {
            return WidgetUtils.makeAppConfig(
                ev.getStateKey(), ev.getContent(), ev.getSender(), ev.getRoomId(), ev.getId(),
            );
        });
    }

    private loadRoomWidgets(room: Room) {
        if (!room) return;
        const roomInfo = this.roomMap.get(room.roomId);
        roomInfo.widgets = [];

        // first clean out old widgets from the map which originate from this room
        // otherwise we are out of sync with the rest of the app with stale widget events during removal
        Array.from(this.widgetMap.values()).forEach(app => {
            if (app.roomId === room.roomId) {
                this.widgetMap.delete(app.id);
            }
        });

        this.generateApps(room).forEach(app => {
            this.widgetMap.set(app.id, app);
            roomInfo.widgets.push(app);
        });
        this.emit(room.roomId);
    }

    private onRoomStateEvents = (ev: MatrixEvent) => {
        if (ev.getType() !== "im.vector.modular.widgets") return;
        const roomId = ev.getRoomId();
        this.initRoom(roomId);
        this.loadRoomWidgets(this.matrixClient.getRoom(roomId));
        this.emit(UPDATE_EVENT);
    };

    public getRoomId = (widgetId: string) => {
        const app = this.widgetMap.get(widgetId);
        if (!app) return null;
        return app.roomId;
    }

    public getRoom = (roomId: string) => {
        return this.roomMap.get(roomId);
    };

    private onPinnedWidgetsChange = (settingName: string, roomId: string) => {
        this.initRoom(roomId);
        this.getRoom(roomId).pinned = SettingsStore.getValue(settingName, roomId);
        this.emit(roomId);
        this.emit(UPDATE_EVENT);
    };

    public isPinned(widgetId: string) {
        const roomId = this.getRoomId(widgetId);
        return !!this.getPinnedApps(roomId).find(w => w.id === widgetId);
    }

    public canPin(widgetId: string) {
        const roomId = this.getRoomId(widgetId);
        return this.getPinnedApps(roomId).length < MAX_PINNED;
    }

    public pinWidget(widgetId: string) {
        const roomId = this.getRoomId(widgetId);
        const roomInfo = this.getRoom(roomId);
        if (!roomInfo) return;

        // When pinning, first confirm all the widgets (Jitsi) which were autopinned so that the order is correct
        const autoPinned = this.getPinnedApps(roomId).filter(app => !roomInfo.pinned[app.id]);
        autoPinned.forEach(app => {
            this.setPinned(app.id, true);
        });

        this.setPinned(widgetId, true);

        // Show the apps drawer upon the user pinning a widget
        if (RoomViewStore.getRoomId() === this.getRoomId(widgetId)) {
            defaultDispatcher.dispatch({
                action: "appsDrawer",
                show: true,
            })
        }
    }

    public unpinWidget(widgetId: string) {
        this.setPinned(widgetId, false);
    }

    private setPinned(widgetId: string, value: boolean) {
        const roomId = this.getRoomId(widgetId);
        const roomInfo = this.getRoom(roomId);
        if (!roomInfo) return;
        if (roomInfo.pinned[widgetId] === false && value) {
            // delete this before write to maintain the correct object insertion order
            delete roomInfo.pinned[widgetId];
        }
        roomInfo.pinned[widgetId] = value;

        // Clean up the pinned record
        Object.keys(roomInfo).forEach(wId => {
            if (!roomInfo.widgets.some(w => w.id === wId)) {
                delete roomInfo.pinned[wId];
            }
        });

        SettingsStore.setValue("Widgets.pinned", roomId, SettingLevel.ROOM_ACCOUNT, roomInfo.pinned);
        this.emit(roomId);
        this.emit(UPDATE_EVENT);
    }

    public movePinnedWidget(widgetId: string, delta: 1 | -1) {
        // TODO simplify this by changing the storage medium of pinned to an array once the Jitsi default-on goes away
        const roomId = this.getRoomId(widgetId);
        const roomInfo = this.getRoom(roomId);
        if (!roomInfo || roomInfo.pinned[widgetId] === false) return;

        const pinnedApps = this.getPinnedApps(roomId).map(app => app.id);
        const i = pinnedApps.findIndex(id => id === widgetId);

        if (delta > 0) {
            pinnedApps.splice(i, 2, pinnedApps[i + 1], pinnedApps[i]);
        } else {
            pinnedApps.splice(i - 1, 2, pinnedApps[i], pinnedApps[i - 1]);
        }

        const reorderedPinned: IRoomWidgets["pinned"] = {};
        pinnedApps.forEach(id => {
            reorderedPinned[id] = true;
        });
        Object.keys(roomInfo.pinned).forEach(id => {
            if (reorderedPinned[id] === undefined) {
                reorderedPinned[id] = roomInfo.pinned[id];
            }
        });
        roomInfo.pinned = reorderedPinned;

        SettingsStore.setValue("Widgets.pinned", roomId, SettingLevel.ROOM_ACCOUNT, roomInfo.pinned);
        this.emit(roomId);
        this.emit(UPDATE_EVENT);
    }

    public getPinnedApps(roomId: string): IApp[] {
        // returns the apps in the order they were pinned with, up to the maximum
        const roomInfo = this.getRoom(roomId);
        if (!roomInfo) return [];

        // Show Jitsi widgets even if the user already had the maximum pinned, instead of their latest pinned,
        // except if the user already explicitly unpinned the Jitsi widget
        const priorityWidget = roomInfo.widgets.find(widget => {
            return roomInfo.pinned[widget.id] === undefined && WidgetType.JITSI.matches(widget.type);
        });

        const order = Object.keys(roomInfo.pinned).filter(k => roomInfo.pinned[k]);
        let apps = order.map(wId => this.widgetMap.get(wId)).filter(Boolean);
        apps = apps.slice(0, priorityWidget ? MAX_PINNED - 1 : MAX_PINNED);
        if (priorityWidget) {
            apps.push(priorityWidget);
        }

        return apps;
    }

    public getApps(roomId: string): IApp[] {
        const roomInfo = this.getRoom(roomId);
        return roomInfo?.widgets || [];
    }

    public doesRoomHaveConference(room: Room): boolean {
        const roomInfo = this.getRoom(room.roomId);
        if (!roomInfo) return false;

        const currentWidgets = roomInfo.widgets.filter(w => WidgetType.JITSI.matches(w.type));
        const hasPendingWidgets = WidgetEchoStore.roomHasPendingWidgetsOfType(room.roomId, [], WidgetType.JITSI);
        return currentWidgets.length > 0 || hasPendingWidgets;
    }

    public isJoinedToConferenceIn(room: Room): boolean {
        const roomInfo = this.getRoom(room.roomId);
        if (!roomInfo) return false;

        // A persistent conference widget indicates that we're participating
        const widgets = roomInfo.widgets.filter(w => WidgetType.JITSI.matches(w.type));
        return widgets.some(w => ActiveWidgetStore.getWidgetPersistence(w.id));
    }
}

window.mxWidgetStore = WidgetStore.instance;
