import React, { useState, useCallback, memo, useRef, useEffect } from "react";
import { GroupCall } from "matrix-js-sdk/src/webrtc/groupCall";
import { useGroupCall } from "../../../hooks/useGroupCall";
import VideoGrid from "./GroupCallView/VideoGrid";
import CallViewButtons from "./CallView/CallViewButtons";
import { CallType } from "matrix-js-sdk/src/webrtc/call";

interface IProps {
    groupCall: GroupCall;
    pipMode: boolean;
}

function useRoomLayout(): [string, () => void] {
    const [layout, setLayout] = useState("gallery");

    const toggleLayout = useCallback(() => {
        setLayout(layout === "spotlight" ? "gallery" : "spotlight");
    }, [layout]);

    return [layout, toggleLayout];
}

const GroupCallView = memo(({ groupCall, pipMode }: IProps) => {
    const callViewButtonsRef = useRef<CallViewButtons>();
    const {
        participants,
        toggleLocalVideoMuted,
        toggleMicrophoneMuted,
        microphoneMuted,
        localVideoMuted,
        enter,
        leave,
        entered,
    } = useGroupCall(groupCall);
    const [layout] = useRoomLayout();

    useEffect(() => {
        enter();
    }, [enter]);

    useEffect(() => {
        (window as unknown as any).groupCall = groupCall;
    }, [groupCall]);

    const onMouseMove = useCallback(() => {
        callViewButtonsRef.current?.showControls();
    }, []);

    return (
        <div className="mx_GroupCallView" onMouseMove={onMouseMove}>
            <VideoGrid participants={participants} layout={layout} />
            <CallViewButtons
                ref={callViewButtonsRef}
                pipMode={pipMode}
                handlers={{
                    onHangupClick: entered ? leave : enter,
                    onMicMuteClick: toggleMicrophoneMuted,
                    onVidMuteClick: toggleLocalVideoMuted,
                }}
                buttonsState={{
                    micMuted: microphoneMuted,
                    vidMuted: localVideoMuted,
                }}
                buttonsVisibility={{
                    vidMute: groupCall.type === CallType.Video,
                }}
            />
        </div>
    );
});

export default GroupCallView;
