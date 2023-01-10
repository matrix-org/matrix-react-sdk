/*
Copyright 2015, 2016 OpenMarket Ltd
Copyright 2017, 2018 Vector Creations Ltd
Copyright 2019 Michael Telatynski <7t3chguy@gmail.com>
Copyright 2019 - 2022 The Matrix.org Foundation C.I.C.

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

import { RoomMember } from "matrix-js-sdk/src/models/room-member";
import { User } from "matrix-js-sdk/src/models/user";
import React, { useCallback, useContext, useState } from "react";
import { MatrixClient } from "matrix-js-sdk/src/matrix";

import MatrixClientContext from "../../../../contexts/MatrixClientContext";
import { mediaFromMxc } from "../../../../customisations/Media";
import Modal from "../../../../Modal";
import SdkConfig from "../../../../SdkConfig";
import { E2EStatus } from "../../../../utils/ShieldUtils";
import MemberAvatar from "../../avatars/MemberAvatar";
import ImageView from "../../elements/ImageView";
import PresenceLabel from "../../rooms/PresenceLabel";
import E2EIcon from "../../rooms/E2EIcon";
import UserIdentifierCustomisations from "../../../../customisations/UserIdentifier";
import AccessibleButton from "../../elements/AccessibleButton";
import { _t } from "../../../../languageHandler";
import { DirectoryMember, startDmOnFirstMessage } from "../../../../utils/direct-messages";

export const UserInfoHeader: React.FC<{
    member: RoomMember | User;
    e2eStatus: E2EStatus;
    roomId?: string;
    isIgnored: boolean;
}> = ({ member, e2eStatus, roomId, isIgnored }) => {
    const cli = useContext(MatrixClientContext);

    const onMemberAvatarClick = useCallback(() => {
        const avatarUrl = (member as RoomMember).getMxcAvatarUrl
            ? (member as RoomMember).getMxcAvatarUrl()
            : (member as User).avatarUrl;
        if (!avatarUrl) return;

        const httpUrl = mediaFromMxc(avatarUrl).srcHttp;
        const params = {
            src: httpUrl,
            name: (member as RoomMember).name || (member as User).displayName,
        };

        Modal.createDialog(ImageView, params, "mx_Dialog_lightbox", null, true);
    }, [member]);

    const avatarElement = (
        <div className="mx_UserInfo_avatar">
            <MemberAvatar
                key={member.userId} // to instantly blank the avatar when UserInfo changes members
                member={member as RoomMember}
                width={64}
                height={64}
                resizeMethod="scale"
                fallbackUserId={member.userId}
                onClick={onMemberAvatarClick}
                urls={(member as User).avatarUrl ? [(member as User).avatarUrl] : undefined}
            />
        </div>
    );

    let presenceState;
    let presenceLastActiveAgo;
    let presenceCurrentlyActive;
    if (member instanceof RoomMember && member.user) {
        presenceState = member.user.presence;
        presenceLastActiveAgo = member.user.lastActiveAgo;
        presenceCurrentlyActive = member.user.currentlyActive;
    }

    const enablePresenceByHsUrl = SdkConfig.get("enable_presence_by_hs_url");
    let showPresence = true;
    if (enablePresenceByHsUrl && enablePresenceByHsUrl[cli.baseUrl] !== undefined) {
        showPresence = enablePresenceByHsUrl[cli.baseUrl];
    }

    let presenceLabel = null;
    if (showPresence) {
        presenceLabel = (
            <PresenceLabel
                activeAgo={presenceLastActiveAgo}
                currentlyActive={presenceCurrentlyActive}
                presenceState={presenceState}
            />
        );
    }

    let e2eIcon;
    if (e2eStatus) {
        e2eIcon = <E2EIcon size={18} status={e2eStatus} isUser={true} />;
    }

    const displayName = (member as RoomMember).rawDisplayName;
    return (
        <React.Fragment>
            {avatarElement}

            <div className="mx_UserInfo_container mx_UserInfo_separator">
                <div className="mx_UserInfo_profile">
                    <div>
                        <h2>
                            {e2eIcon}
                            <span title={displayName} aria-label={displayName} dir="auto">
                                {displayName}
                            </span>
                        </h2>
                    </div>
                    <div className="mx_UserInfo_profile_mxid">
                        {UserIdentifierCustomisations.getDisplayUserIdentifier(member.userId, {
                            roomId,
                            withDisplayName: true,
                        })}
                    </div>
                    <div className="mx_UserInfo_profileStatus">{presenceLabel}</div>
                </div>

                {member.userId !== cli.getUserId() && (
                    <section className="mx_buttons_row mx_butons_row_equalSize">
                        <MessageButton member={member as RoomMember} />
                        <AccessibleButton
                            kind="danger_outline"
                            onClick={() => {
                                const ignoredUsers = cli.getIgnoredUsers();
                                if (isIgnored) {
                                    const index = ignoredUsers.indexOf(member.userId);
                                    if (index !== -1) ignoredUsers.splice(index, 1);
                                } else {
                                    ignoredUsers.push(member.userId);
                                }

                                cli.setIgnoredUsers(ignoredUsers);
                            }}
                            className="mx_UserInfo_cta"
                        >
                            {isIgnored ? _t("Unignore") : _t("Ignore")}
                        </AccessibleButton>
                    </section>
                )}
            </div>
        </React.Fragment>
    );
};

async function openDMForUser(matrixClient: MatrixClient, user: RoomMember): Promise<void> {
    const startDMUser = new DirectoryMember({
        user_id: user.userId,
        display_name: user.rawDisplayName,
        avatar_url: user.getMxcAvatarUrl(),
    });
    startDmOnFirstMessage(matrixClient, [startDMUser]);
}

const MessageButton = ({ member }: { member: RoomMember }) => {
    const cli = useContext(MatrixClientContext);
    const [busy, setBusy] = useState(false);

    return (
        <AccessibleButton
            kind="primary"
            onClick={async () => {
                if (busy) return;
                setBusy(true);
                await openDMForUser(cli, member);
                setBusy(false);
            }}
            className="mx_UserInfo_cta"
            disabled={busy}
        >
            {_t("Message")}
        </AccessibleButton>
    );
};
