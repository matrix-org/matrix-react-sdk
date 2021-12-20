import React, { forwardRef, PropsWithChildren, ReactNode } from "react";
import { animated } from "@react-spring/web";
import classNames from "classnames";
import { useCallFeed } from "../../../../hooks/useCallFeed";
import { useMediaStream } from "../../../../hooks/useMediaStream";
import { useRoomMemberName } from "../../../../hooks/useRoomMemberName";
import { CallFeed } from "matrix-js-sdk/src/webrtc/callFeed";
import { SDPStreamMetadataPurpose } from "matrix-js-sdk/src/webrtc/callEventTypes";
import { RoomMember } from "matrix-js-sdk/src/models/room-member";

interface IVideoContainerProps {
    as: React.ElementType<PropsWithChildren<any>>;
    className?: string;
    callFeed: CallFeed;
    getAvatar?: (member: RoomMember, width: number, height: number) => ReactNode;
    children?: ReactNode;
    style?: any;
    width: number;
    height: number;
}

const VideoContainer = forwardRef<HTMLVideoElement, IVideoContainerProps>((
    {
        as: Component,
        className,
        callFeed,
        getAvatar,
        children,
        width,
        height,
        ...rest
    },
    ref) => {
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
        <Component
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
            { purpose !== SDPStreamMetadataPurpose.Screenshare && (
                <div className="mx_memberName">
                    <i className={audioMuted ? "mx_muteMicIcon" : "mx_micIcon"} />
                    <span title={name}>{ name }</span>
                </div>
            ) }
            <video ref={mediaRef} playsInline disablePictureInPicture />
            { children }
        </Component>
    );
});

interface IVideoTileProps {
    style?: any;
    getAvatar?: (member: RoomMember, width: number, height: number) => ReactNode;
    usermediaCallFeed: CallFeed;
    screenshareCallFeed?: CallFeed;
    width: number;
    height: number;
}

export default function VideoTile({
    style,
    usermediaCallFeed,
    screenshareCallFeed,
    width,
    height,
    ...rest
}: IVideoTileProps) {
    return (
        <VideoContainer
            as={animated.div}
            style={style}
            callFeed={screenshareCallFeed || usermediaCallFeed}
            width={width}
            height={height}
            {...rest}
        >
            {
                screenshareCallFeed && (
                    <VideoContainer
                        as="div"
                        className="mx_screensharePIP"
                        callFeed={usermediaCallFeed}
                        width={Math.round(width / 4)}
                        height={Math.round(height / 4)}
                    />
                )
            }
        </VideoContainer>
    );
}
