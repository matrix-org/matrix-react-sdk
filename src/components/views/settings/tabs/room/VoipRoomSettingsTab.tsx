/*
Copyright 2022 The Matrix.org Foundation C.I.C.

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

import React, { useCallback, useMemo, useState } from 'react';
import { logger } from "matrix-js-sdk/src/logger";
import { JoinRule } from "matrix-js-sdk/src/@types/partials";
import { EventType } from "matrix-js-sdk/src/@types/event";

import { _t } from "../../../../../languageHandler";
import { MatrixClientPeg } from "../../../../../MatrixClientPeg";
import LabelledToggleSwitch from "../../../elements/LabelledToggleSwitch";
import SettingsSubsection from "../../shared/SettingsSubsection";
import SettingsTab from "../SettingsTab";
import Modal from "../../../../../Modal";
import ErrorDialog from "../../../dialogs/ErrorDialog";
import { ElementCall } from "../../../../../models/Call";
import { useRoomState } from "../../../../../hooks/useRoomState";

interface ElementCallSwitchProps {
    roomId: string;
}

const ElementCallSwitch: React.FC<ElementCallSwitchProps> = ({ roomId }) => {
    const room = useMemo(() => MatrixClientPeg.get().getRoom(roomId), [roomId]);
    const isPublic = useMemo(() => room.getJoinRule() === JoinRule.Public, [room]);
    const [content, events] = useRoomState(room, useCallback((state) => {
        const content = state?.getStateEvents(EventType.RoomPowerLevels, "")?.getContent();
        return [content ?? {}, content?.["events"] ?? {}];
    }, []));

    const [elementCallEnabled, setElementCallEnabled] = useState<boolean>(() => {
        return events[ElementCall.MEMBER_EVENT_TYPE.name] === 0;
    });

    const onChange = useCallback((enabled: boolean): void => {
        setElementCallEnabled(enabled);

        if (enabled) {
            events[ElementCall.CALL_EVENT_TYPE.name] = isPublic ? 50 : 0;
            events[ElementCall.MEMBER_EVENT_TYPE.name] = 0;
        } else {
            events[ElementCall.CALL_EVENT_TYPE.name] = 100;
            events[ElementCall.MEMBER_EVENT_TYPE.name] = 100;
        }

        MatrixClientPeg.get().sendStateEvent(roomId, EventType.RoomPowerLevels, {
            "events": events,
            ...content,
        }).catch(e => {
            logger.error(e);

            Modal.createDialog(ErrorDialog, {
                title: _t("Error changing power level requirement"),
                description: _t(
                    "An error occurred changing the room's power level requirements. Ensure you have sufficient " +
                    "permissions and try again.",
                ),
            });
        });
    }, [roomId, content, events, isPublic]);

    return <LabelledToggleSwitch
        data-testid="element-call-switch"
        label={_t("Enable Element Call as an additional calling option in this room")}
        caption={_t(
            "Element Call is end-to-end encrypted, " +
            "but is currently limited to smaller numbers of users.",
        )}
        value={elementCallEnabled}
        onChange={onChange}
    />;
};

interface Props {
    roomId: string;
}

export const VoipRoomSettingsTab: React.FC<Props> = ({ roomId }) => {
    return <SettingsTab heading={_t("Voice & Video")}>
        <SettingsSubsection heading={_t("Call type")}>
            <ElementCallSwitch roomId={roomId} />
        </SettingsSubsection>
    </SettingsTab>;
};
