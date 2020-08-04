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

import React, {useState, useRef, useEffect, ChangeEvent, useContext} from "react";
import {MatrixClient} from "matrix-js-sdk/src/client";

import {_t} from "../../../../languageHandler";
import AccessibleButton from "../../elements/AccessibleButton";
import SettingsSection from "../SettingsSection";
import SettingsStore from "../../../../settings/SettingsStore";
import {SettingLevel} from "../../../../settings/SettingLevel";
import Notifier from "../../../../Notifier";
import {MatrixClientPeg} from "../../../../MatrixClientPeg";
import MatrixClientContext from "../../../../contexts/MatrixClientContext";
import ProgressBar from "../../elements/ProgressBar";

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

    let button;
    if (isPlaying) {
        const onClick = () => {
            audioRef.current.pause();
            audioRef.current.currentTime = 0;
            setIsPlaying(false);
        };
        const time = audioRef.current.duration;
        button = <AccessibleButton className="mx_NotificationsTab_CustomSoundTile_stop" onClick={onClick}>
            <svg height="20" width="20">
                <circle
                    cx="-10"
                    cy="10"
                    r="9"
                    stroke="#000000"
                    strokeWidth="1.5"
                    fillOpacity="0"
                    style={{animationDuration: `${time}s`}}
                    transform="rotate(270)"
                />
            </svg>
            <img
                width="16"
                height="16"
                src={require("../../../../../res/img/btn-stop.svg")}
                alt={_t("Stop")} />
        </AccessibleButton>;
    } else {
        const onClick = () => {
            audioRef.current.play();
            setIsPlaying(true);
        };
        button = <AccessibleButton
            onClick={onClick}
            element="img"
            width="16"
            height="16"
            src={require("../../../../../res/img/btn-play.svg")}
            alt={_t("Play")}
        />;
    }

    const onEnded = () => {
        setIsPlaying(false);
    };

    return <div className="mx_NotificationsTab_CustomSoundTile">
        {button}
        <span>{sound.name}</span>
        <AccessibleButton
            className="mx_NotificationsTab_CustomSoundTile_remove"
            onClick={onRemove}
            element="img"
            width="16"
            height="16"
            src={require("../../../../../res/img/btn-x.svg")}
            alt={_t("Remove")}
        />
        <audio ref={audioRef} src={sound.url} preload="auto" onEnded={onEnded} />
    </div>;
};

interface IProgess {
    total: number;
    loaded: number;
}

const CustomSoundSection: React.FC<IProps> = ({roomId}) => {
    const cli = useContext<MatrixClient>(MatrixClientContext);
    const soundUploadRef = useRef<HTMLInputElement>(null);

    const [progress, setProgress] = useState<IProgess>(null);
    const [customSound, setCustomSound] = useState<ICustomSound>(Notifier.getSoundForRoom(roomId));

    useEffect(() => {
        setCustomSound(Notifier.getSoundForRoom(roomId));
    }, [roomId]);

    const onSoundUploadChange = async (e: ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files[0];
        if (!file) return;

        let type = file.type;
        if (type === "video/ogg") {
            // XXX: I've observed browsers allowing users to pick a audio/ogg files, and then calling it a video/ogg.
            // This is a lame hack, but man browsers suck at detecting mimetypes.
            type = "audio/ogg";
        }

        setProgress({
            total: file.size,
            loaded: 0,
        });
        const url = await cli.uploadContent(file, {
            type,
            progressHandler: setProgress,
        });
        setProgress(null);

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
    if (progress) {
        customSoundSection = <div className="mx_NotificationsTab_CustomSoundUpload">
            {_t("Uploading...")}
            <ProgressBar value={progress.loaded} max={progress.total} />
        </div>;
    } else if (customSound) {
        const clearSound = () => {
            soundUploadRef.current.value = ""; // clear the upload input so user can re-upload same file if they wish
            SettingsStore.setValue(CUSTOM_NOTIFICATION_SOUND_KEY, roomId, SettingLevel.ROOM_ACCOUNT, null);
            setCustomSound(null);
        };
        customSoundSection = <CustomSoundTile sound={customSound} onRemove={clearSound} />;
    } else {
        const onClick = () => {
            soundUploadRef.current.click();
        };
        customSoundSection = (
            <AccessibleButton kind="link" onClick={onClick} className="mx_NotificationsTab_CustomSoundUpload">
                {_t("Upload a custom sound")}
            </AccessibleButton>
        );
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
