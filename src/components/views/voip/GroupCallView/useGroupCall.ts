
import { useCallback, useEffect, useState } from "react";

// https://stackoverflow.com/a/9039885
function isIOS() {
    return (
        [
            "iPad Simulator",
            "iPhone Simulator",
            "iPod Simulator",
            "iPad",
            "iPhone",
            "iPod",
        ].includes(navigator.platform) ||
        // iPad on iOS 13 detection
        (navigator.userAgent.includes("Mac") && "ontouchend" in document)
    );
}

function usePageUnload(callback) {
    useEffect(() => {
        let pageVisibilityTimeout;

        function onBeforeUnload(event) {
            if (event.type === "visibilitychange") {
                if (document.visibilityState === "visible") {
                    clearTimeout(pageVisibilityTimeout);
                } else {
                    // Wait 5 seconds before closing the page to avoid accidentally leaving
                    // TODO: Make this configurable?
                    pageVisibilityTimeout = setTimeout(() => {
                        callback();
                    }, 5000);
                }
            } else {
                callback();
            }
        }

        // iOS doesn't fire beforeunload event, so leave the call when you hide the page.
        if (isIOS()) {
            window.addEventListener("pagehide", onBeforeUnload);
            document.addEventListener("visibilitychange", onBeforeUnload);
        }

        window.addEventListener("beforeunload", onBeforeUnload);

        return () => {
            window.removeEventListener("pagehide", onBeforeUnload);
            document.removeEventListener("visibilitychange", onBeforeUnload);
            window.removeEventListener("beforeunload", onBeforeUnload);
            clearTimeout(pageVisibilityTimeout);
        };
    }, [callback]);
}

function getParticipants(groupCall) {
    return [...groupCall.participants];
}

export function useGroupCall(groupCall) {
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
            callDebugger,
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
        callDebugger: null,
    });

    const updateState = (state) =>
        setState((prevState) => ({ ...prevState, ...state }));

    useEffect(() => {
        function onParticipantsChanged() {
            updateState({
                loading: !groupCall.entered,
                entered: groupCall.entered,
                participants: getParticipants(groupCall),
            });
        }

        function onLocalMuteStateChanged(microphoneMuted, localVideoMuted) {
            updateState({
                microphoneMuted,
                localVideoMuted,
            });
        }

        groupCall.on("entered", onParticipantsChanged);
        groupCall.on("active_speaker_changed", onParticipantsChanged);
        groupCall.on("participants_changed", onParticipantsChanged);
        groupCall.on("speaking", onParticipantsChanged);
        groupCall.on("mute_state_changed", onParticipantsChanged);
        groupCall.on("call_replaced", onParticipantsChanged);
        groupCall.on("call_feeds_changed", onParticipantsChanged);
        groupCall.on("local_mute_state_changed", onLocalMuteStateChanged);

        updateState({
            loading: !groupCall.entered,
            entered: groupCall.entered,
            participants: getParticipants(groupCall),
        });

        return () => {
            groupCall.removeListener("active_speaker_changed", onParticipantsChanged);
            groupCall.removeListener("participants_changed", onParticipantsChanged);
            groupCall.removeListener("speaking", onParticipantsChanged);
            groupCall.removeListener("mute_state_changed", onParticipantsChanged);
            groupCall.removeListener("call_replaced", onParticipantsChanged);
            groupCall.removeListener("call_feeds_changed", onParticipantsChanged);
            groupCall.removeListener("local_mute_state_changed", onLocalMuteStateChanged);
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
                    participants: getParticipants(groupCall),
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
        callDebugger: callDebugger,
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
