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
import { mocked } from 'jest-mock';
import { SlidingSync } from 'matrix-js-sdk/src/sliding-sync';
import { Room } from 'matrix-js-sdk/src/matrix';

import { SlidingRoomListStoreClass, SlidingSyncSortToFilter } from "../../../src/stores/room-list/SlidingRoomListStore";
import { SpaceStoreClass } from "../../../src/stores/spaces/SpaceStore";
import { MockEventEmitter, stubClient, untilEmission } from "../../test-utils";
import { TestSdkContext } from '../../TestSdkContext';
import { SlidingSyncManager } from '../../../src/SlidingSyncManager';
import { RoomViewStore } from '../../../src/stores/RoomViewStore';
import { MatrixDispatcher } from '../../../src/dispatcher/dispatcher';
import { SortAlgorithm } from '../../../src/stores/room-list/algorithms/models';
import { DefaultTagID, TagID } from '../../../src/stores/room-list/models';
import { UPDATE_SELECTED_SPACE } from '../../../src/stores/spaces';
import { LISTS_LOADING_EVENT } from '../../../src/stores/room-list/RoomListStore';

jest.mock('../../../src/SlidingSyncManager');
const MockSlidingSyncManager = <jest.Mock<SlidingSyncManager>><unknown>SlidingSyncManager;

describe("SlidingRoomListStore", () => {
    let store: SlidingRoomListStoreClass;
    let context: TestSdkContext;
    let dis: MatrixDispatcher;
    let activeSpace: string;
    let tagIdToIndex = {};

    beforeEach(async () => {
        context = new TestSdkContext();
        context.client = stubClient();
        context._SpaceStore = new MockEventEmitter<SpaceStoreClass>({
            traverseSpace: jest.fn(),
            get activeSpace() {
                return activeSpace;
            },
        }) as SpaceStoreClass;
        context._SlidingSyncManager = new MockSlidingSyncManager();
        context._SlidingSyncManager.slidingSync = mocked(new MockEventEmitter({
            getListData: jest.fn(),
        }) as unknown as SlidingSync);
        context._RoomViewStore = mocked(new MockEventEmitter({
            getRoomId: jest.fn(),
        }) as unknown as RoomViewStore);

        let index = 0;
        tagIdToIndex = {};
        mocked(context._SlidingSyncManager.getOrAllocateListIndex).mockImplementation((listId: string): number => {
            if (tagIdToIndex[listId] != null) {
                return tagIdToIndex[listId];
            }
            tagIdToIndex[listId] = index;
            index++;
            return index;
        });

        dis = new MatrixDispatcher();
        store = new SlidingRoomListStoreClass(dis, context);
    });

    describe("spaces", () => {
        beforeEach(() => {
            mocked(context._SlidingSyncManager.ensureListRegistered).mockResolvedValue({
                ranges: [[0, 10]],
            });
        });

        it("alters 'filters.spaces' on the DefaultTagID.Untagged list when the selected space changes", async () => {
            await store.start(); // call onReady
            const spaceRoomId = "!foo:bar";

            const p = untilEmission(store, LISTS_LOADING_EVENT, (listName, isLoading) => {
                return listName === DefaultTagID.Untagged && !isLoading;
            });

            // change the active space
            activeSpace = spaceRoomId;
            context._SpaceStore.emit(UPDATE_SELECTED_SPACE, spaceRoomId, false);
            await p;

            expect(context._SlidingSyncManager.ensureListRegistered).toHaveBeenCalledWith(
                tagIdToIndex[DefaultTagID.Untagged],
                {
                    filters: expect.objectContaining({
                        spaces: [spaceRoomId],
                    }),
                },
            );
        });

        it("alters 'filters.spaces' on the DefaultTagID.Untagged list if it loads with an active space", async () => {
            // change the active space before we are ready
            const spaceRoomId = "!foo2:bar";
            activeSpace = spaceRoomId;
            const p = untilEmission(store, LISTS_LOADING_EVENT, (listName, isLoading) => {
                return listName === DefaultTagID.Untagged && !isLoading;
            });
            await store.start(); // call onReady
            await p;
            expect(context._SlidingSyncManager.ensureListRegistered).toHaveBeenCalledWith(
                tagIdToIndex[DefaultTagID.Untagged],
                expect.objectContaining({
                    filters: expect.objectContaining({
                        spaces: [spaceRoomId],
                    }),
                }),
            );
        });

        it("includes subspaces in 'filters.spaces' when the selected space has subspaces", async () => {
            await store.start(); // call onReady
            const spaceRoomId = "!foo:bar";
            const subSpace1 = "!ss1:bar";
            const subSpace2 = "!ss2:bar";

            const p = untilEmission(store, LISTS_LOADING_EVENT, (listName, isLoading) => {
                return listName === DefaultTagID.Untagged && !isLoading;
            });

            mocked(context._SpaceStore.traverseSpace).mockImplementation(
                (spaceId: string, fn: (roomId: string) => void) => {
                    if (spaceId === spaceRoomId) {
                        fn(subSpace1);
                        fn(subSpace2);
                    }
                },
            );

            // change the active space
            activeSpace = spaceRoomId;
            context._SpaceStore.emit(UPDATE_SELECTED_SPACE, spaceRoomId, false);
            await p;

            expect(context._SlidingSyncManager.ensureListRegistered).toHaveBeenCalledWith(
                tagIdToIndex[DefaultTagID.Untagged],
                {
                    filters: expect.objectContaining({
                        spaces: [spaceRoomId, subSpace1, subSpace2],
                    }),
                },
            );
        });
    });

    it("setTagSorting alters the 'sort' option in the list", async () => {
        mocked(context._SlidingSyncManager.getOrAllocateListIndex).mockReturnValue(0);
        mocked(context._SlidingSyncManager.ensureListRegistered).mockResolvedValue({
            ranges: [[0, 10]],
        });
        const tagId: TagID = "foo";
        await store.setTagSorting(tagId, SortAlgorithm.Alphabetic);
        expect(context._SlidingSyncManager.ensureListRegistered).toBeCalledWith(0, {
            sort: SlidingSyncSortToFilter[SortAlgorithm.Alphabetic],
        });
        expect(store.getTagSorting(tagId)).toEqual(SortAlgorithm.Alphabetic);

        await store.setTagSorting(tagId, SortAlgorithm.Recent);
        expect(context._SlidingSyncManager.ensureListRegistered).toBeCalledWith(0, {
            sort: SlidingSyncSortToFilter[SortAlgorithm.Recent],
        });
        expect(store.getTagSorting(tagId)).toEqual(SortAlgorithm.Recent);
    });

    it("getTagsForRoom gets the tags for the room", async () => {
        mocked(context._SlidingSyncManager.ensureListRegistered).mockResolvedValue({
            ranges: [[0, 10]],
        });
        await store.start();
        const untaggedIndex = context._SlidingSyncManager.getOrAllocateListIndex(DefaultTagID.Untagged);
        const favIndex = context._SlidingSyncManager.getOrAllocateListIndex(DefaultTagID.Favourite);
        const roomA = "!a:localhost";
        const roomB = "!b:localhost";
        const indexToListData = {
            [untaggedIndex]: {
                joinedCount: 10,
                roomIndexToRoomId: {
                    0: roomA,
                    1: roomB,
                },
            },
            [favIndex]: {
                joinedCount: 2,
                roomIndexToRoomId: {
                    0: roomB,
                },
            },
        };
        mocked(context._SlidingSyncManager.slidingSync.getListData).mockImplementation((i: number) => {
            return indexToListData[i] || null;
        });

        expect(store.getTagsForRoom(new Room(roomA, context.client, context.client.getUserId()))).toEqual(
            [DefaultTagID.Untagged],
        );
        expect(store.getTagsForRoom(new Room(roomB, context.client, context.client.getUserId()))).toEqual(
            [DefaultTagID.Favourite, DefaultTagID.Untagged],
        );
    });

    it("emits LISTS_UPDATE_EVENT when slidingSync lists update", async () => {

    });
});
