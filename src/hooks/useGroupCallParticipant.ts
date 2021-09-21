import { useRef, useState, useEffect } from "react";
import { GroupCallParticipant, GroupCallParticipantEvent } from "matrix-js-sdk/src/webrtc/groupCallParticipant";

interface IGroupCallParticipantState {
    displayName: string;
    speaking: boolean;
    videoMuted: boolean;
    audioMuted: boolean;
    stream?: MediaStream;
}

export function useGroupCallParticipant<E extends HTMLMediaElement>(participant: GroupCallParticipant) {
    const mediaRef = useRef<E>();

    const [{
        displayName,
        speaking,
        videoMuted,
        audioMuted,
        stream,
    }, setState] = useState<IGroupCallParticipantState>(() => ({
        displayName: participant.member.rawDisplayName, // TODO: Update display name on member state change
        speaking: participant.usermediaFeed?.isSpeaking(),
        videoMuted: participant.isVideoMuted(),
        audioMuted: participant.isAudioMuted(),
        stream: participant.usermediaStream,
    }));

    useEffect(() => {
        function onSpeaking(speaking: boolean) {
            setState((prevState) => ({ ...prevState, speaking }));
        }

        function onMuteStateChanged(audioMuted: boolean, videoMuted: boolean) {
            setState((prevState) => ({ ...prevState, audioMuted, videoMuted }));
        }

        function onUpdateParticipant() {
            setState({
                displayName: participant.member.rawDisplayName,
                speaking: participant.usermediaFeed?.isSpeaking(),
                videoMuted: participant.isVideoMuted(),
                audioMuted: participant.isAudioMuted(),
                stream: participant.usermediaStream,
            });
        }

        participant.on(GroupCallParticipantEvent.Speaking, onSpeaking);
        participant.on(GroupCallParticipantEvent.MuteStateChanged, onMuteStateChanged);
        participant.on(GroupCallParticipantEvent.CallReplaced, onUpdateParticipant);
        participant.on(GroupCallParticipantEvent.CallFeedsChanged, onUpdateParticipant);

        return () => {
            participant.removeListener(GroupCallParticipantEvent.Speaking, onSpeaking);
            participant.removeListener(GroupCallParticipantEvent.MuteStateChanged, onMuteStateChanged);
            participant.removeListener(GroupCallParticipantEvent.CallReplaced, onUpdateParticipant);
            participant.removeListener(GroupCallParticipantEvent.CallFeedsChanged, onUpdateParticipant);
        };
    }, [participant]);

    useEffect(() => {
        if (mediaRef.current) {
            if (stream) {
                if (!participant.call) {
                    mediaRef.current.muted = true;
                }

                mediaRef.current.srcObject = stream;
                mediaRef.current.play();
            } else {
                mediaRef.current.srcObject = null;
            }
        }
    }, [participant, stream]);

    return {
        displayName,
        speaking,
        videoMuted,
        audioMuted,
        stream,
        mediaRef,
    };
}
