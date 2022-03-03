import { RoomMember } from "matrix-js-sdk/src/models/room-member";
import { SDPStreamMetadataPurpose } from "matrix-js-sdk/src/webrtc/callEventTypes";
import { CallFeed } from "matrix-js-sdk/src/webrtc/callFeed";
import React, { ReactNode } from "react";
import { useCallFeed } from "../../../../hooks/useCallFeed";
import { useMediaStream } from "../../../../hooks/useMediaStream";
import { useRoomMemberName } from "../../../../hooks/useRoomMemberName";
import VideoTile from "./VideoTile";
import { IVideoGridItem } from "./VideoGrid";

interface IVideoTileContainerProps {
    item: IVideoGridItem<{ callFeed: CallFeed }>;
    getAvatar?: (member: RoomMember, width: number, height: number) => ReactNode;
    width: number;
    height: number;
    showName: boolean;
    audioOutputDevice?: string;
    disableSpeakingIndicator?: boolean;
}

export function VideoTileContainer({
    item,
    width,
    height,
    getAvatar,
    showName,
    audioOutputDevice,
    disableSpeakingIndicator,
    ...rest
}: IVideoTileContainerProps) {
    const {
        isLocal,
        audioMuted,
        videoMuted,
        noVideo,
        speaking,
        stream,
        purpose,
        member,
    } = useCallFeed(item.callFeed);
    const { rawDisplayName } = useRoomMemberName(member);
    const mediaRef = useMediaStream<HTMLVideoElement>(stream, audioOutputDevice, isLocal);

    // Firefox doesn't respect the disablePictureInPicture attribute
    // https://bugzilla.mozilla.org/show_bug.cgi?id=1611831

    return (
        <VideoTile
            isLocal={isLocal}
            speaking={speaking && !disableSpeakingIndicator}
            audioMuted={audioMuted}
            noVideo={noVideo}
            videoMuted={videoMuted}
            screenshare={purpose === SDPStreamMetadataPurpose.Screenshare}
            name={rawDisplayName}
            showName={showName}
            mediaRef={mediaRef}
            avatar={getAvatar && getAvatar(member, width, height)}
            {...rest}
        />
    );
}
