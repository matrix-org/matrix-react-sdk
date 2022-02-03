import React from "react";
import { CallFeed } from "matrix-js-sdk/src/webrtc/callFeed";
import { VideoTileContainer } from "./VideoTileContainer";
import { IVideoGridItem } from "./VideoGrid";

interface ISimpleVideoGridProps {
    items: IVideoGridItem<{ callFeed: CallFeed }>[];
}

export default function SimpleVideoGrid({ items }: ISimpleVideoGridProps) {
    return (
        <div className="mx_VideoGrid mx_simpleVideoGrid">
            { items.map((item, i) => {
                return (
                    <VideoTileContainer
                        key={item.id}
                        item={item}
                        width={426}
                        height={240}
                    />
                );
            }) }
        </div>
    );
}
