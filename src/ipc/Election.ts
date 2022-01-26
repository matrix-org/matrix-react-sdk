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

import { lexicographicCompare } from "matrix-js-sdk/src/utils";

export const ELECTION_VALIDITY_MS = 10000; // 10 seconds

export class Election {
    public readonly votes = new Map<string, string>();

    private _winner: string;

    constructor(public readonly electionId: string, public readonly startTs: number) {
    }

    public get winner(): string {
        return this._winner;
    }

    public get hasEnded(): boolean {
        return Date.now() >= (this.startTs + ELECTION_VALIDITY_MS);
    }

    public addVote(clientId: string, vote: string) {
        if (!this.votes.has(clientId)) {
            this.votes.set(clientId, vote);
        }
    }

    /**
     * Finalizes the election, returning the elected leader
     */
    public finalize(): string {
        if (this.winner) {
            return this.winner;
        }

        const clientVoteTuples = Array.from(this.votes.entries());
        this._winner = clientVoteTuples.sort(([aId, aVote], [bId, bVote]) => {
            const voteCompare = lexicographicCompare(aVote, bVote);
            if (voteCompare === 0) {
                return lexicographicCompare(aId, bId);
            }
            return voteCompare;
        })[0][0]; // first tuple, client ID from that tuple

        return this.winner;
    }
}
