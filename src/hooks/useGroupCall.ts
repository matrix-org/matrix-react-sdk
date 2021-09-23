
import { useCallback, useEffect, useState } from "react";
import { GroupCallEvent, GroupCall } from "matrix-js-sdk/src/webrtc/groupCall";
import { usePageUnload } from "./usePageUnload";
import { GroupCallParticipant, GroupCallParticipantEvent } from "matrix-js-sdk/src/webrtc/groupCallParticipant";
import { Room } from "matrix-js-sdk";

interface IGroupCallState {
    loading: boolean;
    entered: boolean;
    entering: boolean;
    room: Room;
    participants: GroupCallParticipant[];
    error: Error | null;
    microphoneMuted: boolean;
    localVideoMuted: boolean;
}

interface IGroupCallReturn {
    loading: boolean;
    entered: boolean;
    entering: boolean;
    roomName: string;
    participants: GroupCallParticipant[];
    groupCall: GroupCall;
    microphoneMuted: boolean;
    localVideoMuted: boolean;
    error: Error | null;
    initLocalParticipant: () => Promise<GroupCallParticipant>;
    enter: () => void;
    leave: () => void;
    toggleLocalVideoMuted: () => void;
    toggleMicrophoneMuted: () => void;
}

export function useGroupCall(groupCall: GroupCall): IGroupCallReturn {
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
    ] = useState<IGroupCallState>({
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
        groupCall.on(GroupCallParticipantEvent.CallFeedsChanged, onParticipantsChanged);
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
            groupCall.removeListener(GroupCallParticipantEvent.CallFeedsChanged, onParticipantsChanged);
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
