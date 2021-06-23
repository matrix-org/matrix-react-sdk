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

import React, { useContext } from "react";
import { EventType } from "matrix-js-sdk/src/@types/event";
import { MatrixClient } from "matrix-js-sdk/src/client";
import { Room } from "matrix-js-sdk/src/models/room";
import { User } from "matrix-js-sdk/src/models/user";

import MatrixClientContext from "../../../contexts/MatrixClientContext";
import RoomContext from "../../../contexts/RoomContext";
import DMRoomMap from "../../../utils/DMRoomMap";
import { _t } from "../../../languageHandler";
import AccessibleButton from "../elements/AccessibleButton";
import MiniAvatarUploader, { AVATAR_SIZE } from "../elements/MiniAvatarUploader";
import RoomAvatar from "../avatars/RoomAvatar";
import defaultDispatcher from "../../../dispatcher/dispatcher";
import { ViewUserPayload } from "../../../dispatcher/payloads/ViewUserPayload";
import { Action } from "../../../dispatcher/actions";
import dis from "../../../dispatcher/dispatcher";
import SpaceStore from "../../../stores/SpaceStore";
import { showSpaceInvite } from "../../../utils/space";
import { privateShouldBeEncrypted } from "../../../createRoom";
import EventTileBubble from "../messages/EventTileBubble";
import { ROOM_SECURITY_TAB } from "../dialogs/RoomSettingsDialog";

function hasExpectedEncryptionSettings(matrixClient: MatrixClient, room: Room): boolean {
    const isEncrypted: boolean = matrixClient.isRoomEncrypted(room.roomId);
    const isPublic: boolean = room.getJoinRule() === "public";
    return isPublic || !privateShouldBeEncrypted() || isEncrypted;
}

const NewRoomIntro = () => {
    const cli = useContext(MatrixClientContext);
    const {room, roomId} = useContext(RoomContext);

    const dmPartner = DMRoomMap.shared().getUserIdForRoomId(roomId);
    let body;
    if (dmPartner) {
        let caption;
        if ((room.getJoinedMemberCount() + room.getInvitedMemberCount()) === 2) {
            caption = _t("Only the two of you are in this conversation, unless either of you invites anyone to join.");
        }

        const member = room?.getMember(dmPartner);
        const displayName = member?.rawDisplayName || dmPartner;
        body = <React.Fragment>
            <RoomAvatar room={room} width={AVATAR_SIZE} height={AVATAR_SIZE} onClick={() => {
                defaultDispatcher.dispatch<ViewUserPayload>({
                    action: Action.ViewUser,
                    // XXX: We should be using a real member object and not assuming what the receiver wants.
                    member: member || { userId: dmPartner } as User,
                });
            }} />

            <h2>{ room.name }</h2>

            <p>{_t("This is the beginning of your direct message history with <displayName/>.", {}, {
                displayName: () => <b>{ displayName }</b>,
            })}</p>
            { caption && <p>{ caption }</p> }
        </React.Fragment>;
    } else {
        const inRoom = room && room.getMyMembership() === "join";
        const topic = room.currentState.getStateEvents(EventType.RoomTopic, "")?.getContent()?.topic;
        const canAddTopic = inRoom && room.currentState.maySendStateEvent(EventType.RoomTopic, cli.getUserId());

        const onTopicClick = () => {
            dis.dispatch({
                action: "open_room_settings",
                room_id: roomId,
            }, true);
            // focus the topic field to help the user find it as it'll gain an outline
            setImmediate(() => {
                window.document.getElementById("profileTopic").focus();
            });
        };

        let topicText;
        if (canAddTopic && topic) {
            topicText = _t("Topic: %(topic)s (<a>edit</a>)", { topic }, {
                a: sub => <AccessibleButton kind="link" onClick={onTopicClick}>{ sub }</AccessibleButton>,
            });
        } else if (topic) {
            topicText = _t("Topic: %(topic)s ", { topic });
        } else if (canAddTopic) {
            topicText = _t("<a>Add a topic</a> to help people know what it is about.", {}, {
                a: sub => <AccessibleButton kind="link" onClick={onTopicClick}>{ sub }</AccessibleButton>,
            });
        }

        const creator = room.currentState.getStateEvents(EventType.RoomCreate, "")?.getSender();
        const creatorName = room?.getMember(creator)?.rawDisplayName || creator;

        let createdText;
        if (creator === cli.getUserId()) {
            createdText = _t("You created this room.");
        } else {
            createdText = _t("%(displayName)s created this room.", {
                displayName: creatorName,
            });
        }

        let parentSpace;
        if (
            SpaceStore.instance.activeSpace?.canInvite(cli.getUserId()) &&
            SpaceStore.instance.getSpaceFilteredRoomIds(SpaceStore.instance.activeSpace).has(room.roomId)
        ) {
            parentSpace = SpaceStore.instance.activeSpace;
        }

        let buttons;
        if (parentSpace) {
            buttons = <div className="mx_NewRoomIntro_buttons">
                <AccessibleButton
                    className="mx_NewRoomIntro_inviteButton"
                    kind="primary"
                    onClick={() => {
                        showSpaceInvite(parentSpace);
                    }}
                >
                    {_t("Invite to %(spaceName)s", { spaceName: parentSpace.name })}
                </AccessibleButton>
                { room.canInvite(cli.getUserId()) && <AccessibleButton
                    className="mx_NewRoomIntro_inviteButton"
                    kind="primary_outline"
                    onClick={() => {
                        dis.dispatch({ action: "view_invite", roomId });
                    }}
                >
                    {_t("Invite to just this room")}
                </AccessibleButton> }
            </div>;
        } else if (room.canInvite(cli.getUserId())) {
            buttons = <div className="mx_NewRoomIntro_buttons">
                <AccessibleButton
                    className="mx_NewRoomIntro_inviteButton"
                    kind="primary"
                    onClick={() => {
                        dis.dispatch({ action: "view_invite", roomId });
                    }}
                >
                    {_t("Invite to this room")}
                </AccessibleButton>
            </div>;
        }

        const avatarUrl = room.currentState.getStateEvents(EventType.RoomAvatar, "")?.getContent()?.url;
        body = <React.Fragment>
            <MiniAvatarUploader
                hasAvatar={!!avatarUrl}
                noAvatarLabel={_t("Add a photo, so people can easily spot your room.")}
                setAvatarUrl={url => cli.sendStateEvent(roomId, EventType.RoomAvatar, { url }, '')}
            >
                <RoomAvatar room={room} width={AVATAR_SIZE} height={AVATAR_SIZE} />
            </MiniAvatarUploader>

            <h2>{ room.name }</h2>

            <p>{createdText} {_t("This is the start of <roomName/>.", {}, {
                roomName: () => <b>{ room.name }</b>,
            })}</p>
            <p>{topicText}</p>
            { buttons }
        </React.Fragment>;
    }

    function openRoomSettings(event) {
        event.preventDefault();
        dis.dispatch({
            action: "open_room_settings",
            initial_tab_id: ROOM_SECURITY_TAB,
        });
    }

    const sub2 = _t(
        "Your private messages are normally encrypted, but this room isn't. "+
        "Usually this is due to an unsupported device or method being used, " +
        "like email invites. <a>Enable encryption in settings.</a>", {},
        { a: sub => <a onClick={openRoomSettings} href="#">{sub}</a> },
    );

    return <div className="mx_NewRoomIntro">

        { !hasExpectedEncryptionSettings(cli, room) && (
            <EventTileBubble
                className="mx_cryptoEvent mx_cryptoEvent_icon_warning"
                title={_t("End-to-end encryption isn't enabled")}
                subtitle={sub2}
            />
        )}

        { body }
    </div>;
};

export default NewRoomIntro;
