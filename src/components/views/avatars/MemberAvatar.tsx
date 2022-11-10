/*
Copyright 2015, 2016 OpenMarket Ltd
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

import React, { useContext, useEffect, useState } from 'react';
import { RoomMember } from "matrix-js-sdk/src/models/room-member";
import { ResizeMethod } from 'matrix-js-sdk/src/@types/partials';

import dis from "../../../dispatcher/dispatcher";
import { Action } from "../../../dispatcher/actions";
import BaseAvatar from "./BaseAvatar";
import { mediaFromMxc } from "../../../customisations/Media";
import { CardContext } from '../right_panel/context';
import UserIdentifierCustomisations from '../../../customisations/UserIdentifier';
import { useRoomMemberProfile } from '../../../hooks/room/useRoomMemberProfile';

interface IProps extends Omit<React.ComponentProps<typeof BaseAvatar>, "name" | "idName" | "url"> {
    member: RoomMember | null;
    fallbackUserId?: string;
    width: number;
    height: number;
    resizeMethod?: ResizeMethod;
    // The onClick to give the avatar
    onClick?: React.MouseEventHandler;
    // Whether the onClick of the avatar should be overridden to dispatch `Action.ViewUser`
    viewUserOnClick?: boolean;
    pushUserOnClick?: boolean;
    title?: string;
    style?: any;
    forceHistorical?: boolean; // true to deny `useOnlyCurrentProfiles` usage. Default false.
    hideTitle?: boolean;
}

export default function MemberAvatar({
    width,
    height,
    resizeMethod = 'crop',
    viewUserOnClick,
    ...props
}: IProps) {
    const card = useContext(CardContext);

    const member = useRoomMemberProfile({
        userId: props.member?.userId,
        member: props.member,
        forceHistorical: props.forceHistorical,
    });

    const [name, setName] = useState<string>();
    const [imageUrl, setImageUrl] = useState<string>();
    const [title, setTitle] = useState<string>();

    useEffect(() => {
        setName(member?.name ?? props.fallbackUserId);
    }, [member?.name, props.fallbackUserId]);

    useEffect(() => {
        if (member?.name) {
            if (member.getMxcAvatarUrl()) {
                setImageUrl(mediaFromMxc(member.getMxcAvatarUrl()!).getThumbnailOfSourceHttp(
                    width,
                    height,
                    resizeMethod,
                ));
            }
        }
    }, [height, member, resizeMethod, width]);

    useEffect(() => {
        let title: string | undefined = props.title;
        if (member?.name) {
            if (!title) {
                title = UserIdentifierCustomisations.getDisplayUserIdentifier!(
                    member?.userId ?? "", { roomId: member?.roomId ?? "" },
                ) ?? props.fallbackUserId;
            }
        }
        setTitle(title);
    }, [member?.name, member?.roomId, member?.userId, props.fallbackUserId, props.title]);

    return member ? (
        <BaseAvatar
            {...props}
            width={width}
            height={height}
            resizeMethod={resizeMethod}
            name={name ?? ""}
            title={props.hideTitle ? undefined : title}
            idName={member?.userId ?? props.fallbackUserId}
            url={imageUrl}
            onClick={viewUserOnClick ? () => {
                dis.dispatch({
                    action: Action.ViewUser,
                    member: props.member,
                    push: card.isCard,
                });
            } : props.onClick}
        />
    ) : null;
}
