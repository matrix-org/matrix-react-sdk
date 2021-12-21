import React, { ReactNode } from "react";
import { animated } from "@react-spring/web";
import classNames from "classnames";
import { useCallFeed } from "../../../../hooks/useCallFeed";
import { useMediaStream } from "../../../../hooks/useMediaStream";
import { useRoomMemberName } from "../../../../hooks/useRoomMemberName";
import { CallFeed } from "matrix-js-sdk/src/webrtc/callFeed";
import { SDPStreamMetadataPurpose } from "matrix-js-sdk/src/webrtc/callEventTypes";
import { RoomMember } from "matrix-js-sdk/src/models/room-member";

interface IVideoTileProps {
    className?: string;
    callFeed: CallFeed;
    getAvatar?: (member: RoomMember, width: number, height: number) => ReactNode;
    style?: any;
    width: number;
    height: number;
}

export default function VideoTile(
    {
        className,
        callFeed,
        getAvatar,
        width,
        height,
        ...rest
    }: IVideoTileProps) {
    const {
        isLocal,
        audioMuted,
        videoMuted,
        speaking,
        stream,
        purpose,
        member,
    } = useCallFeed(callFeed);
    const name = useRoomMemberName(member);
    const mediaRef = useMediaStream<HTMLVideoElement>(stream, isLocal);

    // Firefox doesn't respect the disablePictureInPicture attribute
    // https://bugzilla.mozilla.org/show_bug.cgi?id=1611831

    return (
        <animated.div
            className={classNames("mx_videoTile", className, {
                "mx_isLocal": isLocal,
                "mx_speaking": speaking,
                "mx_muted": audioMuted,
                "mx_screenshare": purpose === SDPStreamMetadataPurpose.Screenshare,
            })}
            {...rest}
        >
            { videoMuted && (
                <>
                    <div className="mx_videoMutedOverlay" />
                    { getAvatar && getAvatar(member, width, height) }
                </>
            ) }
            { purpose === SDPStreamMetadataPurpose.Screenshare ? (
                <div className="mx_presenterLabel">
                    <span>{ `${name} is presenting` }</span>
                </div>
            ) : (
                <div className="mx_memberName">
                    <i className={audioMuted ? "mx_muteMicIcon" : "mx_micIcon"} />
                    <span title={name}>{ name }</span>
                </div>
            ) }
            <video ref={mediaRef} playsInline disablePictureInPicture />
        </animated.div>
    );
}
