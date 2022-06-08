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

import { groupBy, mapValues, maxBy, minBy, sumBy, takeRight } from "lodash";
import { MatrixClient, Room, RoomMember } from "matrix-js-sdk/src/matrix";

import { Member } from "./direct-messages";
import DMRoomMap from "./DMRoomMap";
import { compare } from "./strings";

function joinedRooms(cli: MatrixClient): Room[] {
    return cli.getRooms()
        .filter(r => r.getMyMembership() === 'join')
        .filter(r => !DMRoomMap.shared().getUserIdForRoomId(r.roomId))
        .filter(r => !Object.keys(r.tags).includes("m.lowpriority"));
}

export const compareMembers = (
    activityScores: Record<string, IActivityScore>,
    memberScores: Record<string, IMemberScore>,
) => (a: Member | RoomMember, b: Member | RoomMember): number => {
    const aActivityScore = activityScores[a.userId]?.score ?? 0;
    const aMemberScore = memberScores[a.userId]?.score ?? 0;
    const aScore = aActivityScore + aMemberScore;
    const aNumRooms = memberScores[a.userId]?.numRooms ?? 0;

    const bActivityScore = activityScores[b.userId]?.score ?? 0;
    const bMemberScore = memberScores[b.userId]?.score ?? 0;
    const bScore = bActivityScore + bMemberScore;
    const bNumRooms = memberScores[b.userId]?.numRooms ?? 0;

    if (aScore === bScore) {
        if (aNumRooms === bNumRooms) {
            return compare(a.userId, b.userId);
        }

        return bNumRooms - aNumRooms;
    }
    return bScore - aScore;
};

interface IActivityScore {
    lastSpoke: number;
    score: number;
}

export function buildActivityScores(cli: MatrixClient): { [key: string]: IActivityScore } {
    const now = new Date().getTime();
    const earliestAgeConsidered = now - (60 * 60 * 1000); // 1 hour ago
    const maxMessagesConsidered = 50; // so we don't iterate over a huge amount of traffic
    const events = joinedRooms(cli)
        .flatMap(room => takeRight(room.getLiveTimeline().getEvents(), maxMessagesConsidered))
        .filter(ev => ev.getTs() > earliestAgeConsidered);
    const senderEvents = groupBy(events, ev => ev.getSender());
    return mapValues(senderEvents, events => {
        const lastEvent = maxBy(events, ev => ev.getTs());
        const distanceFromNow = Math.abs(now - lastEvent.getTs()); // abs to account for slight future messages
        const inverseTime = (now - earliestAgeConsidered) - distanceFromNow;
        return {
            lastSpoke: lastEvent.getTs(),
            score: Math.max(1, inverseTime / (15 * 60 * 1000)), // 15min segments to keep scores sane
        };
    });
}

interface IMemberScore {
    member: RoomMember;
    score: number;
    numRooms: number;
}

export function buildMemberScores(cli: MatrixClient): { [key: string]: IMemberScore } {
    const maxConsideredMembers = 200;
    const consideredRooms = joinedRooms(cli).filter(room => room.getJoinedMemberCount() < maxConsideredMembers);
    const memberPeerEntries = consideredRooms
        .flatMap(room =>
            room.getJoinedMembers().map(member =>
                ({ member, roomSize: room.getJoinedMemberCount() })));
    const userMeta = groupBy(memberPeerEntries, ({ member }) => member.userId);
    return mapValues(userMeta, roomMemberships => {
        const maximumPeers = maxConsideredMembers * roomMemberships.length;
        const totalPeers = sumBy(roomMemberships, entry => entry.roomSize);
        return {
            member: minBy(roomMemberships, entry => entry.roomSize).member,
            numRooms: roomMemberships.length,
            score: Math.max(0, Math.pow(1 - (totalPeers / maximumPeers), 5)),
        };
    });
}
