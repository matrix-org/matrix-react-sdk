import React, { forwardRef, PropsWithChildren, ReactNode, useState } from "react";
import { animated } from "@react-spring/web";
import classNames from "classnames";
import { useCallFeed } from "../../../../hooks/useCallFeed";
import { useMediaStream } from "../../../../hooks/useMediaStream";
import { useRoomMemberName } from "../../../../hooks/useRoomMemberName";
import { CallFeed } from "matrix-js-sdk/src/webrtc/callFeed";
import { SDPStreamMetadataPurpose } from "matrix-js-sdk/src/webrtc/callEventTypes";

const defaultColors = ['#0DBD8B', '#368bd6', '#ac3ba8'];

interface IVideoContainerProps {
    as: React.ElementType<PropsWithChildren<any>>;
    className?: string;
    disableSpeakingHighlight: boolean;
    callFeed: CallFeed;
    avatarBackgroundColor: string;
    children?: ReactNode;
    style?: any;
}

const VideoContainer = forwardRef<HTMLVideoElement, IVideoContainerProps>((
    {
        as: Component,
        className,
        disableSpeakingHighlight,
        callFeed,
        avatarBackgroundColor,
        children,
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
                "mx_speaking": speaking && !disableSpeakingHighlight,
                "mx_muted": audioMuted,
                "mx_screenshare": purpose === SDPStreamMetadataPurpose.Screenshare,
            })}
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
    usermediaCallFeed: CallFeed;
    screenshareCallFeed?: CallFeed;
    disableSpeakingHighlight: boolean;
}

export default function VideoTile({
    style,
    usermediaCallFeed,
    screenshareCallFeed,
    disableSpeakingHighlight,
    ...rest
}: IVideoTileProps) {
    const [avatarBackgroundColor] = useState(() => {
        const avatarBackgroundColorIndex = Math.round(Math.random() * (defaultColors.length - 1));
        return defaultColors[avatarBackgroundColorIndex];
    });

    return (
        <VideoContainer
            as={animated.div}
            style={style}
            disableSpeakingHighlight={disableSpeakingHighlight}
            avatarBackgroundColor={avatarBackgroundColor}
            callFeed={screenshareCallFeed || usermediaCallFeed}
            {...rest}
        >
            {
                screenshareCallFeed && (
                    <VideoContainer
                        as="div"
                        className="mx_screensharePIP"
                        avatarBackgroundColor={avatarBackgroundColor}
                        callFeed={usermediaCallFeed}
                        disableSpeakingHighlight={disableSpeakingHighlight}
                    />
                )
            }
        </VideoContainer>
    );
}
