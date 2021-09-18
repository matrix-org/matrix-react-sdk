import React, { useState, useCallback } from "react";
import { GroupCall } from "matrix-js-sdk/src/webrtc/groupCall";
import { useGroupCall } from "./GroupCallView/useGroupCall";
import { VideoGrid } from "./GroupCallView/VideoGrid";

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

export function GroupCallView({ groupCall, pipMode }: IProps) {
    const { participants } = useGroupCall(groupCall);
    const [layout] = useRoomLayout();

    console.log("group call", participants, groupCall);

    return <VideoGrid participants={participants} layout={layout} />;
}
