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
import {EventTimeline} from "matrix-js-sdk/src/models/event-timeline";

import RoomIntro from "./RoomIntro";
import MatrixClientContext from "../../../contexts/MatrixClientContext";
import RoomContext from "../../../contexts/RoomContext";
import DMRoomMap from "../../../utils/DMRoomMap";
import {_t} from "../../../languageHandler";
import AccessibleButton from "../elements/AccessibleButton";
import dis from "../../../dispatcher/dispatcher";

const RoomHistoryIntro = () => {
    const cli = useContext(MatrixClientContext);
    const {room, roomId} = useContext(RoomContext);

    const oldState = room.getLiveTimeline().getState(EventTimeline.BACKWARDS);
    const encryptionState = oldState.getStateEvents("m.room.encryption")[0];
    let historyState = oldState.getStateEvents("m.room.history_visibility")[0];
    historyState = historyState && historyState.getContent().history_visibility;

    const dmPartner = DMRoomMap.shared().getUserIdForRoomId(roomId);
    if (dmPartner) {
        const member = room?.getMember(dmPartner);
        const displayName = member?.rawDisplayName || dmPartner;

        let caption1;
        if (encryptionState) {
            caption1 = _t("This is the beginning of your visible history with <displayName/>, "
                          + "as encrypted messages before this point are unavailable.", {}, {
                displayName: () => <b>{ displayName }</b>,
            });
        } else if (historyState == "invited") {
            caption1 = _t("This is the beginning of your visible history with <displayName/>, "
                          + "as the room's admins have restricted your ability to view messages "
                          + "from before you were invited.", {}, {
                displayName: () => <b>{ displayName }</b>,
            });
        } else if (historyState == "joined") {
            caption1 = _t("This is the beginning of your visible history with <displayName/>, "
                          + "as the room's admins have restricted your ability to view messages "
                          + "from before you joined.", {}, {
                displayName: () => <b>{ displayName }</b>,
            });
        } else {
            caption1 = _t("This is the beginning of your visible history with <displayName/>.", {}, {
                displayName: () => <b>{ displayName }</b>,
            });
        }

        let caption2;
        if ((room.getJoinedMemberCount() + room.getInvitedMemberCount()) === 2) {
            caption2 = _t("Only the two of you are in this conversation, unless either of you invites anyone to join.");
        }

        return <RoomIntro>
            <p>{ caption1 }</p>
            { caption2 && <p>{ caption2 }</p> }
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

        let caption;
        if (encryptionState) {
            caption = _t("This is the beginning of your visible history in <roomName/>, "
                         + "as encrypted messages before this point are unavailable.", {}, {
                roomName: () => <b>{ room.name }</b>,
            });
        } else if (historyState == "invited") {
            caption = _t("This is the beginning of your visible history in <roomName/>, "
                         + "as the room's admins have restricted your ability to view messages "
                         + "from before you were invited.", {}, {
                roomName: () => <b>{ room.name }</b>,
            });
        } else if (historyState == "joined") {
            caption = _t("This is the beginning of your visible history in <roomName/>, "
                         + "as the room's admins have restricted your ability to view messages "
                         + "from before you joined.", {}, {
                roomName: () => <b>{ room.name }</b>,
            });
        } else {
            caption = _t("This is the beginning of your visible history in <roomName/>.", {}, {
                roomName: () => <b>{ room.name }</b>,
            });
        }

        return <RoomIntro>
            <p>{ caption }</p>
            { topicText && <p>{ topicText }</p> }
        </RoomIntro>;
    }
};

export default RoomHistoryIntro;
