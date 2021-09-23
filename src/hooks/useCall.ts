import { useState, useEffect } from "react";
import { CallFeed } from "matrix-js-sdk/src/webrtc/callFeed";
import { MatrixCall, CallEvent } from "matrix-js-sdk/src/webrtc/call";
import { RoomMember } from "matrix-js-sdk";

interface ICallState {
    opponentMember: RoomMember;
    localUsermediaFeed?: CallFeed;
    remoteUsermediaFeed?: CallFeed;
    localScreensharingFeed?: CallFeed;
    remoteScreensharingFeed?: CallFeed;
    localFeeds: CallFeed[];
    remoteFeeds: CallFeed[];
    feeds: CallFeed[];
}

function getCallState(call: MatrixCall): ICallState {
    return {
        opponentMember: call.getOpponentMember(),
        localUsermediaFeed: call.localUsermediaFeed,
        remoteUsermediaFeed: call.remoteUsermediaFeed,
        localScreensharingFeed: call.localScreensharingFeed,
        remoteScreensharingFeed: call.remoteScreensharingFeed,
        localFeeds: call.getLocalFeeds(),
        remoteFeeds: call.getRemoteFeeds(),
        feeds: call.getFeeds(),
    };
}

export function useCall(call: MatrixCall): ICallState {
    const [state, setState] = useState<ICallState>(() => getCallState(call));

    useEffect(() => {
        function updateState() {
            setState(getCallState(call));
        }

        call.on(CallEvent.FeedsChanged, updateState);

        updateState();

        return () => {
            call.removeListener(CallEvent.FeedsChanged, updateState);
        };
    }, [call]);

    return state;
}
