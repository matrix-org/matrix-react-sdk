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

import React, { useState } from "react";
import { Room } from "matrix-js-sdk/src/models/room";
import { MatrixClient } from "matrix-js-sdk/src/client";
import { EventType } from "matrix-js-sdk/src/@types/event";
import { logger } from "matrix-js-sdk/src/logger";

import { _t } from "../../../languageHandler";
import AccessibleButton from "../elements/AccessibleButton";
import SpaceBasicSettings from "./SpaceBasicSettings";
import { avatarUrlForRoom } from "../../../Avatar";
import { IDialogProps } from "../dialogs/IDialogProps";
import { htmlSerializeFromMdIfNeeded } from "../../../editor/serialize";
import { leaveSpace } from "../../../utils/leave-behaviour";
import { getTopic } from "../../../hooks/room/useTopic";

interface IProps extends IDialogProps {
    matrixClient: MatrixClient;
    space: Room;
}

const SpaceSettingsGeneralTab = ({ matrixClient: cli, space, onFinished }: IProps) => {
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState("");

    const userId = cli.getUserId();

    const [newAvatar, setNewAvatar] = useState<File>(null); // undefined means to remove avatar
    const canSetAvatar = space.currentState.maySendStateEvent(EventType.RoomAvatar, userId);
    const avatarChanged = newAvatar !== null;

    const [name, setName] = useState<string>(space.name);
    const canSetName = space.currentState.maySendStateEvent(EventType.RoomName, userId);
    const nameChanged = name !== space.name;

    const currentTopic = getTopic(space)?.text;
    const [topic, setTopic] = useState<string>(currentTopic);
    const canSetTopic = space.currentState.maySendStateEvent(EventType.RoomTopic, userId);
    const topicChanged = topic !== currentTopic;

    const onCancel = () => {
        setNewAvatar(null);
        setName(space.name);
        setTopic(currentTopic);
    };

    const onSave = async () => {
        setBusy(true);
        const promises = [];

        if (avatarChanged) {
            if (newAvatar) {
                promises.push(cli.sendStateEvent(space.roomId, EventType.RoomAvatar, {
                    url: await cli.uploadContent(newAvatar),
                }, ""));
            } else {
                promises.push(cli.sendStateEvent(space.roomId, EventType.RoomAvatar, {}, ""));
            }
        }

        if (nameChanged) {
            promises.push(cli.setRoomName(space.roomId, name));
        }

        if (topicChanged) {
            const htmlTopic = htmlSerializeFromMdIfNeeded(topic, { forceHTML: false });
            promises.push(cli.setRoomTopic(space.roomId, topic, htmlTopic));
        }

        const results = await Promise.allSettled(promises);
        setBusy(false);
        const failures = results.filter(r => r.status === "rejected");
        if (failures.length > 0) {
            logger.error("Failed to save space settings: ", failures);
            setError(_t("Failed to save space settings."));
        }
    };

    return <div className="mx_SettingsTab">
        <div className="mx_SettingsTab_heading">{ _t("General") }</div>

        <div>{ _t("Edit settings relating to your space.") }</div>

        { error && <div className="mx_SpaceRoomView_errorText">{ error }</div> }

        <div className="mx_SettingsTab_section">
            <SpaceBasicSettings
                avatarUrl={avatarUrlForRoom(space, 80, 80, "crop")}
                avatarDisabled={busy || !canSetAvatar}
                setAvatar={setNewAvatar}
                name={name}
                nameDisabled={busy || !canSetName}
                setName={setName}
                topic={topic}
                topicDisabled={busy || !canSetTopic}
                setTopic={setTopic}
            />

            <AccessibleButton
                onClick={onCancel}
                disabled={busy || !(avatarChanged || nameChanged || topicChanged)}
                kind="link"
            >
                { _t("Cancel") }
            </AccessibleButton>
            <AccessibleButton onClick={onSave} disabled={busy} kind="primary">
                { busy ? _t("Saving...") : _t("Save Changes") }
            </AccessibleButton>
        </div>

        <span className="mx_SettingsTab_subheading">{ _t("Leave Space") }</span>
        <div className="mx_SettingsTab_section mx_SettingsTab_subsectionText">
            <AccessibleButton
                kind="danger"
                onClick={() => {
                    leaveSpace(space);
                }}
            >
                { _t("Leave Space") }
            </AccessibleButton>
        </div>
    </div>;
};

export default SpaceSettingsGeneralTab;
