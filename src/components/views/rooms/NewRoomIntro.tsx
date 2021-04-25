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

import RoomIntro from "./RoomIntro";
import MatrixClientContext from "../../../contexts/MatrixClientContext";
import RoomContext from "../../../contexts/RoomContext";
import DMRoomMap from "../../../utils/DMRoomMap";
import {_t} from "../../../languageHandler";
import AccessibleButton from "../elements/AccessibleButton";
import dis from "../../../dispatcher/dispatcher";
import SpaceStore from "../../../stores/SpaceStore";
import {showSpaceInvite} from "../../../utils/space";

const NewRoomIntro = () => {
    const cli = useContext(MatrixClientContext);
    const {room, roomId} = useContext(RoomContext);

    const dmPartner = DMRoomMap.shared().getUserIdForRoomId(roomId);
    if (dmPartner) {
        let caption;
        if ((room.getJoinedMemberCount() + room.getInvitedMemberCount()) === 2) {
            caption = _t("Only the two of you are in this conversation, unless either of you invites anyone to join.");
        }

        const member = room?.getMember(dmPartner);
        const displayName = member?.rawDisplayName || dmPartner;
        return <RoomIntro>
            <p>{_t("This is the beginning of your direct message history with <displayName/>.", {}, {
                displayName: () => <b>{ displayName }</b>,
            })}</p>
            { caption && <p>{ caption }</p> }
        </RoomIntro>;
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

        return <RoomIntro>
            <p>{createdText} {_t("This is the start of <roomName/>.", {}, {
                roomName: () => <b>{ room.name }</b>,
            })}</p>
            { topicText && <p>{topicText}</p> }
            { buttons }
        </RoomIntro>;
    }
};

export default NewRoomIntro;
