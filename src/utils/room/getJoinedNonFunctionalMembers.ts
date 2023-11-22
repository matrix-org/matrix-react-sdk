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

import { Room, RoomMember } from "matrix-js-sdk/src/matrix";

import { getFunctionalMembers } from "./getFunctionalMembers";

/**
 * Returns all room members that are non-functional (all actual room members).
 *
 * A functional user is a user that is not a real user, but a bot, assistant, etc.
 */
export const getJoinedNonFunctionalMembers = (room: Room): RoomMember[] => {
    const functionalMembers = getFunctionalMembers(room);
    return room.getJoinedMembers().filter((m) => !functionalMembers.includes(m.userId));
};
