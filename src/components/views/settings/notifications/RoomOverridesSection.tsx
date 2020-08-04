/*
Copyright 2020 The Matrix.org Foundation C.I.C.

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

import React, {useContext, useRef, useState} from "react";
import {MatrixClient} from "matrix-js-sdk/src/client";

import SettingsSection from "../SettingsSection";
import {_t} from "../../../../languageHandler";
import {NotificationSetting, roundRoomNotificationSetting} from "../../../../notifications/types";
import AccessibleButton from "../../elements/AccessibleButton";
import QuestionDialog from "../../dialogs/QuestionDialog";
import Modal from "../../../../Modal";
import MatrixClientContext from "../../../../contexts/MatrixClientContext";
import RoomAvatar from "../../avatars/RoomAvatar";
import {
    getEventRoomOverrideChanged,
    NotificationSettingStore,
} from "../../../../stores/notifications/NotificationSettingStore";
import {useEventEmitter} from "../../../../hooks/useEventEmitter";
import RoomNotificationsMenu from "../../context_menus/RoomNotificationsMenu";

interface IProps {
    notifyMeWith: NotificationSetting;
    playSoundFor: NotificationSetting;
}

interface IRoomOverrideProps {
    notifyMeWith: NotificationSetting;
    playSoundFor: NotificationSetting;
    roomId: string;
}

const RoomOverride: React.FC<IRoomOverrideProps> = ({notifyMeWith, playSoundFor, roomId}) => {
    const cli = useContext<MatrixClient>(MatrixClientContext);
    const room = cli.getRoom(roomId);
    const store = NotificationSettingStore.instance;

    const [[notifyLevelOverride, soundLevelOverride], setOverrides] = useState([
        store.getRoomNotifyOverride(roomId),
        store.getRoomSoundOverride(roomId),
    ]);
    useEventEmitter(store, getEventRoomOverrideChanged(roomId), setOverrides);

    const roundedNotifyMeWith = roundRoomNotificationSetting(roomId, notifyMeWith);
    const roundedPlaySoundFor = roundRoomNotificationSetting(roomId, playSoundFor);

    const notifyLevel = notifyLevelOverride || roundedNotifyMeWith;
    const soundLevel = soundLevelOverride || roundedPlaySoundFor;

    // TODO add reset button
    return <tr className="mx_NotificationsTab_RoomOverrideTile">
        <td>
            <RoomAvatar room={room} width={32} height={32} aria-hidden="true" />
            <span>{room.name || roomId}</span>
        </td>

        <td>
            <RoomNotificationsMenu
                value={notifyLevel}
                defaultValue={roundedNotifyMeWith}
                onChange={foo => console.log("DEBUG foo", foo)} // TODO
                // label={}
            />
        </td>

        <td>
            <RoomNotificationsMenu
                options={[
                    NotificationSetting.Never,
                ]}
                value={soundLevel}
                defaultValue={roundedPlaySoundFor}
                onChange={foo => console.log("DEBUG foo", foo)} // TODO
                // label={}
            />
        </td>
    </tr>;
};

const onResetAllRoomsClick = () => {
    Modal.createTrackedDialog('Notifications', 'Reset all room overrides dialog', QuestionDialog, {
        title: _t("Resetting all rooms"),
        description: _t("Are you sure you want to reset all rooms?"),
        button: _t("Yes"),
        cancelButton: _t("No"),
        onFinished: (yes: boolean) => {
            if (yes) {
                // TODO
            }
        },
    });
};

const RoomOverridesSection: React.FC<IProps> = ({notifyMeWith, playSoundFor}) => {
    const store = NotificationSettingStore.instance;
    // TODO define whether the room reset function removes that room from the UI
    // const [rooms, setRooms] = useState(store.getOverridenRooms());
    // useEventEmitter(store, EVENT_ROOM_OVERRIDE_CHANGED, () => {
    //     setRooms(store.getOverridenRooms());
    // });

    // only fetch the list of overriden rooms once so it doesn't change after user clears overrides
    const rooms = useRef(store.getOverridenRooms()).current;

    // skip section if there are no room overrides
    if (rooms.length < 1) return null;

    let description;
    if (notifyMeWith === NotificationSetting.Never) {
        description = <div className="mx_SettingsTab_errorText">
            {_t("Account notifications are set to “Never” and changes below will not apply.")}
        </div>;
    } else {
        description = <div className="mx_SettingsTab_subsectionText">
            {_t("Rooms listed below use custom notification settings")}
        </div>;
    }

    return <SettingsSection title={_t("Room notifications")}>
        {description}

        <table>
            <thead>
                <tr>
                    <th>{_t("Room")}</th>
                    <th>{_t("Notifications")}</th>
                    <th>{_t("Sound")}</th>
                </tr>
            </thead>
            <tbody>
                {rooms.map(roomId => (
                    <RoomOverride key={roomId} notifyMeWith={notifyMeWith} playSoundFor={playSoundFor} roomId={roomId} />
                ))}
            </tbody>
        </table>

        <AccessibleButton kind="link" onClick={onResetAllRoomsClick}>
            {_t("Reset all rooms")}
        </AccessibleButton>
    </SettingsSection>;
};

export default RoomOverridesSection;
