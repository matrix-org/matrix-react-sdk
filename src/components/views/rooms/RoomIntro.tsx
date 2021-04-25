/*
Copyright 2020, 2021 The Matrix.org Foundation C.I.C.

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

import React, {useContext} from "react";
import {EventType} from "matrix-js-sdk/src/@types/event";

import MatrixClientContext from "../../../contexts/MatrixClientContext";
import RoomContext from "../../../contexts/RoomContext";
import DMRoomMap from "../../../utils/DMRoomMap";
import {_t} from "../../../languageHandler";
import MiniAvatarUploader, {AVATAR_SIZE} from "../elements/MiniAvatarUploader";
import RoomAvatar from "../avatars/RoomAvatar";
import defaultDispatcher from "../../../dispatcher/dispatcher";
import {ViewUserPayload} from "../../../dispatcher/payloads/ViewUserPayload";
import {Action} from "../../../dispatcher/actions";

const RoomIntro: React.FC<{}> = ({ children }) => {
    const cli = useContext(MatrixClientContext);
    const {room, roomId} = useContext(RoomContext);

    const dmPartner = DMRoomMap.shared().getUserIdForRoomId(roomId);
    let avatar;
    if (dmPartner) {
        const member = room?.getMember(dmPartner);
        avatar = <RoomAvatar room={room} width={AVATAR_SIZE} height={AVATAR_SIZE} onClick={() => {
            defaultDispatcher.dispatch<ViewUserPayload>({
                action: Action.ViewUser,
                // XXX: We should be using a real member object and not assuming what the receiver wants.
                member: member || {userId: dmPartner},
            });
        }} />;
    } else {
        const avatarUrl = room.currentState.getStateEvents(EventType.RoomAvatar, "")?.getContent()?.url;
        avatar = (
            <MiniAvatarUploader
                hasAvatar={!!avatarUrl}
                noAvatarLabel={_t("Add a photo, so people can easily spot your room.")}
                setAvatarUrl={url => cli.sendStateEvent(roomId, EventType.RoomAvatar, { url }, '')}
            >
                <RoomAvatar room={room} width={AVATAR_SIZE} height={AVATAR_SIZE} />
            </MiniAvatarUploader>
        );
    }

    return <div className="mx_RoomIntro">
        { avatar }
        <h2>{ room.name }</h2>
        { children }
    </div>;
};

export default RoomIntro;
