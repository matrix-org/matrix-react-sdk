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

import React, { useEffect, useState } from "react";
import { RoomStateEvent, MatrixEvent, EventType } from "matrix-js-sdk/src/matrix";
import { DeviceInfo } from "matrix-js-sdk/src/crypto/deviceinfo";
import { CryptoEvent } from "matrix-js-sdk/src/crypto";
import { UserVerificationStatus } from "matrix-js-sdk/src/crypto-api";

import dis from "../../../dispatcher/dispatcher";
import { _t } from "../../../languageHandler";
import { MatrixClientPeg } from "../../../MatrixClientPeg";
import { Action } from "../../../dispatcher/actions";
import { PowerStatus } from "./EntityTile";
import DisambiguatedProfile from "../messages/DisambiguatedProfile";
import UserIdentifierCustomisations from "../../../customisations/UserIdentifier";
import { E2EState } from "../../../models/rooms/E2EState";
import { asyncSome } from "../../../utils/arrays";
import { getUserDeviceIds } from "../../../utils/crypto/deviceInfo";
import { RoomMember } from "../../../models/rooms/RoomMember";
import MemberAvatarNext from "../avatars/MemberAvatarNext";
import EntityTileRefactored from "./EntityTileRefactored";

interface IProps {
    member: RoomMember;
    showPresence?: boolean;
}

export default function MemberTile(props: IProps): JSX.Element {
    // const [isRoomEncrypted, setIsRoomEncrypted] = useState(false);
    const [e2eStatus, setE2eStatus] = useState<E2EState | undefined>();

    useEffect(() => {
        const cli = MatrixClientPeg.safeGet();

        const updateE2EStatus = async (): Promise<void> => {
            const { userId } = props.member;
            const isMe = userId === cli.getUserId();
            const userTrust = await cli.getCrypto()?.getUserVerificationStatus(userId);
            if (!userTrust?.isCrossSigningVerified()) {
                setE2eStatus(userTrust?.wasCrossSigningVerified() ? E2EState.Warning : E2EState.Normal);
                return;
            }

            const deviceIDs = await getUserDeviceIds(cli, userId);
            const anyDeviceUnverified = await asyncSome(deviceIDs, async (deviceId) => {
                // For your own devices, we use the stricter check of cross-signing
                // verification to encourage everyone to trust their own devices via
                // cross-signing so that other users can then safely trust you.
                // For other people's devices, the more general verified check that
                // includes locally verified devices can be used.
                const deviceTrust = await cli.getCrypto()?.getDeviceVerificationStatus(userId, deviceId);
                return !deviceTrust || (isMe ? !deviceTrust.crossSigningVerified : !deviceTrust.isVerified());
            });
            setE2eStatus(anyDeviceUnverified ? E2EState.Warning : E2EState.Verified);
        };

        const onRoomStateEvents = (ev: MatrixEvent): void => {
            if (ev.getType() !== EventType.RoomEncryption) return;
            const { roomId } = props.member;
            if (ev.getRoomId() !== roomId) return;

            // The room is encrypted now.
            cli.removeListener(RoomStateEvent.Events, onRoomStateEvents);
            updateE2EStatus();
        };

        const onUserTrustStatusChanged = (userId: string, trustStatus: UserVerificationStatus): void => {
            if (userId !== props.member.userId) return;
            updateE2EStatus();
        };

        const onDeviceVerificationChanged = (userId: string, deviceId: string, deviceInfo: DeviceInfo): void => {
            if (userId !== props.member.userId) return;
            updateE2EStatus();
        };

        const { roomId } = props.member;
        if (roomId) {
            const isRoomEncrypted = cli.isRoomEncrypted(roomId);
            if (isRoomEncrypted) {
                cli.on(CryptoEvent.UserTrustStatusChanged, onUserTrustStatusChanged);
                cli.on(CryptoEvent.DeviceVerificationChanged, onDeviceVerificationChanged);
                updateE2EStatus();
            } else {
                // Listen for room to become encrypted
                cli.on(RoomStateEvent.Events, onRoomStateEvents);
            }
        }

        return () => {
            if (cli) {
                cli.removeListener(RoomStateEvent.Events, onRoomStateEvents);
                cli.removeListener(CryptoEvent.UserTrustStatusChanged, onUserTrustStatusChanged);
                cli.removeListener(CryptoEvent.DeviceVerificationChanged, onDeviceVerificationChanged);
            }
        };
    }, [props.member]);

    const onClick = (): void => {
        dis.dispatch({
            action: Action.ViewUser,
            member: props.member,
            push: true,
        });
    };

    const getDisplayName = (): string => {
        return props.member.name;
    };

    const getPowerLabel = (): string => {
        return _t("member_list|power_label", {
            userName: UserIdentifierCustomisations.getDisplayUserIdentifier(props.member.userId, {
                roomId: props.member.roomId,
            }),
            powerLevelNumber: props.member.powerLevel,
        }).trim();
    };

    const member = props.member;
    const name = getDisplayName();

    const av = <MemberAvatarNext member={member} size="36px" aria-hidden="true" />;

    const powerStatusMap = new Map([
        [100, PowerStatus.Admin],
        [50, PowerStatus.Moderator],
    ]);

    // Find the nearest power level with a badge
    let powerLevel = props.member.powerLevel;
    for (const [pl] of powerStatusMap) {
        if (props.member.powerLevel >= pl) {
            powerLevel = pl;
            break;
        }
    }

    const powerStatus = powerStatusMap.get(powerLevel);

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
            showPresence={props.showPresence}
            e2eStatus={e2eStatus}
            onClick={onClick}
        />
    );
}
