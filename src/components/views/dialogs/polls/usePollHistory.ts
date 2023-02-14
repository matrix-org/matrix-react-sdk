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

import { useEffect, useState } from "react";
import { Poll, PollEvent } from "matrix-js-sdk/src/matrix";
import { MatrixClient } from "matrix-js-sdk/src/client";

import { useEventEmitterState } from "../../../../hooks/useEventEmitter";

/**
 * Get poll instances from a room
 * @param roomId - id of room to retrieve polls for
 * @param matrixClient - client
 * @returns {Map<string, Poll>} - Map of Poll instances
 */
export const usePolls = (
    roomId: string,
    matrixClient: MatrixClient,
): {
    polls: Map<string, Poll>;
} => {
    const room = matrixClient.getRoom(roomId);

    if (!room) {
        throw new Error("Cannot find room");
    }

    // copy room.polls map so changes can be detected
    const polls = useEventEmitterState(room, PollEvent.New, () => new Map<string, Poll>(room.polls));

    return { polls };
};

export const usePollsWithRelations = (
    roomId: string,
    matrixClient: MatrixClient,
): {
    polls: Map<string, Poll>;
} => {
    const { polls } = usePolls(roomId, matrixClient);
    const [pollsWithRelations, setPollsWithRelations] = useState<Map<string, Poll>>(polls);

    useEffect(() => {
        const onPollEnd = async (): Promise<void> => {
            // trigger rerender by creating a new poll map
            setPollsWithRelations(new Map(polls));
        };
        if (polls) {
            for (const poll of polls.values()) {
                poll.on(PollEvent.End, onPollEnd);
                poll.getResponses();
            }
            setPollsWithRelations(polls);
        }
        () => {
            if (polls) {
                for (const poll of polls.values()) {
                    poll.off(PollEvent.End, onPollEnd);
                }
            }
        };
    }, [polls, setPollsWithRelations]);

    // @TODO(kerrya) watch polls for end events, trigger refiltering

    return { polls: pollsWithRelations };
};
