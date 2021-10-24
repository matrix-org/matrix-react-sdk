import { useState, useEffect } from "react";
import { CallFeed, CallFeedEvent } from "matrix-js-sdk/src/webrtc/callFeed";
import { RoomMember } from "matrix-js-sdk";
import { SDPStreamMetadataPurpose } from "matrix-js-sdk/src/webrtc/callEventTypes";

interface ICallFeedState {
    member?: RoomMember;
    isLocal: boolean;
    speaking: boolean;
    videoMuted: boolean;
    audioMuted: boolean;
    stream?: MediaStream;
    purpose?: SDPStreamMetadataPurpose;
}

function getCallFeedState(callFeed?: CallFeed) {
    return {
        member: callFeed ? callFeed.getMember() : null,
        isLocal: callFeed ? callFeed.isLocal() : false,
        speaking: callFeed ? callFeed.isSpeaking() : false,
        videoMuted: callFeed ? callFeed.isVideoMuted() : true,
        audioMuted: callFeed ? callFeed.isAudioMuted() : true,
        stream: callFeed ? callFeed.stream : undefined,
        purpose: callFeed ? callFeed.purpose : undefined,
    };
}

export function useCallFeed(callFeed?: CallFeed): ICallFeedState {
    const [state, setState] = useState<ICallFeedState>(() => getCallFeedState(callFeed));

    useEffect(() => {
        function onSpeaking(speaking: boolean) {
            setState((prevState) => ({ ...prevState, speaking }));
        }

        function onMuteStateChanged(audioMuted: boolean, videoMuted: boolean) {
            setState((prevState) => ({ ...prevState, audioMuted, videoMuted }));
        }

        function onUpdateCallFeed() {
            setState(getCallFeedState(callFeed));
        }

        if (callFeed) {
            callFeed.on(CallFeedEvent.Speaking, onSpeaking);
            callFeed.on(CallFeedEvent.MuteStateChanged, onMuteStateChanged);
            callFeed.on(CallFeedEvent.NewStream, onUpdateCallFeed);
        }

        onUpdateCallFeed();

        return () => {
            if (callFeed) {
                callFeed.removeListener(CallFeedEvent.Speaking, onSpeaking);
                callFeed.removeListener(CallFeedEvent.MuteStateChanged, onMuteStateChanged);
                callFeed.removeListener(CallFeedEvent.NewStream, onUpdateCallFeed);
            }
        };
    }, [callFeed]);

    return state;
}
