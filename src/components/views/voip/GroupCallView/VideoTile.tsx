import React from "react";
import { animated } from "@react-spring/web";
import classNames from "classnames";
import { useCallFeed } from "../../../../hooks/useCallFeed";
import { useMediaStream } from "../../../../hooks/useMediaStream";
import { useRoomMemberName } from "../../../../hooks/useRoomMemberName";
import { CallFeed } from "matrix-js-sdk/src/webrtc/callFeed";
import { SDPStreamMetadataPurpose } from "matrix-js-sdk/src/webrtc/callEventTypes";

interface IVideoTileProps {
    style: any;
    callFeed: CallFeed;
    disableSpeakingHighlight: boolean;
}

export default function VideoTile({
    style,
    callFeed,
    disableSpeakingHighlight,
    ...rest
}: IVideoTileProps) {
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
            { purpose === SDPStreamMetadataPurpose.Usermedia && (
                <div className="mx_memberName">
                    <i className={audioMuted ? "mx_muteMicIcon" : "mx_micIcon"} />
                    <span>{ name }</span>
                </div>
            ) }
            { videoMuted && (
                <i className="mx_videoMutedIcon" />
            ) }
            <video ref={mediaRef} playsInline disablePictureInPicture />
        </animated.div>
    );
}
