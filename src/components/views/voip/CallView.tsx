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

import React, { FC, ReactNode, useState, useContext, useEffect, useMemo, useRef, useCallback } from "react";
import classNames from "classnames";
import { logger } from "matrix-js-sdk/src/logger";

import type { Room } from "matrix-js-sdk/src/matrix";
import { Call, ElementCall } from "../../../models/Call";
import { useCall } from "../../../hooks/useCall";
import MatrixClientContext from "../../../contexts/MatrixClientContext";
import AppTile from "../elements/AppTile";
import { _t } from "../../../languageHandler";
import { useAsyncMemo } from "../../../hooks/useAsyncMemo";
import MediaDeviceHandler, { IMediaDevices } from "../../../MediaDeviceHandler";
import { CallStore } from "../../../stores/CallStore";
import IconizedContextMenu, {
    IconizedContextMenuOption,
    IconizedContextMenuOptionList,
} from "../context_menus/IconizedContextMenu";
import { aboveRightOf, ContextMenuButton, useContextMenu } from "../../structures/ContextMenu";
import { Alignment } from "../elements/Tooltip";
import { ButtonEvent } from "../elements/AccessibleButton";
import AccessibleTooltipButton from "../elements/AccessibleTooltipButton";
import MemberAvatar from "../avatars/MemberAvatar";

interface DeviceButtonProps {
    kind: string;
    devices: MediaDeviceInfo[];
    setDevice: (device: MediaDeviceInfo) => void;
    deviceListLabel: string;
    muted: boolean;
    disabled: boolean;
    toggle: () => void;
    unmutedTitle: string;
    mutedTitle: string;
}

const DeviceButton: FC<DeviceButtonProps> = ({
    kind,
    devices,
    setDevice,
    deviceListLabel,
    muted,
    disabled,
    toggle,
    unmutedTitle,
    mutedTitle,
}) => {
    const [showMenu, buttonRef, openMenu, closeMenu] = useContextMenu();
    const selectDevice = useCallback(
        (device: MediaDeviceInfo) => {
            setDevice(device);
            closeMenu();
        },
        [setDevice, closeMenu],
    );

    let contextMenu: JSX.Element | null = null;
    if (showMenu) {
        const buttonRect = buttonRef.current!.getBoundingClientRect();
        contextMenu = (
            <IconizedContextMenu {...aboveRightOf(buttonRect, undefined, 10)} onFinished={closeMenu}>
                <IconizedContextMenuOptionList>
                    {devices.map((d) => (
                        <IconizedContextMenuOption key={d.deviceId} label={d.label} onClick={() => selectDevice(d)} />
                    ))}
                </IconizedContextMenuOptionList>
            </IconizedContextMenu>
        );
    }

    if (!devices.length) return null;

    return (
        <div
            className={classNames("mx_CallView_deviceButtonWrapper", {
                mx_CallView_deviceButtonWrapper_muted: muted,
            })}
        >
            <AccessibleTooltipButton
                className={`mx_CallView_deviceButton mx_CallView_deviceButton_${kind}`}
                inputRef={buttonRef}
                title={muted ? mutedTitle : unmutedTitle}
                alignment={Alignment.Top}
                onClick={toggle}
                disabled={disabled}
            />
            {devices.length > 1 ? (
                <ContextMenuButton
                    className="mx_CallView_deviceListButton"
                    onClick={openMenu}
                    isExpanded={showMenu}
                    label={deviceListLabel}
                    disabled={disabled}
                />
            ) : null}
            {contextMenu}
        </div>
    );
};

interface LobbyProps {
    room: Room;
    connect: () => Promise<void>;
    joinCallButtonDisabledTooltip?: string;
    children?: ReactNode;
}

export const Lobby: FC<LobbyProps> = ({ room, joinCallButtonDisabledTooltip, connect, children }) => {
    const [connecting, setConnecting] = useState(false);
    const me = useMemo(() => room.getMember(room.myUserId)!, [room]);
    const videoRef = useRef<HTMLVideoElement>(null);

    const [videoInputId, setVideoInputId] = useState<string>(() => MediaDeviceHandler.getVideoInput());

    const [audioMuted, setAudioMuted] = useState(() => MediaDeviceHandler.startWithAudioMuted);
    const [videoMuted, setVideoMuted] = useState(() => MediaDeviceHandler.startWithVideoMuted);

    const toggleAudio = useCallback(() => {
        MediaDeviceHandler.startWithAudioMuted = !audioMuted;
        setAudioMuted(!audioMuted);
    }, [audioMuted, setAudioMuted]);
    const toggleVideo = useCallback(() => {
        MediaDeviceHandler.startWithVideoMuted = !videoMuted;
        setVideoMuted(!videoMuted);
    }, [videoMuted, setVideoMuted]);

    // In case we can not fetch media devices we should mute the devices
    const handleMediaDeviceFailing = (message: string): void => {
        MediaDeviceHandler.startWithAudioMuted = true;
        MediaDeviceHandler.startWithVideoMuted = true;
        logger.warn(message);
    };

    const [videoStream, audioInputs, videoInputs] = useAsyncMemo(
        async (): Promise<[MediaStream | null, MediaDeviceInfo[], MediaDeviceInfo[]]> => {
            let devices: IMediaDevices | undefined;
            try {
                devices = await MediaDeviceHandler.getDevices();
                if (devices === undefined) {
                    handleMediaDeviceFailing("Could not access devices!");
                    return [null, [], []];
                }
            } catch (error) {
                handleMediaDeviceFailing(`Unable to get Media Devices: ${error}`);
                return [null, [], []];
            }

            // We get the preview stream before requesting devices: this is because
            // we need (in some browsers) an active media stream in order to get
            // non-blank labels for the devices.
            let stream: MediaStream | null = null;

            try {
                if (devices!.audioinput.length > 0) {
                    // Holding just an audio stream will be enough to get us all device labels, so
                    // if video is muted, don't bother requesting video.
                    stream = await navigator.mediaDevices.getUserMedia({
                        audio: true,
                        video: !videoMuted && devices!.videoinput.length > 0 && { deviceId: videoInputId },
                    });
                } else if (devices!.videoinput.length > 0) {
                    // We have to resort to a video stream, even if video is supposed to be muted.
                    stream = await navigator.mediaDevices.getUserMedia({ video: { deviceId: videoInputId } });
                }
            } catch (e) {
                logger.warn(`Failed to get stream for device ${videoInputId}`, e);
                handleMediaDeviceFailing(`Have access to Device list but unable to read from Media Devices`);
            }

            // Refresh the devices now that we hold a stream
            if (stream !== null) devices = await MediaDeviceHandler.getDevices();

            // If video is muted, we don't actually want the stream, so we can get rid of it now.
            if (videoMuted) {
                stream?.getTracks().forEach((t) => t.stop());
                stream = null;
            }

            return [stream, devices?.audioinput ?? [], devices?.videoinput ?? []];
        },
        [videoInputId, videoMuted],
        [null, [], []],
    );

    const setAudioInput = useCallback((device: MediaDeviceInfo) => {
        MediaDeviceHandler.instance.setAudioInput(device.deviceId);
    }, []);
    const setVideoInput = useCallback((device: MediaDeviceInfo) => {
        MediaDeviceHandler.instance.setVideoInput(device.deviceId);
        setVideoInputId(device.deviceId);
    }, []);

    useEffect(() => {
        if (videoStream) {
            const videoElement = videoRef.current!;
            videoElement.srcObject = videoStream;
            videoElement.play();

            return () => {
                videoStream.getTracks().forEach((track) => track.stop());
                videoElement.srcObject = null;
            };
        }
    }, [videoStream]);

    const onConnectClick = useCallback(
        async (ev: ButtonEvent): Promise<void> => {
            ev.preventDefault();
            setConnecting(true);
            try {
                await connect();
            } catch (e) {
                logger.error(e);
                setConnecting(false);
            }
        },
        [connect, setConnecting],
    );

    return (
        <div className="mx_CallView_lobby">
            {children}
            <div className="mx_CallView_preview">
                <MemberAvatar key={me.userId} member={me} size="200px" resizeMethod="scale" />
                <video
                    ref={videoRef}
                    style={{ visibility: videoMuted ? "hidden" : undefined }}
                    muted
                    playsInline
                    disablePictureInPicture
                />
                <div className="mx_CallView_controls">
                    <DeviceButton
                        kind="audio"
                        devices={audioInputs}
                        setDevice={setAudioInput}
                        deviceListLabel={_t("voip|audio_devices")}
                        muted={audioMuted}
                        disabled={connecting}
                        toggle={toggleAudio}
                        unmutedTitle={_t("voip|disable_microphone")}
                        mutedTitle={_t("voip|enable_microphone")}
                    />
                    <DeviceButton
                        kind="video"
                        devices={videoInputs}
                        setDevice={setVideoInput}
                        deviceListLabel={_t("voip|video_devices")}
                        muted={videoMuted}
                        disabled={connecting}
                        toggle={toggleVideo}
                        unmutedTitle={_t("voip|disable_camera")}
                        mutedTitle={_t("voip|enable_camera")}
                    />
                </div>
            </div>
            <AccessibleTooltipButton
                className="mx_CallView_connectButton"
                kind="primary"
                disabled={connecting || joinCallButtonDisabledTooltip !== undefined}
                onClick={onConnectClick}
                label={_t("action|join")}
                tooltip={connecting ? _t("voip|connecting") : joinCallButtonDisabledTooltip}
                alignment={Alignment.Bottom}
            />
        </div>
    );
};

interface StartCallViewProps {
    room: Room;
    resizing: boolean;
    call: Call | null;
    setStartingCall: (value: boolean) => void;
    startingCall: boolean;
    skipLobby?: boolean;
}

const StartCallView: FC<StartCallViewProps> = ({ room, resizing, call, setStartingCall, startingCall, skipLobby }) => {
    const cli = useContext(MatrixClientContext);

    // We need to do this awkward double effect system,
    // because otherwise we will not have subscribed to the CallStore
    // before we create the call which emits the UPDATE_ROOM event.
    useEffect(() => {
        setStartingCall(true);
    }, [setStartingCall]);
    useEffect(() => {
        if (startingCall) {
            ElementCall.create(room, skipLobby);
        }
    }, [room, skipLobby, startingCall]);

    useEffect(() => {
        (async (): Promise<void> => {
            // If the call was successfully started, connect automatically
            if (call !== null) {
                try {
                    // Disconnect from any other active calls first, since we don't yet support holding
                    await Promise.all([...CallStore.instance.activeCalls].map((call) => call.disconnect()));
                    await call.connect();
                } catch (e) {
                    logger.error(e);
                }
            }
        })();
    }, [call]);

    return (
        <div className="mx_CallView">
            {call !== null && (
                <AppTile
                    app={call.widget}
                    room={room}
                    userId={cli.credentials.userId!}
                    creatorUserId={call.widget.creatorUserId}
                    waitForIframeLoad={call.widget.waitForIframeLoad}
                    showMenubar={false}
                    pointerEvents={resizing ? "none" : undefined}
                />
            )}
        </div>
    );
};

interface JoinCallViewProps {
    room: Room;
    resizing: boolean;
    call: Call;
    skipLobby?: boolean;
}

const JoinCallView: FC<JoinCallViewProps> = ({ room, resizing, call, skipLobby }) => {
    const cli = useContext(MatrixClientContext);

    const connect = useCallback(async (): Promise<void> => {
        // Disconnect from any other active calls first, since we don't yet support holding
        await Promise.all([...CallStore.instance.activeCalls].map((call) => call.disconnect()));
        await call.connect();
    }, [call]);

    // We'll take this opportunity to tidy up our room state
    useEffect(() => {
        call.clean();
    }, [call]);
    useEffect(() => {
        if (call.connectionState === "disconnected") {
            (call.widget.data ?? { skipLobby }).skipLobby = skipLobby;
            connect();
        }
    }, [call.connectionState, call.widget.data, connect, skipLobby]);

    return (
        <div className="mx_CallView">
            <AppTile
                app={call.widget}
                room={room}
                userId={cli.credentials.userId!}
                creatorUserId={call.widget.creatorUserId}
                waitForIframeLoad={call.widget.waitForIframeLoad}
                showMenubar={false}
                pointerEvents={resizing ? "none" : undefined}
            />
        </div>
    );
};

interface CallViewProps {
    room: Room;
    resizing: boolean;
    /**
     * If true, the view will be blank until a call appears. Otherwise, the join
     * button will create a call if there isn't already one.
     */
    waitForCall: boolean;
    skipLobby?: boolean;
}

export const CallView: FC<CallViewProps> = ({ room, resizing, waitForCall, skipLobby }) => {
    const call = useCall(room.roomId);
    const [startingCall, setStartingCall] = useState(false);

    if (call === null || startingCall) {
        if (waitForCall) return null;
        return (
            <StartCallView
                room={room}
                resizing={resizing}
                call={call}
                setStartingCall={setStartingCall}
                startingCall={startingCall}
                skipLobby={skipLobby}
            />
        );
    } else {
        return <JoinCallView room={room} resizing={resizing} call={call} skipLobby={skipLobby} />;
    }
};
