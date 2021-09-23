import React from "react";
import { animated } from "@react-spring/web";
import classNames from "classnames";
import { useCallFeed } from "../../../../hooks/useCallFeed";
import { useMediaStream } from "../../../../hooks/useMediaStream";
import { useRoomMemberName } from "../../../../hooks/useRoomMemberName";
import { CallFeed } from "matrix-js-sdk/src/webrtc/callFeed";
import { RoomMember } from "matrix-js-sdk";

interface IVideoTileProps {
    style: any;
    member: RoomMember;
    callFeed: CallFeed;
}

export default function VideoTile({
    style,
    member,
    callFeed,
    ...rest
}: IVideoTileProps) {
    const name = useRoomMemberName(member);
    const { isLocal, audioMuted, videoMuted, speaking, stream } = useCallFeed(callFeed);
    const mediaRef = useMediaStream<HTMLVideoElement>(stream, isLocal);

    // Firefox doesn't respect the disablePictureInPicture attribute
    // https://bugzilla.mozilla.org/show_bug.cgi?id=1611831

    return (
        <animated.div className="mx_videoTile" style={style} {...rest}>
            <div
                className={classNames("mx_memberName", {
                    "mx_speaking": speaking,
                })}
            >
                { speaking ? (
                    <i />
                ) : audioMuted ? (
                    <i className="mx_muteMicIcon" />
                ) : null }
                <span>{ name }</span>
            </div>
            { videoMuted && (
                <i className="mx_videoMuted" />
            ) }
            <video ref={mediaRef} playsInline disablePictureInPicture />
        </animated.div>
    );
}
