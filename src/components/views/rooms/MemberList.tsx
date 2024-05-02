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

import React, { useEffect } from "react";
import { Button, Tooltip } from "@vector-im/compound-web";
import { Icon as UserAddIcon } from "@vector-im/compound-design-tokens/icons/user-add-solid.svg";

import { _t } from "../../../languageHandler";
import { MatrixClientPeg } from "../../../MatrixClientPeg";
import BaseCard from "../right_panel/BaseCard";
import TruncatedList from "../elements/TruncatedList";
import Spinner from "../elements/Spinner";
import SearchBox from "../../structures/SearchBox";
import { ButtonEvent } from "../elements/AccessibleButton";
import EntityTile from "./EntityTile";
import MemberTile from "./MemberTile";
import BaseAvatar from "../avatars/BaseAvatar";
import PosthogTrackers from "../../../PosthogTrackers";
import { SDKContext } from "../../../contexts/SDKContext";
import { SpaceScopeHeader } from "./SpaceScopeHeader";
import { IMemberListViewModel } from "../../../screens/rooms/memberlist/MemberListViewModel";
import { RoomMember } from "../../../models/rooms/RoomMember";
import { ThreePIDInvite } from "../../../models/rooms/ThreePIDInvite";
import { useMemberListViewModel } from "../../../screens/rooms/memberlist/useMemberListViewModel";

interface IHOCProps {
    roomId: string;
    onClose(): void;
    onInviteButtonClick(roomId: string): void;
    onThreePIDInviteClick(eventId: string): void;
}

const MemberListHOC: React.FC<IHOCProps> = (props: IHOCProps) => {
    let viewModel = useMemberListViewModel(props.roomId)

    useEffect(() => {
        viewModel.load()
        return () => { 
            viewModel.unload()
        };
    }, []); 

    return <MemberList 
    {...props}
    {...viewModel}
     />;
};

export default MemberListHOC

interface IProps extends IMemberListViewModel, IHOCProps { }

class MemberList extends React.Component<IProps> {
    private readonly showPresence: boolean;

    public static contextType = SDKContext;
    public context!: React.ContextType<typeof SDKContext>;
    private tiles: Map<string, MemberTile> = new Map();

    public constructor(props: IProps, context: React.ContextType<typeof SDKContext>) {
        super(props);
        this.showPresence = context?.memberListStore.isPresenceEnabled() ?? true;
    }

    private createOverflowTileJoined = (overflowCount: number, totalCount: number): JSX.Element => {
        return this.createOverflowTile(overflowCount, totalCount, this.props.showMoreJoinedMemberList);
    };

    private createOverflowTileInvited = (overflowCount: number, totalCount: number): JSX.Element => {
        return this.createOverflowTile(overflowCount, totalCount, this.props.showMoreInvitedMemberList);
    };

    private createOverflowTile = (overflowCount: number, totalCount: number, onClick: () => void): JSX.Element => {
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

    private makeMemberTiles(members: Array<RoomMember | ThreePIDInvite>): JSX.Element[] {
        return members.map((m) => {
            if ("userId" in m) {
                // Is a Matrix invite
                return (
                    <MemberTile
                        key={m.userId}
                        member={m}
                        ref={(tile) => {
                            if (tile) this.tiles.set(m.userId, tile);
                            else this.tiles.delete(m.userId);
                        }}
                        showPresence={this.showPresence}
                    />
                );
            } else {
                // Is a 3pid invite
                return (
                    <EntityTile
                        key={m.stateKey}
                        name={m.displayName}
                        showPresence={false}
                        onClick={() => this.props.onThreePIDInviteClick(m.eventId)}
                    />
                );
            }
        });
    }

    private getChildrenJoined = (start: number, end: number): Array<JSX.Element> => {
        return this.makeMemberTiles(this.props.joinedMembers.slice(start, end));
    };

    private getChildCountJoined = (): number => this.props.joinedMembers.length;

    private getChildrenInvited = (start: number, end: number): Array<JSX.Element> => {
        return this.makeMemberTiles(this.props.invitedMembers.slice(start, end));
    };

    private getChildCountInvited = (): number => {
        return this.props.invitedMembers.length
    };

    private onInviteButtonClick = (ev: ButtonEvent): void => {
        PosthogTrackers.trackInteraction("WebRightPanelMemberListInviteButton", ev);
        this.props.onInviteButtonClick(this.props.roomId)
    };

    public render(): React.ReactNode {
        if (this.props.loading) {
            return (
                <BaseCard className="mx_MemberList" onClose={this.props.onClose}>
                    <Spinner />
                </BaseCard>
            );
        }

        const cli = MatrixClientPeg.safeGet();
        const room = cli.getRoom(this.props.roomId);
        let inviteButton: JSX.Element | undefined;

        if (this.props.shouldShowInvite) {
            const inviteButtonText = this.props.isSpaceRoom ? _t("space|invite_this_space") : _t("room|invite_this_room");

            const button = (
                <Button
                    size="sm"
                    kind="secondary"
                    className="mx_MemberList_invite"
                    onClick={this.onInviteButtonClick}
                    disabled={!this.props.canInvite}
                >
                    <UserAddIcon width="1em" height="1em" />
                    {inviteButtonText}
                </Button>
            );

            if (this.props.canInvite) {
                inviteButton = button;
            } else {
                inviteButton = <Tooltip label={_t("member_list|invite_button_no_perms_tooltip")}>{button}</Tooltip>;
            }
        }

        let invitedHeader;
        let invitedSection;
        if (this.getChildCountInvited() > 0) {
            invitedHeader = <h2>{_t("member_list|invited_list_heading")}</h2>;
            invitedSection = (
                <TruncatedList
                    className="mx_MemberList_section mx_MemberList_invited"
                    truncateAt={this.props.truncateAtInvited}
                    createOverflowElement={this.createOverflowTileInvited}
                    getChildren={this.getChildrenInvited}
                    getChildCount={this.getChildCountInvited}
                />
            );
        }

        const footer = (
            <SearchBox
                className="mx_MemberList_query mx_textinput_icon mx_textinput_search"
                placeholder={_t("member_list|filter_placeholder")}
                onSearch={this.props.onSearchQueryChanged}
                initialValue={this.props.searchQuery}
            />
        );

        const scopeHeader = room ? <SpaceScopeHeader room={room} /> : undefined;

        return (
            <BaseCard
                className="mx_MemberList"
                header={<React.Fragment>{scopeHeader}</React.Fragment>}
                footer={footer}
                onClose={this.props.onClose}
            >
                {inviteButton}
                <div className="mx_MemberList_wrapper">
                    <TruncatedList
                        className="mx_MemberList_section mx_MemberList_joined"
                        truncateAt={this.props.truncateAtJoined}
                        createOverflowElement={this.createOverflowTileJoined}
                        getChildren={this.getChildrenJoined}
                        getChildCount={this.getChildCountJoined}
                    />
                    {invitedHeader}
                    {invitedSection}
                </div>
            </BaseCard>
        );
    }
}
