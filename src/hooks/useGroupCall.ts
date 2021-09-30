
import { useCallback, useEffect, useState } from "react";
import { CallFeed } from "matrix-js-sdk/src/webrtc/callFeed";
import { MatrixCall } from "matrix-js-sdk/src/webrtc/call";
import { GroupCallEvent, GroupCall, GroupCallState } from "matrix-js-sdk/src/webrtc/groupCall";
import { usePageUnload } from "./usePageUnload";

console.log(GroupCallEvent);

interface IGroupCallState {
    state: GroupCallState;
    localCallFeed?: CallFeed;
    activeSpeaker?: string;
    calls: MatrixCall[];
    userMediaFeeds: CallFeed[];
    error?: Error;
    microphoneMuted: boolean;
    localVideoMuted: boolean;
    localScreenshareFeed?: CallFeed;
    localDesktopCapturerSourceId?: string;
    screenshareFeeds: CallFeed[];
    isScreensharing: boolean;
}

interface IGroupCallReturn extends IGroupCallState {
    initLocalCallFeed: () => Promise<CallFeed>;
    enter: () => void;
    leave: () => void;
    toggleLocalVideoMuted: () => void;
    toggleMicrophoneMuted: () => void;
    toggleScreensharing: () => void;
}

export function useGroupCall(groupCall: GroupCall): IGroupCallReturn {
    const [
        {
            state,
            calls,
            localCallFeed,
            activeSpeaker,
            userMediaFeeds,
            error,
            microphoneMuted,
            localVideoMuted,
            isScreensharing,
            screenshareFeeds,
            localScreenshareFeed,
            localDesktopCapturerSourceId,
        },
        setState,
    ] = useState<IGroupCallState>({
        state: GroupCallState.LocalCallFeedUninitialized,
        calls: [],
        userMediaFeeds: [],
        microphoneMuted: false,
        localVideoMuted: false,
        screenshareFeeds: [],
        isScreensharing: false,
    });

    const updateState = (state: Partial<IGroupCallState>) =>
        setState((prevState: IGroupCallState) => ({ ...prevState, ...state }));

    useEffect(() => {
        function onGroupCallStateChanged() {
            updateState({
                state: groupCall.state,
                calls: [...groupCall.calls],
                localCallFeed: groupCall.localCallFeed,
                activeSpeaker: groupCall.activeSpeaker,
                userMediaFeeds: [...groupCall.userMediaFeeds],
                microphoneMuted: groupCall.isMicrophoneMuted(),
                localVideoMuted: groupCall.isLocalVideoMuted(),
                isScreensharing: groupCall.isScreensharing(),
                localScreenshareFeed: groupCall.localScreenshareFeed,
                localDesktopCapturerSourceId: groupCall.localDesktopCapturerSourceId,
                screenshareFeeds: [...groupCall.screenshareFeeds],
            });
        }

        function onUserMediaFeedsChanged(userMediaFeeds: CallFeed[]) {
            updateState({
                userMediaFeeds: [...userMediaFeeds],
            });
        }

        function onScreenshareFeedsChanged(screenshareFeeds: CallFeed[]) {
            console.log("screensharing feeds changed", screenshareFeeds);
            updateState({
                screenshareFeeds: [...screenshareFeeds],
            });
        }

        function onActiveSpeakerChanged(activeSpeaker: string) {
            updateState({
                activeSpeaker: activeSpeaker,
            });
        }

        function onLocalMuteStateChanged(microphoneMuted: boolean, localVideoMuted: boolean) {
            updateState({
                microphoneMuted,
                localVideoMuted,
            });
        }

        function onLocalScreenshareStateChanged(
            isScreensharing: boolean,
            localScreenshareFeed?: CallFeed,
            localDesktopCapturerSourceId?: string,
        ) {
            updateState({
                isScreensharing,
                localScreenshareFeed,
                localDesktopCapturerSourceId,
            });
        }

        function onCallsChanged(calls: MatrixCall[]) {
            updateState({
                calls: [...calls],
            });
        }

        groupCall.on(GroupCallEvent.GroupCallStateChanged, onGroupCallStateChanged);
        groupCall.on(GroupCallEvent.UserMediaFeedsChanged, onUserMediaFeedsChanged);
        groupCall.on(GroupCallEvent.ScreenshareFeedsChanged, onScreenshareFeedsChanged);
        groupCall.on(GroupCallEvent.ActiveSpeakerChanged, onActiveSpeakerChanged);
        groupCall.on(GroupCallEvent.LocalMuteStateChanged, onLocalMuteStateChanged);
        groupCall.on(GroupCallEvent.LocalScreenshareStateChanged, onLocalScreenshareStateChanged);
        groupCall.on(GroupCallEvent.CallsChanged, onCallsChanged);

        updateState({
            error: null,
            state: groupCall.state,
            calls: [...groupCall.calls],
            localCallFeed: groupCall.localCallFeed,
            activeSpeaker: groupCall.activeSpeaker,
            userMediaFeeds: [...groupCall.userMediaFeeds],
            microphoneMuted: groupCall.isMicrophoneMuted(),
            localVideoMuted: groupCall.isLocalVideoMuted(),
            isScreensharing: groupCall.isScreensharing(),
            localScreenshareFeed: groupCall.localScreenshareFeed,
            localDesktopCapturerSourceId: groupCall.localDesktopCapturerSourceId,
            screenshareFeeds: [...groupCall.screenshareFeeds],
        });

        return () => {
            groupCall.removeListener(GroupCallEvent.GroupCallStateChanged, onGroupCallStateChanged);
            groupCall.removeListener(GroupCallEvent.UserMediaFeedsChanged, onUserMediaFeedsChanged);
            groupCall.removeListener(GroupCallEvent.ScreenshareFeedsChanged, onScreenshareFeedsChanged);
            groupCall.removeListener(GroupCallEvent.ActiveSpeakerChanged, onActiveSpeakerChanged);
            groupCall.removeListener(GroupCallEvent.LocalMuteStateChanged, onLocalMuteStateChanged);
            groupCall.removeListener(GroupCallEvent.LocalScreenshareStateChanged, onLocalScreenshareStateChanged);
            groupCall.removeListener(GroupCallEvent.CallsChanged, onCallsChanged);
            groupCall.leave();
        };
    }, [groupCall]);

    usePageUnload(() => {
        groupCall.leave();
    });

    const initLocalCallFeed = useCallback(() => groupCall.initLocalCallFeed(), [groupCall]);

    const enter = useCallback(() => {
        if (groupCall.state !== GroupCallState.LocalCallFeedUninitialized
            && groupCall.state !== GroupCallState.LocalCallFeedInitialized) {
            return;
        }

        groupCall
            .enter()
            .catch((error) => {
                console.error(error);
                updateState({ error });
            });
    }, [groupCall]);

    const leave = useCallback(() => groupCall.leave(), [groupCall]);

    const toggleLocalVideoMuted = useCallback(() => {
        groupCall.setLocalVideoMuted(
            !groupCall.isLocalVideoMuted(),
        );
    }, [groupCall]);

    const toggleMicrophoneMuted = useCallback(() => {
        groupCall.setMicrophoneMuted(
            !groupCall.isMicrophoneMuted(),
        );
    }, [groupCall]);

    const toggleScreensharing = useCallback(() => {
        groupCall.setScreensharingEnabled(
            !groupCall.isScreensharing(),
        );
    }, [groupCall]);

    return {
        state,
        calls,
        localCallFeed,
        activeSpeaker,
        userMediaFeeds,
        microphoneMuted,
        localVideoMuted,
        error,
        initLocalCallFeed,
        enter,
        leave,
        toggleLocalVideoMuted,
        toggleMicrophoneMuted,
        toggleScreensharing,
        isScreensharing,
        screenshareFeeds,
        localScreenshareFeed,
        localDesktopCapturerSourceId,
    };
}
