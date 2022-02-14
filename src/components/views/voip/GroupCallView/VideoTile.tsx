import React, { ReactNode, RefObject } from "react";
import { animated } from "@react-spring/web";
import classNames from "classnames";

export interface IVideoTileProps {
    className?: string;
    isLocal?: boolean;
    speaking?: boolean;
    audioMuted?: boolean;
    videoMuted?: boolean;
    screenshare?: boolean;
    avatar?: ReactNode;
    name: string;
    showName: boolean;
    mediaRef?: RefObject<HTMLVideoElement>;
}

export default function VideoTile(
    {
        className,
        isLocal,
        speaking,
        audioMuted,
        videoMuted,
        screenshare,
        avatar,
        name,
        showName,
        mediaRef,
        ...rest
    }: IVideoTileProps) {
    return (
        <animated.div
            className={classNames("mx_videoTile", className, {
                "mx_isLocal": isLocal,
                "mx_speaking": speaking,
                "mx_muted": audioMuted,
                "mx_screenshare": screenshare,
            })}
            {...rest}
        >
            { videoMuted && (
                <>
                    <div className="mx_videoMutedOverlay" />
                    { avatar }
                </>
            ) }
            { screenshare ? (
                <div className="mx_presenterLabel">
                    <span>{ `${name} is presenting` }</span>
                </div>
            ) : (
                <div className="mx_memberName">
                    <i className={audioMuted ? "mx_muteMicIcon" : "mx_micIcon"} />
                    { showName && <span title={name}>{ name }</span> }
                </div>
            ) }
            <video ref={mediaRef} playsInline disablePictureInPicture />
        </animated.div>
    );
}
