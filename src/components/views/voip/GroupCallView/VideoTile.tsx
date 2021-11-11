import React, { useState } from "react";
import { animated } from "@react-spring/web";
import classNames from "classnames";
import { useCallFeed } from "../../../../hooks/useCallFeed";
import { useMediaStream } from "../../../../hooks/useMediaStream";
import { useRoomMemberName } from "../../../../hooks/useRoomMemberName";
import { CallFeed } from "matrix-js-sdk/src/webrtc/callFeed";
import { SDPStreamMetadataPurpose } from "matrix-js-sdk/src/webrtc/callEventTypes";

const defaultColors = ['#0DBD8B', '#368bd6', '#ac3ba8'];

interface IVideoTileProps {
    style?: any;
    callFeed: CallFeed;
    disableSpeakingHighlight: boolean;
}

export default function VideoTile({
    style,
    callFeed,
    disableSpeakingHighlight,
    ...rest
}: IVideoTileProps) {
    const [avatarBackgroundColor] = useState(() => {
        const avatarBackgroundColorIndex = Math.round(Math.random() * (defaultColors.length - 1));
        return defaultColors[avatarBackgroundColorIndex];
    });
    const { isLocal, audioMuted, videoMuted, speaking, stream, member, purpose } = useCallFeed(callFeed);
    const name = useRoomMemberName(member);
    const mediaRef = useMediaStream<HTMLVideoElement>(stream, isLocal);

    // Firefox doesn't respect the disablePictureInPicture attribute
    // https://bugzilla.mozilla.org/show_bug.cgi?id=1611831

    return (
        <animated.div
            className={classNames("mx_videoTile", {
                "mx_speaking": speaking && !disableSpeakingHighlight,
                "mx_muted": audioMuted,
            })}
            style={style}
            {...rest}
        >
            { videoMuted && (
                <>
                    <div className="mx_videoMutedOverlay" />
                    <svg className="mx_videoMutedAvatar" height="50%" viewBox="0 0 50 50" preserveAspectRatio="xMinYmin">
                        <circle r="25" cx="25" cy="25" fill={avatarBackgroundColor} />
                        <text x="25" y="27" fontSize="20" textAnchor="middle" dominantBaseline="middle" fill="white">
                            { name.slice(0, 1).toUpperCase() }
                        </text>
                    </svg>
                </>
            ) }
            { purpose === SDPStreamMetadataPurpose.Usermedia && (
                <div className="mx_memberName">
                    <i className={audioMuted ? "mx_muteMicIcon" : "mx_micIcon"} />
                    <span title={name}>{ name }</span>
                </div>
            ) }
            <video ref={mediaRef} playsInline disablePictureInPicture />
        </animated.div>
    );
}
