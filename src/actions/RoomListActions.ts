/*
Copyright 2018 New Vector Ltd
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

import { MatrixClient, Room } from "matrix-js-sdk/src/matrix";
import { logger } from "matrix-js-sdk/src/logger";

import { asyncAction } from "./actionCreators";
import Modal from "../Modal";
import * as Rooms from "../Rooms";
import { _t } from "../languageHandler";
import { AsyncActionPayload } from "../dispatcher/payloads";
import RoomListStore from "../stores/room-list/RoomListStore";
import { SortAlgorithm } from "../stores/room-list/algorithms/models";
import { DefaultTagID, TagID } from "../stores/room-list/models";
import ErrorDialog from "../components/views/dialogs/ErrorDialog";

export default class RoomListActions {
    /**
     * Creates an action thunk that will do an asynchronous request to
     * tag room.
     *
     * @param {MatrixClient} matrixClient the matrix client to set the
     *                                    account data on.
     * @param {Room} room the room to tag.
     * @param {string} oldTag the tag to remove (unless oldTag ==== newTag)
     * @param {string} newTag the tag with which to tag the room.
     * @param {?number} oldIndex the previous position of the room in the
     *                           list of rooms.
     * @param {?number} newIndex the new position of the room in the list
     *                           of rooms.
     * @returns {AsyncActionPayload} an async action payload
     * @see asyncAction
     */
    public static tagRoom(
        matrixClient: MatrixClient,
        room: Room,
        oldTag: TagID | null,
        newTag: TagID | null,
        newIndex: number,
    ): AsyncActionPayload {
        let metaData: Parameters<MatrixClient["setRoomTag"]>[2] | undefined;

        // Is the tag ordered manually?
        const store = RoomListStore.instance;
        if (newTag && store.getTagSorting(newTag) === SortAlgorithm.Manual) {
            const newList = [...store.orderedLists[newTag]];

            newList.sort((a, b) => a.tags[newTag].order - b.tags[newTag].order);

            const indexBefore = newIndex - 1;
            const indexAfter = newIndex;

            const prevOrder = indexBefore <= 0 ? 0 : newList[indexBefore].tags[newTag].order;
            const nextOrder = indexAfter >= newList.length ? 1 : newList[indexAfter].tags[newTag].order;

            metaData = {
                order: (prevOrder + nextOrder) / 2.0,
            };
        }

        return asyncAction(
            "RoomListActions.tagRoom",
            () => {
                const promises: Promise<any>[] = [];
                const roomId = room.roomId;

                // Evil hack to get DMs behaving
                if (
                    (oldTag === undefined && newTag === DefaultTagID.DM) ||
                    (oldTag === DefaultTagID.DM && newTag === undefined)
                ) {
                    return Rooms.guessAndSetDMRoom(room, newTag === DefaultTagID.DM).catch((err) => {
                        logger.error("Failed to set DM tag " + err);
                        Modal.createDialog(ErrorDialog, {
                            title: _t("room_list|failed_set_dm_tag"),
                            description: err && err.message ? err.message : _t("invite|failed_generic"),
                        });
                    });
                }

                const hasChangedSubLists = oldTag !== newTag;

                // More evilness: We will still be dealing with moving to favourites/low prio,
                // but we avoid ever doing a request with TAG_DM.
                //
                // if we moved lists, remove the old tag
                if (oldTag && oldTag !== DefaultTagID.DM && hasChangedSubLists) {
                    const promiseToDelete = matrixClient.deleteRoomTag(roomId, oldTag).catch(function (err) {
                        logger.error("Failed to remove tag " + oldTag + " from room: " + err);
                        Modal.createDialog(ErrorDialog, {
                            title: _t("room_list|failed_remove_tag", { tagName: oldTag }),
                            description: err && err.message ? err.message : _t("invite|failed_generic"),
                        });
                    });

                    promises.push(promiseToDelete);
                }

                // if we moved lists or the ordering changed, add the new tag
                if (newTag && newTag !== DefaultTagID.DM && (hasChangedSubLists || metaData)) {
                    const promiseToAdd = matrixClient.setRoomTag(roomId, newTag, metaData).catch(function (err) {
                        logger.error("Failed to add tag " + newTag + " to room: " + err);
                        Modal.createDialog(ErrorDialog, {
                            title: _t("room_list|failed_add_tag", { tagName: newTag }),
                            description: err && err.message ? err.message : _t("invite|failed_generic"),
                        });

                        throw err;
                    });

                    promises.push(promiseToAdd);
                }

                return Promise.all(promises);
            },
            () => {
                // For an optimistic update
                return {
                    room,
                    oldTag,
                    newTag,
                    metaData,
                };
            },
        );
    }
}
