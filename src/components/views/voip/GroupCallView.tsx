import React, { useCallback, memo, useRef, useEffect, useMemo } from "react";
import { GroupCall, GroupCallState } from "matrix-js-sdk/src/webrtc/groupCall";
import { useGroupCall } from "../../../hooks/useGroupCall";
import VideoGrid, { useVideoGridLayout } from "./GroupCallView/VideoGrid";
import CallViewButtons from "./CallView/CallViewButtons";
import { CallType } from "matrix-js-sdk/src/webrtc/call";
import AccessibleButton from "../elements/AccessibleButton";
import { _t } from "../../../languageHandler";

interface IProps {
    groupCall: GroupCall;
    pipMode: boolean;
}

const GroupCallView = memo(({ groupCall, pipMode }: IProps) => {
    const callViewButtonsRef = useRef<CallViewButtons>();
    const {
        state,
        activeSpeaker,
        userMediaFeeds,
        microphoneMuted,
        localVideoMuted,
        enter,
        leave,
        toggleLocalVideoMuted,
        toggleMicrophoneMuted,
    } = useGroupCall(groupCall);
    const [layout] = useVideoGridLayout();

    const items = useMemo(() => userMediaFeeds.map((callFeed) => ({
        id: callFeed.userId,
        callFeed,
        isActiveSpeaker: callFeed.userId === activeSpeaker,
    })), [userMediaFeeds, activeSpeaker]);

    useEffect(() => {
        (window as unknown as any).groupCall = groupCall;
    }, [groupCall]);

    const onMouseMove = useCallback(() => {
        callViewButtonsRef.current?.showControls();
    }, []);

    return (
        <div className="mx_GroupCallView" onMouseMove={onMouseMove}> {
            (state === GroupCallState.Entered || state === GroupCallState.Entering)
                ? <React.Fragment>
                    <VideoGrid items={items} layout={layout} />
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
