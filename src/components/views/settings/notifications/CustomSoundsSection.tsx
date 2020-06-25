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

import React, {useState, useRef, useEffect, ChangeEvent} from "react";

import {_t} from "../../../../languageHandler";
import AccessibleButton from "../../elements/AccessibleButton";
import SettingsSection from "../SettingsSection";
import SettingsStore, {SettingLevel} from "../../../../settings/SettingsStore";
import Notifier from "../../../../Notifier";
import {MatrixClientPeg} from "../../../../MatrixClientPeg";
import Spinner from "../../elements/Spinner";

interface IProps {
    roomId: string;
}

interface ICustomSound {
    name: string;
    type: string;
    size: number;
    url: string; // mxc
}

interface ICustomSoundTileProps {
    sound: ICustomSound;
    onRemove(): void;
}

const CUSTOM_NOTIFICATION_SOUND_KEY = "notificationSound";

const CustomSoundTile: React.FC<ICustomSoundTileProps> = ({sound, onRemove}) => {
    const audioRef = useRef<HTMLAudioElement>(null);
    const [isPlaying, setIsPlaying] = useState(false);

    let buttonOnClick;
    let buttonClassName;
    if (isPlaying) {
        buttonOnClick = () => {
            audioRef.current.pause();
            audioRef.current.currentTime = 0;
            setIsPlaying(false);
        };
        buttonClassName = "mx_NotificationsTab_CustomSoundTile_stop";
    } else {
        buttonOnClick = () => {
            audioRef.current.play();
            setIsPlaying(true);
        };
        buttonClassName = "mx_NotificationsTab_CustomSoundTile_play";
    }

    const onEnded = () => {
        setIsPlaying(false);
    };

    return <div className="mx_NotificationsTab_CustomSoundTile">
        <AccessibleButton className={buttonClassName} onClick={buttonOnClick} />
        <span>{sound.name}</span>
        <AccessibleButton className="mx_NotificationsTab_CustomSoundTile_remove" onClick={onRemove} />
        <audio ref={audioRef} src={sound.url} preload="auto" onEnded={onEnded} />
    </div>;
};

const CustomSoundSection: React.FC<IProps> = ({roomId}) => {
    const [busy, setBusy] = useState(false);
    const soundUploadRef = useRef<HTMLInputElement>(null);
    const [customSound, setCustomSound] = useState<ICustomSound>(Notifier.getSoundForRoom(roomId));
    useEffect(() => {
        setCustomSound(Notifier.getSoundForRoom(roomId));
    }, [roomId]);

    const onSoundUploadChange = async (e: ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files[0];

        let type = file.type;
        if (type === "video/ogg") {
            // XXX: I've observed browsers allowing users to pick a audio/ogg files, and then calling it a video/ogg.
            // This is a lame hack, but man browsers suck at detecting mimetypes.
            type = "audio/ogg";
        }

        setBusy(true);
        const url = await MatrixClientPeg.get().uploadContent(file, {type});
        setBusy(false);

        const sound = {
            name: file.name,
            type: type,
            size: file.size,
            url,
        };
        // local echo as we cannot ask Notifier until the remote echo of the room account data update comes down sync
        setCustomSound({...sound, url: MatrixClientPeg.get().mxcUrlToHttp(sound.url)});
        SettingsStore.setValue(CUSTOM_NOTIFICATION_SOUND_KEY, roomId, SettingLevel.ROOM_ACCOUNT, sound);
    };

    let customSoundSection;
    if (busy) {
        customSoundSection = <Spinner />;
    } else if (customSound) {
        const clearSound = () => {
            SettingsStore.setValue(CUSTOM_NOTIFICATION_SOUND_KEY, roomId, SettingLevel.ROOM_ACCOUNT, null);
            setCustomSound(null);
        };
        customSoundSection = <CustomSoundTile sound={customSound} onRemove={clearSound} />;
    } else {
        const onClick = () => {
            soundUploadRef.current.click();
        };
        customSoundSection = <AccessibleButton kind="link" onClick={onClick}>
            {_t("Upload a custom sound")}
        </AccessibleButton>;
    }

    return <SettingsSection title={_t("Custom sounds")}>
        {customSoundSection}
        <form autoComplete="off" noValidate={true}>
            <input
                ref={soundUploadRef}
                onChange={onSoundUploadChange}
                className="mx_NotificationSound_soundUpload"
                type="file"
                accept="audio/*"
            />
        </form>
    </SettingsSection>;
};

export default CustomSoundSection;
