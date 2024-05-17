/*
Copyright 2015, 2016 OpenMarket Ltd
Copyright 2017 Vector Creations Ltd
Copyright 2017, 2018 New Vector Ltd
Copyright 2021 Šimon Brandner <simon.bra.ag@gmail.com>

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

import React, { ReactNode } from "react";
import { Button, Tooltip } from "@vector-im/compound-web";
import { Icon as UserAddIcon } from "@vector-im/compound-design-tokens/icons/user-add-solid.svg";

import { _t } from "../../../languageHandler";
import BaseCard from "../right_panel/BaseCard";
import TruncatedList from "../elements/TruncatedList";
import Spinner from "../elements/Spinner";
import SearchBox from "../../structures/SearchBox";
import { ButtonEvent } from "../elements/AccessibleButton";
import EntityTile from "./EntityTile";
import MemberTile from "./MemberTile";
import BaseAvatar from "../avatars/BaseAvatar";
import PosthogTrackers from "../../../PosthogTrackers";
import { RoomMember } from "../../../models/rooms/RoomMember";
import { ThreePIDInvite } from "../../../models/rooms/ThreePIDInvite";
import { useMemberListViewModelFactory } from "../../../view-models/rooms/memberlist/useMemberListViewModelFactory";

interface IProps {
    roomId: string;
    header?: ReactNode;
    onClose(): void;
    onInviteButtonClick(roomId: string): void;
    onThreePIDInviteClick(eventId: string): void;
}

const MemberList: React.FC<IProps> = (propsIn: IProps) => {
    const viewModel = useMemberListViewModelFactory(propsIn.roomId);
    const props = { ...propsIn, ...viewModel };

    const createOverflowTileJoined = (overflowCount: number, totalCount: number): JSX.Element => {
        return createOverflowTile(overflowCount, totalCount, props.showMoreJoinedMemberList);
    };

    const createOverflowTileInvited = (overflowCount: number, totalCount: number): JSX.Element => {
        return createOverflowTile(overflowCount, totalCount, props.showMoreInvitedMemberList);
    };

    const createOverflowTile = (overflowCount: number, totalCount: number, onClick: () => void): JSX.Element => {
        // For now we'll pretend this is any entity. It should probably be a separate tile.
        const text = _t("common|and_n_others", { count: overflowCount });
        return (
            <EntityTile
                className="mx_EntityTile_ellipsis"
                avatarJsx={
                    <BaseAvatar url={require("../../../../res/img/ellipsis.svg").default} name="..." size="36px" />
                }
                name={text}
                showPresence={false}
                onClick={onClick}
            />
        );
    };

    function makeMemberTiles(members: Array<RoomMember | ThreePIDInvite>): JSX.Element[] {
        return members.map((m) => {
            if ("userId" in m) {
                // Is a Matrix invite
                return <MemberTile key={m.userId} member={m} showPresence={props.showPresence} />;
            } else {
                // Is a 3pid invite
                return (
                    <EntityTile
                        key={m.stateKey}
                        name={m.displayName}
                        showPresence={false}
                        onClick={() => props.onThreePIDInviteClick(m.eventId)}
                    />
                );
            }
        });
    }

    const getChildrenJoined = (start: number, end: number): Array<JSX.Element> => {
        return makeMemberTiles(props.joinedMembers.slice(start, end));
    };

    const getChildCountJoined = (): number => props.joinedMembers.length;

    const getChildrenInvited = (start: number, end: number): Array<JSX.Element> => {
        return makeMemberTiles(props.invitedMembers.slice(start, end));
    };

    const getChildCountInvited = (): number => {
        return props.invitedMembers.length;
    };

    const onInviteButtonClick = (ev: ButtonEvent): void => {
        PosthogTrackers.trackInteraction("WebRightPanelMemberListInviteButton", ev);
        props.onInviteButtonClick(props.roomId);
    };

    if (props.loading) {
        return (
            <BaseCard className="mx_MemberList" onClose={props.onClose}>
                <Spinner />
            </BaseCard>
        );
    }

    let inviteButton: JSX.Element | undefined;

    if (props.shouldShowInvite) {
        const inviteButtonText = props.isSpaceRoom ? _t("space|invite_this_space") : _t("room|invite_this_room");

        const button = (
            <Button
                size="sm"
                kind="secondary"
                className="mx_MemberList_invite"
                onClick={onInviteButtonClick}
                disabled={!props.canInvite}
            >
                <UserAddIcon width="1em" height="1em" />
                {inviteButtonText}
            </Button>
        );

        if (props.canInvite) {
            inviteButton = button;
        } else {
            inviteButton = <Tooltip label={_t("member_list|invite_button_no_perms_tooltip")}>{button}</Tooltip>;
        }
    }

    let invitedHeader;
    let invitedSection;
    if (getChildCountInvited() > 0) {
        invitedHeader = <h2>{_t("member_list|invited_list_heading")}</h2>;
        invitedSection = (
            <TruncatedList
                className="mx_MemberList_section mx_MemberList_invited"
                truncateAt={props.truncateAtInvited}
                createOverflowElement={createOverflowTileInvited}
                getChildren={getChildrenInvited}
                getChildCount={getChildCountInvited}
            />
        );
    }

    const footer = (
        <SearchBox
            className="mx_MemberList_query mx_textinput_icon mx_textinput_search"
            placeholder={_t("member_list|filter_placeholder")}
            onSearch={props.onSearchQueryChanged}
            initialValue={props.searchQuery}
        />
    );

    return (
        <BaseCard
            className="mx_MemberList"
            header={props.header && <React.Fragment>{props.header}</React.Fragment>}
            footer={footer}
            onClose={props.onClose}
        >
            {inviteButton}
            <div className="mx_MemberList_wrapper">
                <TruncatedList
                    className="mx_MemberList_section mx_MemberList_joined"
                    truncateAt={props.truncateAtJoined}
                    createOverflowElement={createOverflowTileJoined}
                    getChildren={getChildrenJoined}
                    getChildCount={getChildCountJoined}
                />
                {invitedHeader}
                {invitedSection}
            </div>
        </BaseCard>
    );
};

export default MemberList;
