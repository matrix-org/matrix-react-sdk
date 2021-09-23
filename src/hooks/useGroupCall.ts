
import { useCallback, useEffect, useState } from "react";
import { GroupCallEvent, GroupCall } from "matrix-js-sdk/src/webrtc/groupCall";
import { usePageUnload } from "./usePageUnload";

export function useGroupCall(groupCall: GroupCall) {
    const [
        {
            loading,
            entered,
            entering,
            room,
            participants,
            error,
            microphoneMuted,
            localVideoMuted,
        },
        setState,
    ] = useState({
        loading: true,
        entered: false,
        entering: false,
        room: null,
        participants: [],
        error: null,
        microphoneMuted: false,
        localVideoMuted: false,
    });

    const updateState = (state) =>
        setState((prevState) => ({ ...prevState, ...state }));

    useEffect(() => {
        function onParticipantsChanged() {
            updateState({
                loading: !groupCall.entered,
                entered: groupCall.entered,
                participants: [...groupCall.participants],
            });
        }

        function onLocalMuteStateChanged(microphoneMuted, localVideoMuted) {
            updateState({
                microphoneMuted,
                localVideoMuted,
            });
        }

        groupCall.on(GroupCallEvent.Entered, onParticipantsChanged);
        groupCall.on(GroupCallEvent.ParticipantsChanged, onParticipantsChanged);
        groupCall.on(GroupCallEvent.LocalMuteStateChanged, onLocalMuteStateChanged);
        groupCall.on(GroupCallEvent.ActiveSpeakerChanged, onParticipantsChanged);
        groupCall.on(GroupCallEvent.Left, onParticipantsChanged);

        updateState({
            loading: !groupCall.entered,
            entered: groupCall.entered,
            participants: [...groupCall.participants],
        });

        return () => {
            groupCall.removeListener(GroupCallEvent.Entered, onParticipantsChanged);
            groupCall.removeListener(GroupCallEvent.ParticipantsChanged, onParticipantsChanged);
            groupCall.removeListener(GroupCallEvent.LocalMuteStateChanged, onLocalMuteStateChanged);
            groupCall.removeListener(GroupCallEvent.ActiveSpeakerChanged, onParticipantsChanged);
            groupCall.removeListener(GroupCallEvent.Left, onParticipantsChanged);
            groupCall.leave();
        };
    }, [groupCall]);

    usePageUnload(() => {
        groupCall.leave();
    });

    const initLocalParticipant = useCallback(() => groupCall.initLocalParticipant(), [groupCall]);

    const enter = useCallback(() => {
        updateState({ entering: true });

        groupCall
            .enter()
            .then(() => {
                updateState({
                    entered: true,
                    entering: false,
                    participants: [...groupCall.participants],
                });
            })
            .catch((error) => {
                updateState({ error, entering: false });
            });
    }, [groupCall]);

    const leave = useCallback(() => {
        groupCall.leave();
        updateState({
            entered: false,
            participants: [],
            microphoneMuted: false,
            localVideoMuted: false,
        });
    }, [groupCall]);

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

    return {
        loading,
        entered,
        entering,
        roomName: room ? room.name : null,
        participants,
        groupCall: groupCall,
        microphoneMuted,
        localVideoMuted,
        error,
        initLocalParticipant,
        enter,
        leave,
        toggleLocalVideoMuted,
        toggleMicrophoneMuted,
    };
}
