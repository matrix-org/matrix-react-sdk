import React, { useState, useCallback, memo, useRef, useEffect } from "react";
import { GroupCall } from "matrix-js-sdk/src/webrtc/groupCall";
import { useGroupCall } from "../../../hooks/useGroupCall";
import VideoGrid from "./GroupCallView/VideoGrid";
import CallViewButtons from "./CallView/CallViewButtons";
import { CallType } from "matrix-js-sdk/src/webrtc/call";
import AccessibleButton from "../elements/AccessibleButton";
import { _t } from "../../../languageHandler";

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
        entering,
    } = useGroupCall(groupCall);
    const [layout] = useRoomLayout();

    useEffect(() => {
        (window as unknown as any).groupCall = groupCall;
    }, [groupCall]);

    const onMouseMove = useCallback(() => {
        callViewButtonsRef.current?.showControls();
    }, []);

    return (
        <div className="mx_GroupCallView" onMouseMove={onMouseMove}> {
            (entered || entering)
                ? <React.Fragment>
                    <VideoGrid participants={participants} layout={layout} />
                    <CallViewButtons
                        ref={callViewButtonsRef}
                        pipMode={pipMode}
                        handlers={{
                            onHangupClick: leave,
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
                </React.Fragment>
                : <AccessibleButton kind="primary" onClick={enter}>
                    { _t("Enter conference ") }
                </AccessibleButton>
        } </div>
    );
});

export default GroupCallView;
