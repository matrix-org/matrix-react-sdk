import React from "react";
import { animated } from "@react-spring/web";
import classNames from "classnames";
import { GroupCallParticipant } from "matrix-js-sdk/src/webrtc/groupCallParticipant";
import { useGroupCallParticipant } from "../../../../hooks/useGroupCallParticipant";
import { useCallFeed } from "../../../../hooks/useCallFeed";
import { useMediaStream } from "../../../../hooks/useMediaStream";

interface IParticipantTileProps {
    style: any;
    participant: GroupCallParticipant;
    remove: boolean;
    presenter: boolean;
}

export default function ParticipantTile({ style, participant, remove, presenter, ...rest }: IParticipantTileProps) {
    const { displayName, usermediaFeed } = useGroupCallParticipant(participant);
    const { isLocal, audioMuted, videoMuted, speaking, stream } = useCallFeed(usermediaFeed);
    const mediaRef = useMediaStream<HTMLVideoElement>(stream, isLocal);

    // Firefox doesn't respect the disablePictureInPicture attribute
    // https://bugzilla.mozilla.org/show_bug.cgi?id=1611831

    return (
        <animated.div className="mx_participantTile" style={style} {...rest}>
            <div
                className={classNames("mx_participantName", {
                    "mx_speaking": speaking,
                })}
            >
                { speaking ? (
                    <i />
                ) : audioMuted ? (
                    <i className="mx_muteMicIcon" />
                ) : null }
                <span>{ displayName }</span>
            </div>
            { videoMuted && (
                <i className="mx_videoMuted" />
            ) }
            <video ref={mediaRef} playsInline disablePictureInPicture />
        </animated.div>
    );
}
