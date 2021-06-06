/*
Copyright 2019, 2020 The Matrix.org Foundation C.I.C.

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

import React, {createRef} from 'react';
import {_t, _td} from "../../../languageHandler";
import * as sdk from "../../../index";
import {MatrixClientPeg} from "../../../MatrixClientPeg";
import {makeRoomPermalink, makeUserPermalink} from "../../../utils/permalinks/Permalinks";
import DMRoomMap from "../../../utils/DMRoomMap";
import {RoomMember} from "matrix-js-sdk/src/models/room-member";
import SdkConfig from "../../../SdkConfig";
import * as Email from "../../../email";
import {getDefaultIdentityServerUrl, useDefaultIdentityServer} from "../../../utils/IdentityServerUtils";
import {abbreviateUrl} from "../../../utils/UrlUtils";
import dis from "../../../dispatcher/dispatcher";
import IdentityAuthClient from "../../../IdentityAuthClient";
import Modal from "../../../Modal";
import {humanizeTime} from "../../../utils/humanize";
import createRoom, {
    canEncryptToAllUsers, ensureDMExists, findDMForUser, privateShouldBeEncrypted,
    IInvite3PID,
} from "../../../createRoom";
import {inviteMultipleToRoom, showCommunityInviteDialog} from "../../../RoomInvite";
import {Key} from "../../../Keyboard";
import {Action} from "../../../dispatcher/actions";
import {DefaultTagID} from "../../../stores/room-list/models";
import RoomListStore from "../../../stores/room-list/RoomListStore";
import {CommunityPrototypeStore} from "../../../stores/CommunityPrototypeStore";
import SettingsStore from "../../../settings/SettingsStore";
import {UIFeature} from "../../../settings/UIFeature";
import CountlyAnalytics from "../../../CountlyAnalytics";
import {Room} from "matrix-js-sdk/src/models/room";
import { MatrixCall } from 'matrix-js-sdk/src/webrtc/call';
import {replaceableComponent} from "../../../utils/replaceableComponent";
import {mediaFromMxc} from "../../../customisations/Media";
import {getAddressType} from "../../../UserAddress";
import BaseAvatar from '../avatars/BaseAvatar';
import AccessibleButton from '../elements/AccessibleButton';
import { compare } from '../../../utils/strings';

// we have a number of types defined from the Matrix spec which can't reasonably be altered here.
/* eslint-disable camelcase */

interface IRecentUser {
    userId: string,
    user: RoomMember,
    lastActive: number,
}

export const KIND_DM = "dm";
export const KIND_INVITE = "invite";
export const KIND_CALL_TRANSFER = "call_transfer";

const INITIAL_ROOMS_SHOWN = 3; // Number of rooms to show at first
const INCREMENT_ROOMS_SHOWN = 5; // Number of rooms to add when 'show more' is clicked

// This is the interface that is expected by various components in this file. It is a bit
// awkward because it also matches the RoomMember class from the js-sdk with some extra support
// for 3PIDs/email addresses.
abstract class Member {
    /**
     * The display name of this Member. For users this should be their profile's display
     * name or user ID if none set. For 3PIDs this should be the 3PID address (email).
     */
    public abstract get name(): string;

    /**
     * The ID of this Member. For users this should be their user ID. For 3PIDs this should
     * be the 3PID address (email).
     */
    public abstract get userId(): string;

    /**
     * Gets the MXC URL of this Member's avatar. For users this should be their profile's
     * avatar MXC URL or null if none set. For 3PIDs this should always be null.
     */
    public abstract getMxcAvatarUrl(): string;
}

class DirectoryMember extends Member {
    private readonly _userId: string;
    private readonly displayName: string;
    private readonly avatarUrl: string;

    constructor(userDirResult: {user_id: string, display_name: string, avatar_url: string}) {
        super();
        this._userId = userDirResult.user_id;
        this.displayName = userDirResult.display_name;
        this.avatarUrl = userDirResult.avatar_url;
    }

    // These next class members are for the Member interface
    get name(): string {
        return this.displayName || this._userId;
    }

    get userId(): string {
        return this._userId;
    }

    getMxcAvatarUrl(): string {
        return this.avatarUrl;
    }
}

class ThreepidMember extends Member {
    private readonly id: string;

    constructor(id: string) {
        super();
        this.id = id;
    }

    // This is a getter that would be falsey on all other implementations. Until we have
    // better type support in the react-sdk we can use this trick to determine the kind
    // of 3PID we're dealing with, if any.
    get isEmail(): boolean {
        return this.id.includes('@');
    }

    // These next class members are for the Member interface
    get name(): string {
        return this.id;
    }

    get userId(): string {
        return this.id;
    }

    getMxcAvatarUrl(): string {
        return null;
    }
}

interface IDMUserTileProps {
    member: RoomMember;
    onRemove(member: RoomMember): void;
}

class DMUserTile extends React.PureComponent<IDMUserTileProps> {
    private onRemove = (e) => {
        // Stop the browser from highlighting text
        e.preventDefault();
        e.stopPropagation();

        this.props.onRemove(this.props.member);
    };

    render() {
        const avatarSize = 20;
        const avatar = this.props.member.isEmail
            ? <img
                className='mx_InviteDialog_userTile_avatar mx_InviteDialog_userTile_threepidAvatar'
                src={require("../../../../res/img/icon-email-pill-avatar.svg")}
                width={avatarSize} height={avatarSize} />
            : <BaseAvatar
                className='mx_InviteDialog_userTile_avatar'
                url={this.props.member.getMxcAvatarUrl()
                    ? mediaFromMxc(this.props.member.getMxcAvatarUrl()).getSquareThumbnailHttp(avatarSize)
                    : null}
                name={this.props.member.name}
                idName={this.props.member.userId}
                width={avatarSize}
                height={avatarSize} />;

        let closeButton;
        if (this.props.onRemove) {
            closeButton = (
                <AccessibleButton
                    className='mx_InviteDialog_userTile_remove'
                    onClick={this.onRemove}
                >
                    <img src={require("../../../../res/img/icon-pill-remove.svg")}
                        alt={_t('Remove')} width={8} height={8}
                    />
                </AccessibleButton>
            );
        }

        return (
            <span className='mx_InviteDialog_userTile'>
                <span className='mx_InviteDialog_userTile_pill'>
                    {avatar}
                    <span className='mx_InviteDialog_userTile_name'>{this.props.member.name}</span>
                </span>
                { closeButton }
            </span>
        );
    }
}

interface IDMRoomTileProps {
    member: RoomMember;
    lastActiveTs: number;
    onToggle(member: RoomMember): void;
    highlightWord: string;
    isSelected: boolean;
}

class DMRoomTile extends React.PureComponent<IDMRoomTileProps> {
    private onClick = (e) => {
        // Stop the browser from highlighting text
        e.preventDefault();
        e.stopPropagation();

        this.props.onToggle(this.props.member);
    };

    private highlightName(str: string) {
        if (!this.props.highlightWord) return str;

        // We convert things to lowercase for index searching, but pull substrings from
        // the submitted text to preserve case. Note: we don't need to htmlEntities the
        // string because React will safely encode the text for us.
        const lowerStr = str.toLowerCase();
        const filterStr = this.props.highlightWord.toLowerCase();

        const result = [];

        let i = 0;
        let ii;
        while ((ii = lowerStr.indexOf(filterStr, i)) >= 0) {
            // Push any text we missed (first bit/middle of text)
            if (ii > i) {
                // Push any text we aren't highlighting (middle of text match, or beginning of text)
                result.push(<span key={i + 'begin'}>{str.substring(i, ii)}</span>);
            }

            i = ii; // copy over ii only if we have a match (to preserve i for end-of-text matching)

            // Highlight the word the user entered
            const substr = str.substring(i, filterStr.length + i);
            result.push(<span className='mx_InviteDialog_roomTile_highlight' key={i + 'bold'}>{substr}</span>);
            i += substr.length;
        }

        // Push any text we missed (end of text)
        if (i < str.length) {
            result.push(<span key={i + 'end'}>{str.substring(i)}</span>);
        }

        return result;
    }

    render() {
        let timestamp = null;
        if (this.props.lastActiveTs) {
            const humanTs = humanizeTime(this.props.lastActiveTs);
            timestamp = <span className='mx_InviteDialog_roomTile_time'>{humanTs}</span>;
        }

        const avatarSize = 36;
        const avatar = this.props.member.isEmail
            ? <img
                src={require("../../../../res/img/icon-email-pill-avatar.svg")}
                width={avatarSize} height={avatarSize} />
            : <BaseAvatar
                url={this.props.member.getMxcAvatarUrl()
                    ? mediaFromMxc(this.props.member.getMxcAvatarUrl()).getSquareThumbnailHttp(avatarSize)
                    : null}
                name={this.props.member.name}
                idName={this.props.member.userId}
                width={avatarSize}
                height={avatarSize} />;

        let checkmark = null;
        if (this.props.isSelected) {
            // To reduce flickering we put the 'selected' room tile above the real avatar
            checkmark = <div className='mx_InviteDialog_roomTile_selected' />;
        }

        // To reduce flickering we put the checkmark on top of the actual avatar (prevents
        // the browser from reloading the image source when the avatar remounts).
        const stackedAvatar = (
            <span className='mx_InviteDialog_roomTile_avatarStack'>
                {avatar}
                {checkmark}
            </span>
        );

        const caption = this.props.member.isEmail
            ? _t("Invite by email")
            : this.highlightName(this.props.member.userId);

        return (
            <div className='mx_InviteDialog_roomTile' onClick={this.onClick}>
                {stackedAvatar}
                <span className="mx_InviteDialog_roomTile_nameStack">
                    <div className='mx_InviteDialog_roomTile_name'>{this.highlightName(this.props.member.name)}</div>
                    <div className='mx_InviteDialog_roomTile_userId'>{caption}</div>
                </span>
                {timestamp}
            </div>
        );
    }
}

interface IInviteDialogProps {
    // Takes an array of user IDs/emails to invite.
    onFinished: (toInvite?: string[]) => void;

    // The kind of invite being performed. Assumed to be KIND_DM if
    // not provided.
    kind: string,

    // The room ID this dialog is for. Only required for KIND_INVITE.
    roomId: string,

    // The call to transfer. Only required for KIND_CALL_TRANSFER.
    call: MatrixCall,

    // Initial value to populate the filter with
    initialText: string,
}

interface IInviteDialogState {
    targets: RoomMember[]; // array of Member objects (see interface above)
    filterText: string;
    recents: { user: Member, userId: string }[];
    numRecentsShown: number;
    suggestions: { user: Member, userId: string }[];
    numSuggestionsShown: number;
    serverResultsMixin: { user: Member, userId: string }[];
    threepidResultsMixin: { user: Member, userId: string}[];
    canUseIdentityServer: boolean;
    tryingIdentityServer: boolean;
    consultFirst: boolean;

    // These two flags are used for the 'Go' button to communicate what is going on.
    busy: boolean,
    errorText: string,
}

@replaceableComponent("views.dialogs.InviteDialog")
export default class InviteDialog extends React.PureComponent<IInviteDialogProps, IInviteDialogState> {
    static defaultProps = {
        kind: KIND_DM,
        initialText: "",
    };

    private debounceTimer: NodeJS.Timeout = null; // actually number because we're in the browser
    private editorRef = createRef<HTMLInputElement>();
    private unmounted = false;

    constructor(props) {
        super(props);

        if ((props.kind === KIND_INVITE) && !props.roomId) {
            throw new Error("When using KIND_INVITE a roomId is required for an InviteDialog");
        } else if (props.kind === KIND_CALL_TRANSFER && !props.call) {
            throw new Error("When using KIND_CALL_TRANSFER a call is required for an InviteDialog");
        }

        const alreadyInvited = new Set([MatrixClientPeg.get().getUserId(), SdkConfig.get()['welcomeUserId']]);
        if (props.roomId) {
            const room = MatrixClientPeg.get().getRoom(props.roomId);
            if (!room) throw new Error("Room ID given to InviteDialog does not look like a room");
            room.getMembersWithMembership('invite').forEach(m => alreadyInvited.add(m.userId));
            room.getMembersWithMembership('join').forEach(m => alreadyInvited.add(m.userId));
            // add banned users, so we don't try to invite them
            room.getMembersWithMembership('ban').forEach(m => alreadyInvited.add(m.userId));

            CountlyAnalytics.instance.trackBeginInvite(props.roomId);
        }

        this.state = {
            targets: [], // array of Member objects (see interface above)
            filterText: this.props.initialText,
            recents: InviteDialog.buildRecents(alreadyInvited),
            numRecentsShown: INITIAL_ROOMS_SHOWN,
            suggestions: this.buildSuggestions(alreadyInvited),
            numSuggestionsShown: INITIAL_ROOMS_SHOWN,
            serverResultsMixin: [],
            threepidResultsMixin: [],
            canUseIdentityServer: !!MatrixClientPeg.get().getIdentityServerUrl(),
            tryingIdentityServer: false,
            consultFirst: false,

            // These two flags are used for the 'Go' button to communicate what is going on.
            busy: false,
            errorText: null,
        };
    }

    componentDidMount() {
        if (this.props.initialText) {
            this.updateSuggestions(this.props.initialText);
        }
    }

    componentWillUnmount() {
        this.unmounted = true;
    }

    private onConsultFirstChange = (ev) => {
        this.setState({consultFirst: ev.target.checked});
    }

    public static buildRecents(excludedTargetIds: Set<string>): IRecentUser[] {
        const rooms = DMRoomMap.shared().getUniqueRoomsWithIndividuals(); // map of userId => js-sdk Room

        // Also pull in all the rooms tagged as DefaultTagID.DM so we don't miss anything. Sometimes the
        // room list doesn't tag the room for the DMRoomMap, but does for the room list.
        const dmTaggedRooms = RoomListStore.instance.orderedLists[DefaultTagID.DM] || [];
        const myUserId = MatrixClientPeg.get().getUserId();
        for (const dmRoom of dmTaggedRooms) {
            const otherMembers = dmRoom.getJoinedMembers().filter(u => u.userId !== myUserId);
            for (const member of otherMembers) {
                if (rooms[member.userId]) continue; // already have a room

                console.warn(`Adding DM room for ${member.userId} as ${dmRoom.roomId} from tag, not DM map`);
                rooms[member.userId] = dmRoom;
            }
        }

        const recents = [];
        for (const userId in rooms) {
            // Filter out user IDs that are already in the room / should be excluded
            if (excludedTargetIds.has(userId)) {
                console.warn(`[Invite:Recents] Excluding ${userId} from recents`);
                continue;
            }

            const room = rooms[userId];
            const member = room.getMember(userId);
            if (!member) {
                // just skip people who don't have memberships for some reason
                console.warn(`[Invite:Recents] ${userId} is missing a member object in their own DM (${room.roomId})`);
                continue;
            }

            // Find the last timestamp for a message event
            const searchTypes = ["m.room.message", "m.room.encrypted", "m.sticker"];
            const maxSearchEvents = 20; // to prevent traversing history
            let lastEventTs = 0;
            if (room.timeline && room.timeline.length) {
                for (let i = room.timeline.length - 1; i >= 0; i--) {
                    const ev = room.timeline[i];
                    if (searchTypes.includes(ev.getType())) {
                        lastEventTs = ev.getTs();
                        break;
                    }
                    if (room.timeline.length - i > maxSearchEvents) break;
                }
            }
            if (!lastEventTs) {
                // something weird is going on with this room
                console.warn(`[Invite:Recents] ${userId} (${room.roomId}) has a weird last timestamp: ${lastEventTs}`);
                continue;
            }

            recents.push({userId, user: member, lastActive: lastEventTs});
        }
        if (!recents) console.warn("[Invite:Recents] No recents to suggest!");

        // Sort the recents by last active to save us time later
        recents.sort((a, b) => b.lastActive - a.lastActive);

        return recents;
    }

    private buildSuggestions(excludedTargetIds: Set<string>): {userId: string, user: RoomMember}[] {
        const maxConsideredMembers = 200;
        const joinedRooms = MatrixClientPeg.get().getRooms()
            .filter(r => r.getMyMembership() === 'join' && r.getJoinedMemberCount() <= maxConsideredMembers);

        // Generates { userId: {member, rooms[]} }
        const memberRooms = joinedRooms.reduce((members, room) => {
            // Filter out DMs (we'll handle these in the recents section)
            if (DMRoomMap.shared().getUserIdForRoomId(room.roomId)) {
                return members; // Do nothing
            }

            const joinedMembers = room.getJoinedMembers().filter(u => !excludedTargetIds.has(u.userId));
            for (const member of joinedMembers) {
                // Filter out user IDs that are already in the room / should be excluded
                if (excludedTargetIds.has(member.userId)) {
                    continue;
                }

                if (!members[member.userId]) {
                    members[member.userId] = {
                        member: member,
                        // Track the room size of the 'picked' member so we can use the profile of
                        // the smallest room (likely a DM).
                        pickedMemberRoomSize: room.getJoinedMemberCount(),
                        rooms: [],
                    };
                }

                members[member.userId].rooms.push(room);

                if (room.getJoinedMemberCount() < members[member.userId].pickedMemberRoomSize) {
                    members[member.userId].member = member;
                    members[member.userId].pickedMemberRoomSize = room.getJoinedMemberCount();
                }
            }
            return members;
        }, {});

        // Generates { userId: {member, numRooms, score} }
        const memberScores = Object.values(memberRooms).reduce((scores, entry: {member: RoomMember, rooms: Room[]}) => {
            const numMembersTotal = entry.rooms.reduce((c, r) => c + r.getJoinedMemberCount(), 0);
            const maxRange = maxConsideredMembers * entry.rooms.length;
            scores[entry.member.userId] = {
                member: entry.member,
                numRooms: entry.rooms.length,
                score: Math.max(0, Math.pow(1 - (numMembersTotal / maxRange), 5)),
            };
            return scores;
        }, {});

        // Now that we have scores for being in rooms, boost those people who have sent messages
        // recently, as a way to improve the quality of suggestions. We do this by checking every
        // room to see who has sent a message in the last few hours, and giving them a score
        // which correlates to the freshness of their message. In theory, this results in suggestions
        // which are closer to "continue this conversation" rather than "this person exists".
        const trueJoinedRooms = MatrixClientPeg.get().getRooms().filter(r => r.getMyMembership() === 'join');
        const now = (new Date()).getTime();
        const earliestAgeConsidered = now - (60 * 60 * 1000); // 1 hour ago
        const maxMessagesConsidered = 50; // so we don't iterate over a huge amount of traffic
        const lastSpoke = {}; // userId: timestamp
        const lastSpokeMembers = {}; // userId: room member
        for (const room of trueJoinedRooms) {
            // Skip low priority rooms and DMs
            const isDm = DMRoomMap.shared().getUserIdForRoomId(room.roomId);
            if (Object.keys(room.tags).includes("m.lowpriority") || isDm) {
                continue;
            }

            const events = room.getLiveTimeline().getEvents(); // timelines are most recent last
            for (let i = events.length - 1; i >= Math.max(0, events.length - maxMessagesConsidered); i--) {
                const ev = events[i];
                if (excludedTargetIds.has(ev.getSender())) {
                    continue;
                }
                if (ev.getTs() <= earliestAgeConsidered) {
                    break; // give up: all events from here on out are too old
                }

                if (!lastSpoke[ev.getSender()] || lastSpoke[ev.getSender()] < ev.getTs()) {
                    lastSpoke[ev.getSender()] = ev.getTs();
                    lastSpokeMembers[ev.getSender()] = room.getMember(ev.getSender());
                }
            }
        }
        for (const userId in lastSpoke) {
            const ts = lastSpoke[userId];
            const member = lastSpokeMembers[userId];
            if (!member) continue; // skip people we somehow don't have profiles for

            // Scores from being in a room give a 'good' score of about 1.0-1.5, so for our
            // boost we'll try and award at least +1.0 for making the list, with +4.0 being
            // an approximate maximum for being selected.
            const distanceFromNow = Math.abs(now - ts); // abs to account for slight future messages
            const inverseTime = (now - earliestAgeConsidered) - distanceFromNow;
            const scoreBoost = Math.max(1, inverseTime / (15 * 60 * 1000)); // 15min segments to keep scores sane

            let record = memberScores[userId];
            if (!record) record = memberScores[userId] = {score: 0};
            record.member = member;
            record.score += scoreBoost;
        }

        const members = Object.values(memberScores);
        members.sort((a, b) => {
            if (a.score === b.score) {
                if (a.numRooms === b.numRooms) {
                    return compare(a.member.userId, b.member.userId);
                }

                return b.numRooms - a.numRooms;
            }
            return b.score - a.score;
        });

        return members.map(m => ({userId: m.member.userId, user: m.member}));
    }

    private shouldAbortAfterInviteError(result): boolean {
        const failedUsers = Object.keys(result.states).filter(a => result.states[a] === 'error');
        if (failedUsers.length > 0) {
            console.log("Failed to invite users: ", result);
            this.setState({
                busy: false,
                errorText: _t("Failed to invite the following users to chat: %(csvUsers)s", {
                    csvUsers: failedUsers.join(", "),
                }),
            });
            return true; // abort
        }
        return false;
    }

    private convertFilter(): Member[] {
        // Check to see if there's anything to convert first
        if (!this.state.filterText || !this.state.filterText.includes('@')) return this.state.targets || [];

        let newMember: Member;
        if (this.state.filterText.startsWith('@')) {
            // Assume mxid
            newMember = new DirectoryMember({user_id: this.state.filterText, display_name: null, avatar_url: null});
        } else if (SettingsStore.getValue(UIFeature.IdentityServer)) {
            // Assume email
            newMember = new ThreepidMember(this.state.filterText);
        }
        const newTargets = [...(this.state.targets || []), newMember];
        this.setState({targets: newTargets, filterText: ''});
        return newTargets;
    }

    private startDm = async () => {
        this.setState({busy: true});
        const client = MatrixClientPeg.get();
        const targets = this.convertFilter();
        const targetIds = targets.map(t => t.userId);

        // Check if there is already a DM with these people and reuse it if possible.
        let existingRoom: Room;
        if (targetIds.length === 1) {
            existingRoom = findDMForUser(client, targetIds[0]);
        } else {
            existingRoom = DMRoomMap.shared().getDMRoomForIdentifiers(targetIds);
        }
        if (existingRoom) {
            dis.dispatch({
                action: 'view_room',
                room_id: existingRoom.roomId,
                should_peek: false,
                joining: false,
            });
            this.props.onFinished();
            return;
        }

        const createRoomOptions = {inlineErrors: true} as any; // XXX: Type out `createRoomOptions`

        if (privateShouldBeEncrypted()) {
            // Check whether all users have uploaded device keys before.
            // If so, enable encryption in the new room.
            const has3PidMembers = targets.some(t => t instanceof ThreepidMember);
            if (!has3PidMembers) {
                const allHaveDeviceKeys = await canEncryptToAllUsers(client, targetIds);
                if (allHaveDeviceKeys) {
                    createRoomOptions.encryption = true;
                }
            }
        }

        // Check if it's a traditional DM and create the room if required.
        // TODO: [Canonical DMs] Remove this check and instead just create the multi-person DM
        try {
            const isSelf = targetIds.length === 1 && targetIds[0] === client.getUserId();
            if (targetIds.length === 1 && !isSelf) {
                createRoomOptions.dmUserId = targetIds[0];
            }

            if (targetIds.length > 1) {
                createRoomOptions.createOpts = targetIds.reduce(
                    (roomOptions, address) => {
                        const type = getAddressType(address);
                        if (type === 'email') {
                            const invite: IInvite3PID = {
                                id_server: client.getIdentityServerUrl(true),
                                medium: 'email',
                                address,
                            };
                            roomOptions.invite_3pid.push(invite);
                        } else if (type === 'mx-user-id') {
                            roomOptions.invite.push(address);
                        }
                        return roomOptions;
                    },
                    { invite: [], invite_3pid: [] },
                )
            }

            await createRoom(createRoomOptions);
            this.props.onFinished();
        } catch (err) {
            console.error(err);
            this.setState({
                busy: false,
                errorText: _t("We couldn't create your DM."),
            });
        }
    };

    private inviteUsers = async () => {
        const startTime = CountlyAnalytics.getTimestamp();
        this.setState({busy: true});
        this.convertFilter();
        const targets = this.convertFilter();
        const targetIds = targets.map(t => t.userId);

        const cli = MatrixClientPeg.get();
        const room = cli.getRoom(this.props.roomId);
        if (!room) {
            console.error("Failed to find the room to invite users to");
            this.setState({
                busy: false,
                errorText: _t("Something went wrong trying to invite the users."),
            });
            return;
        }

        try {
            const result = await inviteMultipleToRoom(this.props.roomId, targetIds)
            CountlyAnalytics.instance.trackSendInvite(startTime, this.props.roomId, targetIds.length);
            if (!this.shouldAbortAfterInviteError(result)) { // handles setting error message too
                this.props.onFinished();
            }

            if (cli.isRoomEncrypted(this.props.roomId)) {
                const visibilityEvent = room.currentState.getStateEvents(
                    "m.room.history_visibility", "",
                );
                const visibility = visibilityEvent && visibilityEvent.getContent() &&
                    visibilityEvent.getContent().history_visibility;
                if (visibility == "world_readable" || visibility == "shared") {
                    const invitedUsers = [];
                    for (const [addr, state] of Object.entries(result.states)) {
                        if (state === "invited" && getAddressType(addr) === "mx-user-id") {
                            invitedUsers.push(addr);
                        }
                    }
                    console.log("Sharing history with", invitedUsers);
                    cli.sendSharedHistoryKeys(
                        this.props.roomId, invitedUsers,
                    );
                }
            }
        } catch (err) {
            console.error(err);
            this.setState({
                busy: false,
                errorText: _t(
                    "We couldn't invite those users. Please check the users you want to invite and try again.",
                ),
            });
        }
    };

    private transferCall = async () => {
        this.convertFilter();
        const targets = this.convertFilter();
        const targetIds = targets.map(t => t.userId);
        if (targetIds.length > 1) {
            this.setState({
                errorText: _t("A call can only be transferred to a single user."),
            });
        }

        if (this.state.consultFirst) {
            const dmRoomId = await ensureDMExists(MatrixClientPeg.get(), targetIds[0]);

            dis.dispatch({
                action: 'place_call',
                type: this.props.call.type,
                room_id: dmRoomId,
                transferee: this.props.call,
            });
            dis.dispatch({
                action: 'view_room',
                room_id: dmRoomId,
                should_peek: false,
                joining: false,
            });
            this.props.onFinished();
        } else {
            this.setState({busy: true});
            try {
                await this.props.call.transfer(targetIds[0]);
                this.setState({busy: false});
                this.props.onFinished();
            } catch (e) {
                this.setState({
                    busy: false,
                    errorText: _t("Failed to transfer call"),
                });
            }
        }
    };

    private onKeyDown = (e) => {
        if (this.state.busy) return;
        const value = e.target.value.trim();
        const hasModifiers = e.ctrlKey || e.shiftKey || e.metaKey;
        if (!value && this.state.targets.length > 0 && e.key === Key.BACKSPACE && !hasModifiers) {
            // when the field is empty and the user hits backspace remove the right-most target
            e.preventDefault();
            this.removeMember(this.state.targets[this.state.targets.length - 1]);
        } else if (value && e.key === Key.ENTER && !hasModifiers) {
            // when the user hits enter with something in their field try to convert it
            e.preventDefault();
            this.convertFilter();
        } else if (value && e.key === Key.SPACE && !hasModifiers && value.includes("@") && !value.includes(" ")) {
            // when the user hits space and their input looks like an e-mail/MXID then try to convert it
            e.preventDefault();
            this.convertFilter();
        }
    };

    private updateSuggestions = async (term) => {
        MatrixClientPeg.get().searchUserDirectory({term}).then(async r => {
            if (term !== this.state.filterText) {
                // Discard the results - we were probably too slow on the server-side to make
                // these results useful. This is a race we want to avoid because we could overwrite
                // more accurate results.
                return;
            }

            if (!r.results) r.results = [];

            // While we're here, try and autocomplete a search result for the mxid itself
            // if there's no matches (and the input looks like a mxid).
            if (term[0] === '@' && term.indexOf(':') > 1) {
                try {
                    const profile = await MatrixClientPeg.get().getProfileInfo(term);
                    if (profile) {
                        // If we have a profile, we have enough information to assume that
                        // the mxid can be invited - add it to the list. We stick it at the
                        // top so it is most obviously presented to the user.
                        r.results.splice(0, 0, {
                            user_id: term,
                            display_name: profile['displayname'],
                            avatar_url: profile['avatar_url'],
                        });
                    }
                } catch (e) {
                    console.warn("Non-fatal error trying to make an invite for a user ID");
                    console.warn(e);

                    // Add a result anyways, just without a profile. We stick it at the
                    // top so it is most obviously presented to the user.
                    r.results.splice(0, 0, {
                        user_id: term,
                        display_name: term,
                        avatar_url: null,
                    });
                }
            }

            this.setState({
                serverResultsMixin: r.results.map(u => ({
                    userId: u.user_id,
                    user: new DirectoryMember(u),
                })),
            });
        }).catch(e => {
            console.error("Error searching user directory:");
            console.error(e);
            this.setState({serverResultsMixin: []}); // clear results because it's moderately fatal
        });

        // Whenever we search the directory, also try to search the identity server. It's
        // all debounced the same anyways.
        if (!this.state.canUseIdentityServer) {
            // The user doesn't have an identity server set - warn them of that.
            this.setState({tryingIdentityServer: true});
            return;
        }
        if (term.indexOf('@') > 0 && Email.looksValid(term) && SettingsStore.getValue(UIFeature.IdentityServer)) {
            // Start off by suggesting the plain email while we try and resolve it
            // to a real account.
            this.setState({
                // per above: the userId is a lie here - it's just a regular identifier
                threepidResultsMixin: [{user: new ThreepidMember(term), userId: term}],
            });
            try {
                const authClient = new IdentityAuthClient();
                const token = await authClient.getAccessToken();
                if (term !== this.state.filterText) return; // abandon hope

                const lookup = await MatrixClientPeg.get().lookupThreePid(
                    'email',
                    term,
                    undefined, // callback
                    token,
                );
                if (term !== this.state.filterText) return; // abandon hope

                if (!lookup || !lookup.mxid) {
                    // We weren't able to find anyone - we're already suggesting the plain email
                    // as an alternative, so do nothing.
                    return;
                }

                // We append the user suggestion to give the user an option to click
                // the email anyways, and so we don't cause things to jump around. In
                // theory, the user would see the user pop up and think "ah yes, that
                // person!"
                const profile = await MatrixClientPeg.get().getProfileInfo(lookup.mxid);
                if (term !== this.state.filterText || !profile) return; // abandon hope
                this.setState({
                    threepidResultsMixin: [...this.state.threepidResultsMixin, {
                        user: new DirectoryMember({
                            user_id: lookup.mxid,
                            display_name: profile.displayname,
                            avatar_url: profile.avatar_url,
                        }),
                        userId: lookup.mxid,
                    }],
                });
            } catch (e) {
                console.error("Error searching identity server:");
                console.error(e);
                this.setState({threepidResultsMixin: []}); // clear results because it's moderately fatal
            }
        }
    };

    private updateFilter = (e) => {
        const term = e.target.value;
        this.setState({filterText: term});

        // Debounce server lookups to reduce spam. We don't clear the existing server
        // results because they might still be vaguely accurate, likewise for races which
        // could happen here.
        if (this.debounceTimer) {
            clearTimeout(this.debounceTimer);
        }
        this.debounceTimer = setTimeout(() => {
            this.updateSuggestions(term);
        }, 150); // 150ms debounce (human reaction time + some)
    };

    private showMoreRecents = () => {
        this.setState({numRecentsShown: this.state.numRecentsShown + INCREMENT_ROOMS_SHOWN});
    };

    private showMoreSuggestions = () => {
        this.setState({numSuggestionsShown: this.state.numSuggestionsShown + INCREMENT_ROOMS_SHOWN});
    };

    private toggleMember = (member: Member) => {
        if (!this.state.busy) {
            let filterText = this.state.filterText;
            const targets = this.state.targets.map(t => t); // cheap clone for mutation
            const idx = targets.indexOf(member);
            if (idx >= 0) {
                targets.splice(idx, 1);
            } else {
                targets.push(member);
                filterText = ""; // clear the filter when the user accepts a suggestion
            }
            this.setState({targets, filterText});

            if (this.editorRef && this.editorRef.current) {
                this.editorRef.current.focus();
            }
        }
    };

    private removeMember = (member: Member) => {
        const targets = this.state.targets.map(t => t); // cheap clone for mutation
        const idx = targets.indexOf(member);
        if (idx >= 0) {
            targets.splice(idx, 1);
            this.setState({targets});
        }

        if (this.editorRef && this.editorRef.current) {
            this.editorRef.current.focus();
        }
    };

    private onPaste = async (e) => {
        if (this.state.filterText) {
            // if the user has already typed something, just let them
            // paste normally.
            return;
        }

        // Prevent the text being pasted into the input
        e.preventDefault();

        // Process it as a list of addresses to add instead
        const text = e.clipboardData.getData("text");
        const possibleMembers = [
            // If we can avoid hitting the profile endpoint, we should.
            ...this.state.recents,
            ...this.state.suggestions,
            ...this.state.serverResultsMixin,
            ...this.state.threepidResultsMixin,
        ];
        const toAdd = [];
        const failed = [];
        const potentialAddresses = text.split(/[\s,]+/).map(p => p.trim()).filter(p => !!p); // filter empty strings
        for (const address of potentialAddresses) {
            const member = possibleMembers.find(m => m.userId === address);
            if (member) {
                toAdd.push(member.user);
                continue;
            }

            if (address.indexOf('@') > 0 && Email.looksValid(address)) {
                toAdd.push(new ThreepidMember(address));
                continue;
            }

            if (address[0] !== '@') {
                failed.push(address); // not a user ID
                continue;
            }

            try {
                const profile = await MatrixClientPeg.get().getProfileInfo(address);
                const displayName = profile ? profile.displayname : null;
                const avatarUrl = profile ? profile.avatar_url : null;
                toAdd.push(new DirectoryMember({
                    user_id: address,
                    display_name: displayName,
                    avatar_url: avatarUrl,
                }));
            } catch (e) {
                console.error("Error looking up profile for " + address);
                console.error(e);
                failed.push(address);
            }
        }
        if (this.unmounted) return;

        if (failed.length > 0) {
            const QuestionDialog = sdk.getComponent('dialogs.QuestionDialog');
            Modal.createTrackedDialog('Invite Paste Fail', '', QuestionDialog, {
                title: _t('Failed to find the following users'),
                description: _t(
                    "The following users might not exist or are invalid, and cannot be invited: %(csvNames)s",
                    {csvNames: failed.join(", ")},
                ),
                button: _t('OK'),
            });
        }

        this.setState({targets: [...this.state.targets, ...toAdd]});
    };

    private onClickInputArea = (e) => {
        // Stop the browser from highlighting text
        e.preventDefault();
        e.stopPropagation();

        if (this.editorRef && this.editorRef.current) {
            this.editorRef.current.focus();
        }
    };

    private onUseDefaultIdentityServerClick = (e) => {
        e.preventDefault();

        // Update the IS in account data. Actually using it may trigger terms.
        // eslint-disable-next-line react-hooks/rules-of-hooks
        useDefaultIdentityServer();
        this.setState({canUseIdentityServer: true, tryingIdentityServer: false});
    };

    private onManageSettingsClick = (e) => {
        e.preventDefault();
        dis.fire(Action.ViewUserSettings);
        this.props.onFinished();
    };

    private onCommunityInviteClick = (e) => {
        this.props.onFinished();
        showCommunityInviteDialog(CommunityPrototypeStore.instance.getSelectedCommunityId());
    };

    private renderSection(kind: "recents"|"suggestions") {
        let sourceMembers = kind === 'recents' ? this.state.recents : this.state.suggestions;
        let showNum = kind === 'recents' ? this.state.numRecentsShown : this.state.numSuggestionsShown;
        const showMoreFn = kind === 'recents' ? this.showMoreRecents.bind(this) : this.showMoreSuggestions.bind(this);
        const lastActive = (m) => kind === 'recents' ? m.lastActive : null;
        let sectionName = kind === 'recents' ? _t("Recent Conversations") : _t("Suggestions");
        let sectionSubname = null;

        if (kind === 'suggestions' && CommunityPrototypeStore.instance.getSelectedCommunityId()) {
            const communityName = CommunityPrototypeStore.instance.getSelectedCommunityName();
            sectionSubname = _t("May include members not in %(communityName)s", {communityName});
        }

        if (this.props.kind === KIND_INVITE) {
            sectionName = kind === 'recents' ? _t("Recently Direct Messaged") : _t("Suggestions");
        }

        // Mix in the server results if we have any, but only if we're searching. We track the additional
        // members separately because we want to filter sourceMembers but trust the mixin arrays to have
        // the right members in them.
        let priorityAdditionalMembers = []; // Shows up before our own suggestions, higher quality
        let otherAdditionalMembers = []; // Shows up after our own suggestions, lower quality
        const hasMixins = this.state.serverResultsMixin || this.state.threepidResultsMixin;
        if (this.state.filterText && hasMixins && kind === 'suggestions') {
            // We don't want to duplicate members though, so just exclude anyone we've already seen.
            // The type of u is a pain to define but members of both mixins have the 'userId' property
            const notAlreadyExists = (u: any): boolean => {
                return !sourceMembers.some(m => m.userId === u.userId)
                    && !priorityAdditionalMembers.some(m => m.userId === u.userId)
                    && !otherAdditionalMembers.some(m => m.userId === u.userId);
            };

            otherAdditionalMembers = this.state.serverResultsMixin.filter(notAlreadyExists);
            priorityAdditionalMembers = this.state.threepidResultsMixin.filter(notAlreadyExists);
        }
        const hasAdditionalMembers = priorityAdditionalMembers.length > 0 || otherAdditionalMembers.length > 0;

        // Hide the section if there's nothing to filter by
        if (sourceMembers.length === 0 && !hasAdditionalMembers) return null;

        // Do some simple filtering on the input before going much further. If we get no results, say so.
        if (this.state.filterText) {
            const filterBy = this.state.filterText.toLowerCase();
            sourceMembers = sourceMembers
                .filter(m => m.user.name.toLowerCase().includes(filterBy) || m.userId.toLowerCase().includes(filterBy));

            if (sourceMembers.length === 0 && !hasAdditionalMembers) {
                return (
                    <div className='mx_InviteDialog_section'>
                        <h3>{sectionName}</h3>
                        <p>{_t("No results")}</p>
                    </div>
                );
            }
        }

        // Now we mix in the additional members. Again, we presume these have already been filtered. We
        // also assume they are more relevant than our suggestions and prepend them to the list.
        sourceMembers = [...priorityAdditionalMembers, ...sourceMembers, ...otherAdditionalMembers];

        // If we're going to hide one member behind 'show more', just use up the space of the button
        // with the member's tile instead.
        if (showNum === sourceMembers.length - 1) showNum++;

        // .slice() will return an incomplete array but won't error on us if we go too far
        const toRender = sourceMembers.slice(0, showNum);
        const hasMore = toRender.length < sourceMembers.length;

        const AccessibleButton = sdk.getComponent("elements.AccessibleButton");
        let showMore = null;
        if (hasMore) {
            showMore = (
                <AccessibleButton onClick={showMoreFn} kind="link">
                    {_t("Show more")}
                </AccessibleButton>
            );
        }

        const tiles = toRender.map(r => (
            <DMRoomTile
                member={r.user}
                lastActiveTs={lastActive(r)}
                key={r.userId}
                onToggle={this.toggleMember}
                highlightWord={this.state.filterText}
                isSelected={this.state.targets.some(t => t.userId === r.userId)}
            />
        ));
        return (
            <div className='mx_InviteDialog_section'>
                <h3>{sectionName}</h3>
                {sectionSubname ? <p className="mx_InviteDialog_subname">{sectionSubname}</p> : null}
                {tiles}
                {showMore}
            </div>
        );
    }

    private renderEditor() {
        const targets = this.state.targets.map(t => (
            <DMUserTile member={t} onRemove={!this.state.busy && this.removeMember} key={t.userId} />
        ));
        const input = (
            <input
                type="text"
                onKeyDown={this.onKeyDown}
                onChange={this.updateFilter}
                value={this.state.filterText}
                ref={this.editorRef}
                onPaste={this.onPaste}
                autoFocus={true}
                disabled={this.state.busy}
                autoComplete="off"
            />
        );
        return (
            <div className='mx_InviteDialog_editor' onClick={this.onClickInputArea}>
                {targets}
                {input}
            </div>
        );
    }

    private renderIdentityServerWarning() {
        if (!this.state.tryingIdentityServer || this.state.canUseIdentityServer ||
            !SettingsStore.getValue(UIFeature.IdentityServer)
        ) {
            return null;
        }

        const defaultIdentityServerUrl = getDefaultIdentityServerUrl();
        if (defaultIdentityServerUrl) {
            return (
                <div className="mx_AddressPickerDialog_identityServer">{_t(
                    "Use an identity server to invite by email. " +
                    "<default>Use the default (%(defaultIdentityServerName)s)</default> " +
                    "or manage in <settings>Settings</settings>.",
                    {
                        defaultIdentityServerName: abbreviateUrl(defaultIdentityServerUrl),
                    },
                    {
                        default: sub => <a href="#" onClick={this.onUseDefaultIdentityServerClick}>{sub}</a>,
                        settings: sub => <a href="#" onClick={this.onManageSettingsClick}>{sub}</a>,
                    },
                )}</div>
            );
        } else {
            return (
                <div className="mx_AddressPickerDialog_identityServer">{_t(
                    "Use an identity server to invite by email. " +
                    "Manage in <settings>Settings</settings>.",
                    {}, {
                        settings: sub => <a href="#" onClick={this.onManageSettingsClick}>{sub}</a>,
                    },
                )}</div>
            );
        }
    }

    render() {
        const BaseDialog = sdk.getComponent('views.dialogs.BaseDialog');
        const AccessibleButton = sdk.getComponent("elements.AccessibleButton");
        const Spinner = sdk.getComponent("elements.Spinner");

        let spinner = null;
        if (this.state.busy) {
            spinner = <Spinner w={20} h={20} />;
        }


        let title;
        let helpText;
        let buttonText;
        let goButtonFn;
        let consultSection;
        let keySharingWarning = <span />;

        const identityServersEnabled = SettingsStore.getValue(UIFeature.IdentityServer);

        const cli = MatrixClientPeg.get();
        const userId = cli.getUserId();
        if (this.props.kind === KIND_DM) {
            title = _t("Direct Messages");

            if (identityServersEnabled) {
                helpText = _t(
                    "Start a conversation with someone using their name, email address or username (like <userId/>).",
                    {},
                    {userId: () => {
                        return (
                            <a href={makeUserPermalink(userId)} rel="noreferrer noopener" target="_blank">{userId}</a>
                        );
                    }},
                );
            } else {
                helpText = _t(
                    "Start a conversation with someone using their name or username (like <userId/>).",
                    {},
                    {userId: () => {
                        return (
                            <a href={makeUserPermalink(userId)} rel="noreferrer noopener" target="_blank">{userId}</a>
                        );
                    }},
                );
            }

            if (CommunityPrototypeStore.instance.getSelectedCommunityId()) {
                const communityName = CommunityPrototypeStore.instance.getSelectedCommunityName();
                const inviteText = _t(
                    "This won't invite them to %(communityName)s. " +
                    "To invite someone to %(communityName)s, click <a>here</a>",
                    {communityName}, {
                        userId: () => {
                            return (
                                <a
                                    href={makeUserPermalink(userId)}
                                    rel="noreferrer noopener"
                                    target="_blank"
                                >{userId}</a>
                            );
                        },
                        a: (sub) => {
                            return (
                                <AccessibleButton
                                    kind="link"
                                    onClick={this.onCommunityInviteClick}
                                >{sub}</AccessibleButton>
                            );
                        },
                    },
                );
                helpText = <React.Fragment>
                    { helpText } {inviteText}
                </React.Fragment>;
            }
            buttonText = _t("Go");
            goButtonFn = this.startDm;
        } else if (this.props.kind === KIND_INVITE) {
            const room = MatrixClientPeg.get()?.getRoom(this.props.roomId);
            const isSpace = SettingsStore.getValue("feature_spaces") && room?.isSpaceRoom();
            title = isSpace
                ? _t("Invite to %(spaceName)s", {
                    spaceName: room.name || _t("Unnamed Space"),
                })
                : _t("Invite to %(roomName)s", {
                    roomName: room.name || _t("Unnamed Room"),
                });

            let helpTextUntranslated;
            if (isSpace) {
                if (identityServersEnabled) {
                    helpTextUntranslated = _td("Invite someone using their name, email address, username " +
                        "(like <userId/>) or <a>share this space</a>.");
                } else {
                    helpTextUntranslated = _td("Invite someone using their name, username " +
                        "(like <userId/>) or <a>share this space</a>.");
                }
            } else {
                if (identityServersEnabled) {
                    helpTextUntranslated = _td("Invite someone using their name, email address, username " +
                        "(like <userId/>) or <a>share this room</a>.");
                } else {
                    helpTextUntranslated = _td("Invite someone using their name, username " +
                        "(like <userId/>) or <a>share this room</a>.");
                }
            }

            helpText = _t(helpTextUntranslated, {}, {
                userId: () =>
                    <a href={makeUserPermalink(userId)} rel="noreferrer noopener" target="_blank">{userId}</a>,
                a: (sub) =>
                    <a href={makeRoomPermalink(this.props.roomId)} rel="noreferrer noopener" target="_blank">{sub}</a>,
            });

            buttonText = _t("Invite");
            goButtonFn = this.inviteUsers;

            if (cli.isRoomEncrypted(this.props.roomId)) {
                const room = cli.getRoom(this.props.roomId);
                const visibilityEvent = room.currentState.getStateEvents(
                    "m.room.history_visibility", "",
                );
                const visibility = visibilityEvent && visibilityEvent.getContent() &&
                    visibilityEvent.getContent().history_visibility;
                if (visibility === "world_readable" || visibility === "shared") {
                    keySharingWarning =
                        <p className='mx_InviteDialog_helpText'>
                            <img
                                src={require("../../../../res/img/element-icons/info.svg")}
                                width={14} height={14} />
                            {" " + _t("Invited people will be able to read old messages.")}
                        </p>;
                }
            }
        } else if (this.props.kind === KIND_CALL_TRANSFER) {
            title = _t("Transfer");
            buttonText = _t("Transfer");
            goButtonFn = this.transferCall;
            consultSection = <div>
                <label>
                    <input type="checkbox" checked={this.state.consultFirst} onChange={this.onConsultFirstChange} />
                    {_t("Consult first")}
                </label>
            </div>;
        } else {
            console.error("Unknown kind of InviteDialog: " + this.props.kind);
        }

        const hasSelection = this.state.targets.length > 0
            || (this.state.filterText && this.state.filterText.includes('@'));
        return (
            <BaseDialog
                className='mx_InviteDialog'
                hasCancel={true}
                onFinished={this.props.onFinished}
                title={title}
            >
                <div className='mx_InviteDialog_content'>
                    <p className='mx_InviteDialog_helpText'>{helpText}</p>
                    <div className='mx_InviteDialog_addressBar'>
                        {this.renderEditor()}
                        <div className='mx_InviteDialog_buttonAndSpinner'>
                            <AccessibleButton
                                kind="primary"
                                onClick={goButtonFn}
                                className='mx_InviteDialog_goButton'
                                disabled={this.state.busy || !hasSelection}
                            >
                                {buttonText}
                            </AccessibleButton>
                            {spinner}
                        </div>
                    </div>
                    {keySharingWarning}
                    {this.renderIdentityServerWarning()}
                    <div className='error'>{this.state.errorText}</div>
                    <div className='mx_InviteDialog_userSections'>
                        {this.renderSection('recents')}
                        {this.renderSection('suggestions')}
                    </div>
                    {consultSection}
                </div>
            </BaseDialog>
        );
    }
}
