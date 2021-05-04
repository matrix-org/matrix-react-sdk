/*
Copyright 2021 The Matrix.org Foundation C.I.C.

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
import {EventTimeline} from "matrix-js-sdk/src/models/event-timeline";

import RoomIntro from "./RoomIntro";
import RoomContext from "../../../contexts/RoomContext";
import DMRoomMap from "../../../utils/DMRoomMap";
import {_t} from "../../../languageHandler";

const RoomHistoryIntro = () => {
    const {room, roomId} = useContext(RoomContext);

    const oldState = room.getLiveTimeline().getState(EventTimeline.BACKWARDS);
    const encryptionState = oldState.getStateEvents("m.room.encryption")[0];
    let historyState = oldState.getStateEvents("m.room.history_visibility")[0];
    historyState = historyState && historyState.getContent().history_visibility;

    let caption;
    const dmPartner = DMRoomMap.shared().getUserIdForRoomId(roomId);
    if (dmPartner) {
        const member = room?.getMember(dmPartner);
        const displayName = member?.rawDisplayName || dmPartner;

        if (historyState == "invited") {
            caption = _t("This is the beginning of your visible history with <displayName/>, "
                         + "as the room's admins have restricted your ability to view messages "
                         + "from before you were invited.", {}, {
                displayName: () => <b>{ displayName }</b>,
            });
        } else if (historyState == "joined") {
            caption = _t("This is the beginning of your visible history with <displayName/>, "
                         + "as the room's admins have restricted your ability to view messages "
                         + "from before you joined.", {}, {
                displayName: () => <b>{ displayName }</b>,
            });
        } else if (encryptionState) {
            caption = _t("This is the beginning of your visible history with <displayName/>, "
                         + "as encrypted messages before this point are unavailable.", {}, {
                displayName: () => <b>{ displayName }</b>,
            });
        } else {
            caption = _t("This is the beginning of your visible history with <displayName/>.", {}, {
                displayName: () => <b>{ displayName }</b>,
            });
        }
    } else {
        if (historyState == "invited") {
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
        } else if (encryptionState) {
            caption = _t("This is the beginning of your visible history in <roomName/>, "
                         + "as encrypted messages before this point are unavailable.", {}, {
                roomName: () => <b>{ room.name }</b>,
            });
        } else {
            caption = _t("This is the beginning of your visible history in <roomName/>.", {}, {
                roomName: () => <b>{ room.name }</b>,
            });
        }
    }

    return <RoomIntro>
        <p>{ caption }</p>
    </RoomIntro>;
};

export default RoomHistoryIntro;
