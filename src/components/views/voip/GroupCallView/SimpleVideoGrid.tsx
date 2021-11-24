import React from "react";
import { CallFeed } from "matrix-js-sdk/src/webrtc/callFeed";
import VideoTile from "./VideoTile";

interface ISimpleVideoGridItem {
    id: string;
    callFeed: CallFeed;
    isActiveSpeaker: boolean;
}

interface ISimpleVideoGridProps {
    items: ISimpleVideoGridItem[];
}

export default function SimpleVideoGrid({ items }: ISimpleVideoGridProps) {
    return (
        <div className="mx_VideoGrid mx_simpleVideoGrid">
            { items.map(({ id, callFeed }, i) => {
                return (
                    <VideoTile
                        key={id}
                        disableSpeakingHighlight={items.length < 3}
                        usermediaCallFeed={callFeed}
                    />
                );
            }) }
        </div>
    );
}
