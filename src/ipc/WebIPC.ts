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

import { randomString } from "matrix-js-sdk/src/randomstring";

import { BroadcastChannelTransport } from "./transport/BroadcastChannelTransport";
import { ITransport, TRANSPORT_EVENT } from "./transport/ITransport";
import {
    BeginElectOperation,
    ElectedOperation,
    IdentOperation,
    Op,
    Operation,
    VoteOperation,
    WelcomeOperation,
} from "./types";
import { Election, ELECTION_VALIDITY_MS } from "./Election";
import { logger } from "matrix-js-sdk/src/logger";

const TRANSPORT: ITransport = (<Array<[boolean, () => ITransport]>>[
        [BroadcastChannelTransport.isSupported(), () => new BroadcastChannelTransport()],
]).find(c => c[0])![1]!();

const CLIENT_ID = randomString(32);

export class WebIPC {
    public static readonly instance = new WebIPC();

    private _lastVote: string;
    private voteExpires = 0;
    private lastElection: Election;
    private elections = new Map<string, Election>();
    private clients = new Set<string>();

    protected constructor(
        public readonly transport: ITransport = TRANSPORT,
        public readonly clientId: string = CLIENT_ID,
    ) {
        // we only really want one of these floating around, so private-ish
        // constructor. Protected allows for unit tests.

        this.transport.on(TRANSPORT_EVENT, this.onMessage);
        this.sendIdent();

        // Clean up old elections every once in a while to free up resources.
        // We do this at 16 times the election lifetime just to be sure straggling
        // responses are properly handled.
        const cleanupInterval = ELECTION_VALIDITY_MS * 16;
        setInterval(() => {
            const cullOlderThan = Date.now() - cleanupInterval;
            logger.info(`WebIPC[${this.clientId}] Cleaning up elections older than ${cullOlderThan}`);
            const elections = Array.from(this.elections.entries());
            for (const [id, election] of elections) {
                if (election.startTs <= cullOlderThan) {
                    logger.info(`WebIPC[${this.clientId}] Deleting old election ${id}`);
                    this.elections.delete(id);
                }
            }

            // we also trigger an IDENT to clean up our connected instances list
            this.sendIdent();
        }, cleanupInterval);
    }

    public get leaderId(): string {
        return this.lastElection?.winner ?? this.clientId;
    }

    public get isCurrentlyLeader(): boolean {
        return this.leaderId === this.clientId;
    }

    private get voteString(): string {
        if (Date.now() >= this.voteExpires) {
            this._lastVote = null;
        }
        if (!this._lastVote) {
            this._lastVote = randomString(32);
            this.voteExpires = Date.now() + 30000; // 30s
        }
        return this._lastVote;
    }

    private onMessage = (op: Operation) => {
        switch(op.operation) {
            case Op.Ident:
                this.sendWelcome();
                return this.trackJoin(op);
            case Op.Welcome:
                this.handleWelcome(op);
                return this.trackJoin(op);
            case Op.BeginElect:
                return this.castVote(op);
            case Op.Vote:
                return this.handleVote(op);
            case Op.Elected:
                return this.handleElected(op);
            default:
                // unknown operation - we don't log this
                // because it might be malicious, so don't
                // spam the console.
                return;
        }
    };

    private trackJoin(op: IdentOperation | WelcomeOperation) {
        logger.info(`WebIPC[${this.clientId}] WELCOME/IDENT received: ${op.clientId}`);
        this.clients.add(op.clientId);
    }

    private sendIdent() {
        logger.info(`WebIPC[${this.clientId}] Sending IDENT`);
        this.clients = new Set<string>(); // empty known clients
        this.transport.send({
            operation: Op.Ident,
            clientId: this.clientId,
            version: 1,
            payload: {},
        });
    }

    private sendWelcome() {
        logger.info(`WebIPC[${this.clientId}] Sending WELCOME`);
        const op: WelcomeOperation = {
            operation: Op.Welcome,
            clientId: this.clientId,
            version: 1,
            payload: {
                leader: this.leaderId,
            },
        };
        this.transport.send(op);
        this.handleWelcome(op); // welcome ourselves to leader election states
    }

    private handleWelcome(op: WelcomeOperation) {
        // Seed our last known election with the first welcome response if we don't
        // know the current leader.
        if (!this.lastElection) {
            // We create a mock election and finalize it. Since it is the only vote, it should adopt.
            this.lastElection = new Election("unknown", 1);
            this.lastElection.addVote(op.payload.leader, op.payload.leader); // vote value doesn't matter here
            this.lastElection.finalize();

            logger.info(`WebIPC[${this.clientId}] Adopted ${this.lastElection.winner} as leader from WELCOME`);
        }

        // If the leader is unexpected, start a new election
        if (op.payload.leader !== this.lastElection.winner) {
            logger.warn(
                `WebIPC[${this.clientId}] Leader conflict on WELCOME from ${op.clientId} : ` +
                `${this.lastElection.winner} !== ${op.payload.leader}`,
            );
            this.startNewElection();
        }
    }

    private castVote(electOp: BeginElectOperation) {
        const election = new Election(electOp.payload.electionId, electOp.payload.startTs);
        this.elections.set(electOp.payload.electionId, election);
        election.addVote(electOp.clientId, electOp.payload.vote);

        const myVote = this.voteString;
        election.addVote(this.clientId, myVote);

        logger.info(`WebIPC[${this.clientId}] Voted in ${election.electionId} with ${myVote}`);

        this.transport.send({
            operation: Op.Vote,
            clientId: this.clientId,
            version: 1,
            payload: {
                electionId: electOp.payload.electionId,
                vote: myVote,
            },
        });

        this.handleElectionStart(electOp);
    }

    private handleElectionStart(electOp: BeginElectOperation) {
        // Set a timer for leader announcement
        setTimeout(() => {
            const election = this.elections.get(electOp.payload.electionId);
            if (!election) return; // it got purged

            const leader = election.finalize();
            this.tryUpdateLastElection(election);
            if (leader === this.clientId) {
                logger.info(`WebIPC[${this.clientId}] I won ${election.electionId}`);
                this.transport.send({
                    operation: Op.Elected,
                    clientId: this.clientId,
                    version: 1,
                    payload: {
                        electionId: election.electionId,
                    },
                });
            }
        }, ELECTION_VALIDITY_MS + 500); // 500ms buffer, just in case
    }

    private tryUpdateLastElection(newElection: Election) {
        if (!this.lastElection || newElection.startTs >= this.lastElection.startTs) {
            logger.info(
                `WebIPC[${this.clientId}] Last election updated from ` +
                `${this.lastElection?.electionId} to ${newElection.electionId}`,
            );
            logger.info(`WebIPC[${this.clientId}] Leader is now ${newElection.winner}`);
            this.lastElection = newElection;
        }
    }

    private handleVote(vote: VoteOperation) {
        if (!this.elections.has(vote.payload.electionId)) {
            return; // unknown election
        }

        const election = this.elections.get(vote.payload.electionId);
        if (election.hasEnded) return; // invalid vote
        election.addVote(vote.clientId, vote.payload.vote);

        logger.info(
            `WebIPC[${this.clientId}] Vote received from ${vote.clientId} in ${election.electionId} ` +
            `as ${vote.payload.vote}`,
        );
    }

    private handleElected(op: ElectedOperation) {
        const election = this.elections.get(op.payload.electionId);
        if (!election) {
            // unknown election
            logger.warn(
                `WebIPC[${this.clientId}] Received elected for unknown election ${election.electionId} ` +
                `from ${op.clientId} - starting new vote`,
            );
            return this.startNewElection();
        }

        const leader = election.finalize();
        if (leader !== op.clientId) {
            // unexpected leader
            logger.warn(
                `WebIPC[${this.clientId}] Received unexpected leader ${op.clientId} for ${election.electionId} ` +
                `- starting new vote`,
            );
            return this.startNewElection();
        }

        this.tryUpdateLastElection(election);
    }

    private startNewElection() {
        let tries = 0;
        let electionId;
        do {
            electionId = randomString(32);
            tries++;
        } while (this.elections.has(electionId) || tries > 1000);

        if (this.elections.has(electionId)) {
            throw new Error("Failed to determine a safe election ID");
        }

        const startTs = Date.now();
        const election = new Election(electionId, startTs);
        this.elections.set(electionId, election);

        const myVote = this.voteString;
        election.addVote(this.clientId, myVote);

        logger.info(
            `WebIPC[${this.clientId}] Starting new election ${electionId} with vote ${myVote} at ${startTs}`,
        );

        const op: BeginElectOperation = {
            operation: Op.BeginElect,
            clientId: this.clientId,
            version: 1,
            payload: {
                electionId: electionId,
                startTs: startTs,
                vote: myVote,
            },
        };
        this.transport.send(op);
        this.handleElectionStart(op);
    }
}
