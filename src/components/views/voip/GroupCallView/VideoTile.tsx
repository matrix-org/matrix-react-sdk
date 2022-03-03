import React, { ReactNode, RefObject } from "react";
import { animated } from "@react-spring/web";
import classNames from "classnames";

export interface IVideoTileProps {
    className?: string;
    isLocal?: boolean;
    speaking?: boolean;
    noVideo?: boolean;
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
        noVideo,
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
            { (videoMuted || noVideo) && (
                <>
                    <div className="mx_videoMutedOverlay" />
                    { avatar }
                </>
            ) }
            { screenshare ? (
                <div className="mx_presenterLabel">
                    <span>{ `${name} is presenting` }</span>
                </div>
            ) : (showName || audioMuted || (videoMuted && !noVideo)) && (
                <div className="mx_memberName">
                    { audioMuted && !(videoMuted && !noVideo) && <i className="mx_muteMicIcon" /> }
                    { videoMuted && !noVideo && <i className="mx_videoMutedIcon" /> }
                    { showName && <span title={name}>{ name }</span> }
                </div>
            ) }
            <video ref={mediaRef} playsInline disablePictureInPicture />
        </animated.div>
    );
}
