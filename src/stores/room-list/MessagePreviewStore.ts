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

import { Room, RoomEvent } from "matrix-js-sdk/src/models/room";
import { isNullOrUndefined, sleep } from "matrix-js-sdk/src/utils";
import { ClientEvent, IPaginateOpts } from "matrix-js-sdk/src/matrix";
import { MatrixEvent } from "matrix-js-sdk/src/models/event";
import { M_POLL_START } from "matrix-events-sdk";
import { EventType } from "matrix-js-sdk/src/@types/event";

import { ActionPayload } from "../../dispatcher/payloads";
import { AsyncStoreWithClient } from "../AsyncStoreWithClient";
import defaultDispatcher from "../../dispatcher/dispatcher";
import { MessageEventPreview } from "./previews/MessageEventPreview";
import { PollStartEventPreview } from "./previews/PollStartEventPreview";
import { TagID } from "./models";
import { LegacyCallInviteEventPreview } from "./previews/LegacyCallInviteEventPreview";
import { LegacyCallAnswerEventPreview } from "./previews/LegacyCallAnswerEventPreview";
import { LegacyCallHangupEvent } from "./previews/LegacyCallHangupEvent";
import { StickerEventPreview } from "./previews/StickerEventPreview";
import { ReactionEventPreview } from "./previews/ReactionEventPreview";
import { UPDATE_EVENT } from "../AsyncStore";
import { IPreview } from "./previews/IPreview";

// Emitted event for when a room's preview has changed. First argument will the room for which
// the change happened.
const ROOM_PREVIEW_CHANGED = "room_preview_changed";

const PREVIEWS: Record<string, {
    isState: boolean;
    previewer: IPreview;
}> = {
    [EventType.RoomMessage]: {
        isState: false,
        previewer: new MessageEventPreview(),
    },
    [EventType.CallInvite]: {
        isState: false,
        previewer: new LegacyCallInviteEventPreview(),
    },
    [EventType.CallAnswer]: {
        isState: false,
        previewer: new LegacyCallAnswerEventPreview(),
    },
    [EventType.CallHangup]: {
        isState: false,
        previewer: new LegacyCallHangupEvent(),
    },
    [EventType.Sticker]: {
        isState: false,
        previewer: new StickerEventPreview(),
    },
    [EventType.Reaction]: {
        isState: false,
        previewer: new ReactionEventPreview(),
    },
    [M_POLL_START.name]: {
        isState: false,
        previewer: new PollStartEventPreview(),
    },
    [M_POLL_START.altName]: {
        isState: false,
        previewer: new PollStartEventPreview(),
    },
};

// Number of events to load per /messages request
const PAGE_SIZE = 25;

// The maximum number of events we're willing to look back on to get a preview.
const MAX_EVENTS_BACKWARDS = 100;

// type merging ftw
type TAG_ANY = "im.vector.any"; // eslint-disable-line @typescript-eslint/naming-convention
const TAG_ANY: TAG_ANY = "im.vector.any";

interface IState {
    // Empty because we don't actually use the state
}

export class MessagePreviewStore extends AsyncStoreWithClient<IState> {
    private static readonly internalInstance = (() => {
        const instance = new MessagePreviewStore();
        instance.start();
        return instance;
    })();

    // null indicates the preview is empty / irrelevant
    private previews = new Map<string, Map<TagID|TAG_ANY, string|null>>();
    private pendingRooms = new Set<Room>();
    private stopped = false;

    private constructor() {
        super(defaultDispatcher, {});
    }

    public static get instance(): MessagePreviewStore {
        return MessagePreviewStore.internalInstance;
    }

    public static getPreviewChangedEventName(room: Room): string {
        return `${ROOM_PREVIEW_CHANGED}:${room?.roomId}`;
    }

    protected async onReady() {
        await super.onReady();
        this.stopped = false;
        this.matrixClient.on(ClientEvent.Room, this.queueRoomIfNeeded);
        this.matrixClient.on(RoomEvent.TimelineReset, this.queueRoomIfNeeded);
        // TODO sort these to prioritise the visible ones
        this.matrixClient.getVisibleRooms().forEach(this.queueRoomIfNeeded);
    }

    protected async onNotReady() {
        await super.onNotReady();
        this.stopped = true;
        this.pendingRooms.clear();
        this.matrixClient.off(ClientEvent.Room, this.queueRoomIfNeeded);
        this.matrixClient.off(RoomEvent.TimelineReset, this.queueRoomIfNeeded);
    }

    private async shouldBackfill(room: Room): Promise<boolean> {
        // TODO we should ensure ~5-10 visible events are loaded, not just one
        if (room.getLiveTimeline().getEvents().length > MAX_EVENTS_BACKWARDS) {
            return false;
        }
        const preview = await this.getPreviewForRoom(room);
        return !preview;
    }

    private async startCrawler(): Promise<void> {
        const options: IPaginateOpts = {
            limit: PAGE_SIZE,
            backwards: true,
        };

        while (!this.stopped && this.pendingRooms.size) {
            // Pop first room off the Set
            const room: Room = this.pendingRooms[Symbol.iterator]().next().value;
            this.pendingRooms.delete(room);

            for (let i = 0; await this.shouldBackfill(room); i++) {
                if (this.stopped) break;
                const canPaginateMore = await this.matrixClient.paginateEventTimeline(room.getLiveTimeline(), options);
                await sleep(100); // Sleep between requests
                if (this.stopped || !canPaginateMore) break;
            }
        }
    }

    private queueRoomIfNeeded = async (room: Room): Promise<void> => {
        if (await this.shouldBackfill(room)) {
            const needsStarting = !this.pendingRooms.size;
            this.pendingRooms.add(room);
            if (needsStarting) {
                this.startCrawler();
            }
        }
    };

    /**
     * Gets the pre-translated preview for a given room
     * @param room The room to get the preview for.
     * @param inTagId The tag ID in which the room resides
     * @returns The preview, or null if none present.
     */
    public async getPreviewForRoom(room: Room, inTagId?: TagID): Promise<string | null> {
        if (!room) return null; // invalid room, just return nothing

        if (!this.previews.has(room.roomId)) await this.generatePreview(room, inTagId);

        const previews = this.previews.get(room.roomId);
        if (!previews) return null;

        if (!previews.has(inTagId)) {
            return previews.get(TAG_ANY);
        }
        return previews.get(inTagId);
    }

    public generatePreviewForEvent(event: MatrixEvent): string {
        const previewDef = PREVIEWS[event.getType()];
        return previewDef?.previewer.getTextFor(event, null, true) ?? "";
    }

    private async generatePreview(room: Room, tagId?: TagID) {
        const events = room.timeline;
        if (!events) return; // should only happen in tests

        let map = this.previews.get(room.roomId);
        if (!map) {
            map = new Map<TagID | TAG_ANY, string | null>();
            this.previews.set(room.roomId, map);
        }

        // Set the tags so we know what to generate
        if (!map.has(TAG_ANY)) map.set(TAG_ANY, null);
        if (tagId && !map.has(tagId)) map.set(tagId, null);

        let changed = false;
        for (let i = events.length - 1; i >= 0; i--) {
            if (i === events.length - MAX_EVENTS_BACKWARDS) {
                // limit reached - clear the preview by breaking out of the loop
                break;
            }

            const event = events[i];

            await this.matrixClient.decryptEventIfNeeded(event);

            const previewDef = PREVIEWS[event.getType()];
            if (!previewDef) continue;
            if (previewDef.isState && isNullOrUndefined(event.getStateKey())) continue;

            const anyPreview = previewDef.previewer.getTextFor(event, null);
            if (!anyPreview) continue; // not previewable for some reason

            changed = changed || anyPreview !== map.get(TAG_ANY);
            map.set(TAG_ANY, anyPreview);

            const tagsToGenerate = Array.from(map.keys()).filter(t => t !== TAG_ANY); // we did the any tag above
            for (const genTagId of tagsToGenerate) {
                const realTagId: TagID = genTagId === TAG_ANY ? null : genTagId;
                const preview = previewDef.previewer.getTextFor(event, realTagId);
                if (preview === anyPreview) {
                    changed = changed || anyPreview !== map.get(genTagId);
                    map.delete(genTagId);
                } else {
                    changed = changed || preview !== map.get(genTagId);
                    map.set(genTagId, preview);
                }
            }

            if (changed) {
                // We've muted the underlying Map, so just emit that we've changed.
                this.previews.set(room.roomId, map);
                this.emit(UPDATE_EVENT, this);
                this.emit(MessagePreviewStore.getPreviewChangedEventName(room), room);
            }
            return; // we're done
        }

        // At this point, we didn't generate a preview so clear it
        this.previews.set(room.roomId, new Map<TagID|TAG_ANY, string|null>());
        this.emit(UPDATE_EVENT, this);
        this.emit(MessagePreviewStore.getPreviewChangedEventName(room), room);
    }

    protected async onAction(payload: ActionPayload) {
        if (!this.matrixClient) return;

        if (payload.action === 'MatrixActions.Room.timeline' || payload.action === 'MatrixActions.Event.decrypted') {
            const event = payload.event; // TODO: Type out the dispatcher
            const isHistoricalEvent = payload.hasOwnProperty("isLiveEvent") && !payload.isLiveEvent;
            if (!this.previews.has(event.getRoomId()) || isHistoricalEvent) return; // not important
            await this.generatePreview(this.matrixClient.getRoom(event.getRoomId()), TAG_ANY);
        }
    }
}

window.mxMessagePreviewStore = MessagePreviewStore.instance;
