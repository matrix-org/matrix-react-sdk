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

import React, { FC, useState, useMemo, useRef, useEffect } from "react";
import classNames from "classnames";
import { logger } from "matrix-js-sdk/src/logger";
import { Room } from "matrix-js-sdk/src/models/room";

import { _t } from "../../../languageHandler";
import MediaDeviceHandler, { MediaDeviceKindEnum, MediaDeviceHandlerEvent } from "../../../MediaDeviceHandler";
import { useAsyncMemo } from "../../../hooks/useAsyncMemo";
import { useEventEmitter } from "../../../hooks/useEventEmitter";
import { useConnectedMembers } from "../../../utils/VideoChannelUtils";
import VideoChannelStore from "../../../stores/VideoChannelStore";
import { aboveLeftOf, ContextMenuButton, useContextMenu } from "../../structures/ContextMenu";
import DeviceContextMenu from "../context_menus/DeviceContextMenu";
import { Alignment } from "../elements/Tooltip";
import AccessibleButton from "../elements/AccessibleButton";
import AccessibleTooltipButton from "../elements/AccessibleTooltipButton";
import FacePile from "../elements/FacePile";
import MemberAvatar from "../avatars/MemberAvatar";

enum DeviceButtonKind {
    Audio,
    Video,
}

interface IDeviceButtonProps {
    kind: DeviceButtonKind;
    devices: MediaDeviceInfo[];
    active: boolean;
    disabled: boolean;
    toggle: () => void;
}

const DeviceButton: FC<IDeviceButtonProps> = ({ kind, devices, active, disabled, toggle }) => {
    // Depending on permissions, the browser might not let us know device labels,
    // in which case the context menu won't display anything helpful
    const labelledDevices = useMemo(() => devices.filter(d => d.label), [devices]);

    const [menuDisplayed, buttonRef, openMenu, closeMenu] = useContextMenu();

    if (!devices.length) return null;

    let className: string;
    let title: string;
    let listTitle: string;
    let deviceKinds: MediaDeviceKindEnum[];
    if (kind === DeviceButtonKind.Audio) {
        className = "mx_VideoLobby_deviceButton_audio";
        title = active ? _t("Mute microphone") : _t("Unmute microphone");
        listTitle = _t("Audio devices");
        deviceKinds = [MediaDeviceKindEnum.AudioInput, MediaDeviceKindEnum.AudioOutput];
    } else {
        className = "mx_VideoLobby_deviceButton_video";
        title = active ? _t("Turn off camera") : _t("Turn on camera");
        listTitle = _t("Video devices");
        deviceKinds = [MediaDeviceKindEnum.VideoInput];
    }

    return <div
        className={classNames({
            "mx_VideoLobby_deviceButtonWrapper": true,
            "mx_VideoLobby_deviceButtonWrapper_active": active,
        })}
    >
        <AccessibleTooltipButton
            className={`mx_VideoLobby_deviceButton ${className}`}
            title={title}
            alignment={Alignment.Top}
            onClick={toggle}
            disabled={disabled}
        />
        { labelledDevices.length > 1 && <ContextMenuButton
            className="mx_VideoLobby_deviceListButton"
            inputRef={buttonRef}
            onClick={openMenu}
            isExpanded={menuDisplayed}
            label={listTitle}
            disabled={disabled}
        /> }
        { menuDisplayed && <DeviceContextMenu
            deviceKinds={deviceKinds}
            {...aboveLeftOf(buttonRef.current.getBoundingClientRect())}
            onFinished={closeMenu}
        /> }
    </div>;
};

const MAX_FACES = 8;

const VideoLobby: FC<{ room: Room }> = ({ room }) => {
    const store = VideoChannelStore.instance;
    const videoRef = useRef<HTMLVideoElement>();
    const [connecting, setConnecting] = useState(false);
    const me = useMemo(() => room.getMember(room.myUserId), [room]);
    const connectedMembers = useConnectedMembers(room, false);

    const {
        [MediaDeviceKindEnum.AudioOutput]: audioOutputs,
        [MediaDeviceKindEnum.AudioInput]: audioInputs,
        [MediaDeviceKindEnum.VideoInput]: videoInputs,
    } = useAsyncMemo(() => MediaDeviceHandler.getDevices(), []) ?? {
        [MediaDeviceKindEnum.AudioOutput]: [],
        [MediaDeviceKindEnum.AudioInput]: [],
        [MediaDeviceKindEnum.VideoInput]: [],
    };

    const [videoInputId, setVideoInputId] = useState(MediaDeviceHandler.getVideoInput());
    useEventEmitter(MediaDeviceHandler.instance, MediaDeviceHandlerEvent.VideoInputChanged, setVideoInputId);
    const videoInput = videoInputs.find(d => d.deviceId === videoInputId) ?? videoInputs[0];

    const [audioActive, setAudioActive] = useState(!store.audioMuted);
    const [videoActive, setVideoActive] = useState(!store.videoMuted);
    const toggleAudio = () => {
        store.audioMuted = audioActive;
        setAudioActive(!audioActive);
    };
    const toggleVideo = () => {
        store.videoMuted = videoActive;
        setVideoActive(!videoActive);
    };

    const videoStream = useAsyncMemo(async () => {
        if (videoInput && videoActive) {
            try {
                return await navigator.mediaDevices.getUserMedia({
                    video: { deviceId: videoInput.deviceId },
                });
            } catch (e) {
                logger.error(`Failed to get stream for device ${videoInput.deviceId}: ${e}`);
            }
        }
        return null;
    }, [videoInput, videoActive]);

    useEffect(() => {
        if (videoStream) {
            const videoElement = videoRef.current;
            videoElement.srcObject = videoStream;
            videoElement.play();

            return () => {
                videoStream?.getTracks().forEach(track => track.stop());
                videoElement.srcObject = null;
            };
        }
    }, [videoStream]);

    const connect = async () => {
        setConnecting(true);

        const audioOutputId = MediaDeviceHandler.getAudioOutput();
        const audioOutput = audioOutputs.find(d => d.deviceId === audioOutputId) ?? audioOutputs[0];
        const audioInputId = MediaDeviceHandler.getAudioInput();
        const audioInput = audioActive
            ? audioInputs.find(d => d.deviceId === audioInputId) ?? audioInputs[0]
            : null;

        try {
            await store.connect(room.roomId, audioOutput, audioInput, videoActive ? videoInput : null);
        } catch (e) {
            logger.error(e);
            setConnecting(false);
        }
    };

    let facePile: JSX.Element;
    if (connectedMembers.size) {
        const shownMembers = [...connectedMembers].slice(0, MAX_FACES);
        const overflow = connectedMembers.size > shownMembers.length;

        facePile = <div className="mx_VideoLobby_connectedMembers">
            { _t("%(count)s people connected", { count: connectedMembers.size }) }
            <FacePile members={shownMembers} faceSize={24} overflow={overflow} />
        </div>;
    }

    return <div className="mx_VideoLobby">
        { facePile }
        <div className="mx_VideoLobby_preview">
            <MemberAvatar key={me.userId} member={me} width={200} height={200} resizeMethod="scale" />
            <video
                ref={videoRef}
                style={{ visibility: videoActive ? null : "hidden" }}
                muted
                playsInline
                disablePictureInPicture
            />
            <div className="mx_VideoLobby_controls">
                <DeviceButton
                    kind={DeviceButtonKind.Audio}
                    devices={[...audioOutputs, ...audioInputs]}
                    active={audioActive}
                    disabled={connecting}
                    toggle={toggleAudio}
                />
                <DeviceButton
                    kind={DeviceButtonKind.Video}
                    devices={videoInputs}
                    active={videoActive}
                    disabled={connecting}
                    toggle={toggleVideo}
                />
            </div>
        </div>
        <AccessibleButton
            className="mx_VideoLobby_joinButton"
            kind="primary"
            disabled={connecting}
            onClick={connect}
        >
            { _t("Connect now") }
        </AccessibleButton>
    </div>;
};

export default VideoLobby;
