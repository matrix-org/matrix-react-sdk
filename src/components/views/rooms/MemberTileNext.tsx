/*
Copyright 2015, 2016 OpenMarket Ltd
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

import React from "react";

import { _t } from "../../../languageHandler";
import DisambiguatedProfile from "../messages/DisambiguatedProfile";
import UserIdentifierCustomisations from "../../../customisations/UserIdentifier";
import { RoomMember } from "../../../models/rooms/RoomMember";
import MemberAvatarNext from "../avatars/MemberAvatarNext";
import EntityTileRefactored from "./EntityTileRefactored";
import useMemberTileViewModel, { MemberTileViewModel } from "./MemberTileViewModel";

interface IProps {
    member: RoomMember;
    showPresence?: boolean;
}

export default function MemberTileView(props: IProps): JSX.Element {
    const vm = useMemberTileViewModel(props);
    return <MemberTile vm={vm} />;
}

export function MemberTile(props: { vm: MemberTileViewModel }): JSX.Element {
    const vm = props.vm;
    const member = vm.member;

    const getPowerLabel = (): string => {
        return _t("member_list|power_label", {
            userName: UserIdentifierCustomisations.getDisplayUserIdentifier(member.userId, {
                roomId: member.roomId,
            }),
            powerLevelNumber: member.powerLevel,
        }).trim();
    };

    const name = vm.name;

    const av = <MemberAvatarNext member={member} size="36px" aria-hidden="true" />;

    const powerStatus = vm.powerStatus;

    const nameJSX = <DisambiguatedProfile member={member} fallbackName={name || ""} />;

    return (
        <EntityTileRefactored
            {...props}
            presenceState={member.presence?.state}
            presenceLastActiveAgo={member.presence?.lastActiveAgo || 0}
            presenceLastTs={member.presence?.lastPresenceTime || 0}
            presenceCurrentlyActive={member.presence?.currentlyActive || false}
            avatarJsx={av}
            title={getPowerLabel()}
            name={name}
            nameJSX={nameJSX}
            powerStatus={powerStatus}
            showPresence={vm.showPresence}
            e2eStatus={vm.e2eStatus}
            onClick={vm.onClick}
        />
    );
}
