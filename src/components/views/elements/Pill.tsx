/*
Copyright 2017 - 2019, 2021 The Matrix.org Foundation C.I.C.

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

import React from 'react';
import dis from '../../../dispatcher/dispatcher';
import classNames from 'classnames';
import { Room } from 'matrix-js-sdk/src/models/room';
import { RoomMember } from 'matrix-js-sdk/src/models/room-member';
import { MatrixClientPeg } from '../../../MatrixClientPeg';
import FlairStore from "../../../stores/FlairStore";
import { getPrimaryPermalinkEntity, parseAppLocalLink } from "../../../utils/permalinks/Permalinks";
import MatrixClientContext from "../../../contexts/MatrixClientContext";
import { Action } from "../../../dispatcher/actions";
import { mediaFromMxc } from "../../../customisations/Media";
import Tooltip, { Alignment } from './Tooltip';
import { replaceableComponent } from "../../../utils/replaceableComponent";
import { Group } from "matrix-js-sdk/src/models/group";
import { MatrixClient } from 'matrix-js-sdk/src';
import RoomAvatar from '../avatars/RoomAvatar';
import MemberAvatar from '../avatars/MemberAvatar';
import BaseAvatar from '../avatars/BaseAvatar';

interface IProps {
    // The Type of this Pill. If url is given, this is auto-detected.
    type?: string;
    // The URL to pillify (no validation is done)
    url?: string;
    // Whether the pill is in a message
    inMessage?: boolean;
    // The room in which this pill is being rendered
    room?: Room;
    // Whether to include an avatar in the pill
    shouldShowPillAvatar?: boolean;
}

interface IState {
    // ID/alias of the room/user
    resourceId: string;
    // Type of pill
    pillType: string;
    // The member related to the user pill
    member: RoomMember;
    // The group related to the group pill
    group: Group;
    // The room related to the room pill
    room: Room;
    // Is the user hovering the pill
    hover: boolean;
}

@replaceableComponent("views.elements.Pill")
export default class Pill extends React.Component<IProps, IState> {
    private unmounted = true;
    private matrixClient: MatrixClient;

    public static roomNotifPos(text) {
        return text.indexOf("@room");
    }

    public static roomNotifLen() {
        return "@room".length;
    }

    public static TYPE_USER_MENTION = 'TYPE_USER_MENTION';
    public static TYPE_ROOM_MENTION = 'TYPE_ROOM_MENTION';
    public static TYPE_GROUP_MENTION = 'TYPE_GROUP_MENTION';
    public static TYPE_AT_ROOM_MENTION = 'TYPE_AT_ROOM_MENTION'; // '@room' mention

    constructor(props: IProps) {
        super(props);

        this.state = {
            resourceId: null,
            pillType: null,
            member: null,
            group: null,
            room: null,
            hover: false,
        };
    }

    // TODO: [REACT-WARNING] Replace with appropriate lifecycle event
    // eslint-disable-next-line camelcase
    async UNSAFE_componentWillReceiveProps(nextProps: IProps) {
        let resourceId;
        let prefix;

        if (nextProps.url) {
            if (nextProps.inMessage) {
                const parts = parseAppLocalLink(nextProps.url);
                resourceId = parts.primaryEntityId; // The room/user ID
                prefix = parts.sigil; // The first character of prefix
            } else {
                resourceId = getPrimaryPermalinkEntity(nextProps.url);
                prefix = resourceId ? resourceId[0] : undefined;
            }
        }

        const pillType = this.props.type || {
            '@': Pill.TYPE_USER_MENTION,
            '#': Pill.TYPE_ROOM_MENTION,
            '!': Pill.TYPE_ROOM_MENTION,
            '+': Pill.TYPE_GROUP_MENTION,
        }[prefix];

        let member;
        let group;
        let room;
        switch (pillType) {
            case Pill.TYPE_AT_ROOM_MENTION: {
                room = nextProps.room;
            }
                break;
            case Pill.TYPE_USER_MENTION: {
                const localMember = nextProps.room ? nextProps.room.getMember(resourceId) : undefined;
                member = localMember;
                if (!localMember) {
                    member = new RoomMember(null, resourceId);
                    this.doProfileLookup(resourceId, member);
                }
            }
                break;
            case Pill.TYPE_ROOM_MENTION: {
                const localRoom = resourceId[0] === '#' ?
                    MatrixClientPeg.get().getRooms().find((r) => {
                        return r.getCanonicalAlias() === resourceId ||
                               r.getAltAliases().includes(resourceId);
                    }) : MatrixClientPeg.get().getRoom(resourceId);
                room = localRoom;
                if (!localRoom) {
                    // TODO: This would require a new API to resolve a room alias to
                    // a room avatar and name.
                    // this.doRoomProfileLookup(resourceId, member);
                }
            }
                break;
            case Pill.TYPE_GROUP_MENTION: {
                const cli = MatrixClientPeg.get();

                try {
                    group = await FlairStore.getGroupProfileCached(cli, resourceId);
                } catch (e) { // if FlairStore failed, fall back to just groupId
                    group = {
                        groupId: resourceId,
                        avatarUrl: null,
                        name: null,
                    };
                }
            }
        }
        this.setState({ resourceId, pillType, member, group, room });
    }

    componentDidMount() {
        this.unmounted = false;
        this.matrixClient = MatrixClientPeg.get();

        // eslint-disable-next-line new-cap
        this.UNSAFE_componentWillReceiveProps(this.props); // HACK: We shouldn't be calling lifecycle functions ourselves.
    }

    componentWillUnmount() {
        this.unmounted = true;
    }

    private onMouseOver = (): void => {
        this.setState({
            hover: true,
        });
    };

    private onMouseLeave = (): void => {
        this.setState({
            hover: false,
        });
    };

    private doProfileLookup(userId: string, member): void {
        MatrixClientPeg.get().getProfileInfo(userId).then((resp) => {
            if (this.unmounted) {
                return;
            }
            member.name = resp.displayname;
            member.rawDisplayName = resp.displayname;
            member.events.member = {
                getContent: () => {
                    return { avatar_url: resp.avatar_url };
                },
                getDirectionalContent: function() {
                    return this.getContent();
                },
            };
            this.setState({ member });
        }).catch((err) => {
            console.error('Could not retrieve profile data for ' + userId + ':', err);
        });
    }

    private onUserPillClicked = (): void => {
        e.preventDefault();
        dis.dispatch({
            action: Action.ViewUser,
            member: this.state.member,
        });
    };

    render() {
        const resource = this.state.resourceId;

        let avatar = null;
        let linkText = resource;
        let pillClass;
        let userId;
        let href = this.props.url;
        let onClick;
        switch (this.state.pillType) {
            case Pill.TYPE_AT_ROOM_MENTION: {
                const room = this.props.room;
                if (room) {
                    linkText = "@room";
                    if (this.props.shouldShowPillAvatar) {
                        avatar = <RoomAvatar room={room} width={16} height={16} aria-hidden="true" />;
                    }
                    pillClass = 'mx_AtRoomPill';
                }
            }
                break;
            case Pill.TYPE_USER_MENTION: {
                // If this user is not a member of this room, default to the empty member
                const member = this.state.member;
                if (member) {
                    userId = member.userId;
                    member.rawDisplayName = member.rawDisplayName || '';
                    linkText = member.rawDisplayName;
                    if (this.props.shouldShowPillAvatar) {
                        avatar = <MemberAvatar member={member} width={16} height={16} aria-hidden="true" />;
                    }
                    pillClass = 'mx_UserPill';
                    href = null;
                    onClick = this.onUserPillClicked;
                }
            }
                break;
            case Pill.TYPE_ROOM_MENTION: {
                const room = this.state.room;
                if (room) {
                    linkText = room.name || resource;
                    if (this.props.shouldShowPillAvatar) {
                        avatar = <RoomAvatar room={room} width={16} height={16} aria-hidden="true" />;
                    }
                }
                pillClass = room?.isSpaceRoom() ? "mx_SpacePill" : "mx_RoomPill";
            }
                break;
            case Pill.TYPE_GROUP_MENTION: {
                if (this.state.group) {
                    const { avatarUrl, groupId, name } = this.state.group;

                    linkText = groupId;
                    if (this.props.shouldShowPillAvatar) {
                        avatar = <BaseAvatar
                            name={name || groupId}
                            width={16}
                            height={16}
                            aria-hidden="true"
                            url={avatarUrl ? mediaFromMxc(avatarUrl).getSquareThumbnailHttp(16) : null} />;
                    }
                    pillClass = 'mx_GroupPill';
                }
            }
                break;
        }

        const classes = classNames("mx_Pill", pillClass, {
            "mx_UserPill_me": userId === MatrixClientPeg.get().getUserId(),
        });

        if (this.state.pillType) {
            let tip;
            if (this.state.hover && resource) {
                tip = <Tooltip label={resource} alignment={Alignment.Right} />;
            }

            return <MatrixClientContext.Provider value={this.matrixClient}>
                { this.props.inMessage ?
                    <a
                        className={classes}
                        href={href}
                        onClick={onClick}
                        onMouseOver={this.onMouseOver}
                        onMouseLeave={this.onMouseLeave}
                    >
                        { avatar }
                        { linkText }
                        { tip }
                    </a> :
                    <span
                        className={classes}
                        onMouseOver={this.onMouseOver}
                        onMouseLeave={this.onMouseLeave}
                    >
                        { avatar }
                        { linkText }
                        { tip }
                    </span> }
            </MatrixClientContext.Provider>;
        } else {
            // Deliberately render nothing if the URL isn't recognised
            return null;
        }
    }
}
