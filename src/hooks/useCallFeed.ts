import { useState, useEffect } from "react";
import { CallFeed, CallFeedEvent } from "matrix-js-sdk/src/webrtc/callFeed";

interface ICallFeedState {
    isLocal: boolean;
    speaking: boolean;
    videoMuted: boolean;
    audioMuted: boolean;
    stream?: MediaStream;
}

export function useCallFeed(callFeed?: CallFeed) {
    const [{
        isLocal,
        speaking,
        videoMuted,
        audioMuted,
        stream,
    }, setState] = useState<ICallFeedState>(() => ({
        isLocal: callFeed ? callFeed.isLocal() : false,
        speaking: callFeed ? callFeed.isSpeaking() : false,
        videoMuted: callFeed ? callFeed.isVideoMuted() : true,
        audioMuted: callFeed ? callFeed.isAudioMuted() : true,
        stream: callFeed ? callFeed.stream : undefined,
    }));

    useEffect(() => {
        function onSpeaking(speaking: boolean) {
            setState((prevState) => ({ ...prevState, speaking }));
        }

        function onMuteStateChanged(audioMuted: boolean, videoMuted: boolean) {
            setState((prevState) => ({ ...prevState, audioMuted, videoMuted }));
        }

        function onUpdateCallFeed() {
            setState({
                isLocal: callFeed.isLocal(),
                speaking: callFeed.isSpeaking(),
                videoMuted: callFeed.isVideoMuted(),
                audioMuted: callFeed.isAudioMuted(),
                stream: callFeed.stream,
            });
        }

        if (callFeed) {
            callFeed.on(CallFeedEvent.Speaking, onSpeaking);
            callFeed.on(CallFeedEvent.MuteStateChanged, onMuteStateChanged);
            callFeed.on(CallFeedEvent.NewStream, onUpdateCallFeed);

            onUpdateCallFeed();
        }

        return () => {
            if (callFeed) {
                callFeed.on(CallFeedEvent.Speaking, onSpeaking);
                callFeed.on(CallFeedEvent.MuteStateChanged, onMuteStateChanged);
                callFeed.on(CallFeedEvent.NewStream, onUpdateCallFeed);
            }
        };
    }, [callFeed]);

    return {
        isLocal,
        speaking,
        videoMuted,
        audioMuted,
        stream,
    };
}
