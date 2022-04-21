import React, { useCallback, useState } from "react";

import ReadReceiptMarker, { IReadReceiptInfo } from "./ReadReceiptMarker";
import { toRem } from "../../../utils/units";
import { IReadReceiptProps } from "./EventTile";

interface IProps {
    readReceipts: IReadReceiptProps[];
    readReceiptMap: { [userId: string]: IReadReceiptInfo };
    checkUnmounting: () => boolean;
    suppressAnimation: boolean;
    isTwelveHour: boolean;
}

const MAX_READ_AVATARS = 3;

export function ReadReceiptGroup(
    { readReceipts, readReceiptMap, checkUnmounting, suppressAnimation, isTwelveHour }: IProps,
) {
    const [allReadAvatars, setAllReadAvatars] = useState<boolean>(false);
    const toggleAllReadAvatars = useCallback(
        () => setAllReadAvatars(!allReadAvatars),
        [allReadAvatars],
    );

    // return early if there are no read receipts
    if (readReceipts.length === 0) {
        // We currently must include `mx_EventTile_readAvatars` in the DOM
        // of all events, as it is the positioned parent of the animated
        // read receipts. We can't let it unmount when a receipt moves
        // events, so for now we mount it for all events. Without it, the
        // animation will start from the top of the timeline (because it
        // lost its container).
        // See also https://github.com/vector-im/element-web/issues/17561
        return (
            <div className="mx_EventTile_msgOption">
                <button className="mx_EventTile_readAvatars" />
            </div>
        );
    }

    const avatars = [];
    const receiptOffset = 15;
    let left = 0;

    for (let i = 0; i < readReceipts.length; ++i) {
        const receipt = readReceipts[i];

        let hidden = true;
        if ((i < MAX_READ_AVATARS) || allReadAvatars) {
            hidden = false;
        }
        // TODO: we keep the extra read avatars in the dom to make animation simpler
        // we could optimise this to reduce the dom size.

        // If hidden, set offset equal to the offset of the final visible avatar or
        // else set it proportional to index
        left = (hidden ? MAX_READ_AVATARS - 1 : i) * -receiptOffset;

        const userId = receipt.userId;
        let readReceiptInfo: IReadReceiptInfo;

        if (readReceiptMap) {
            readReceiptInfo = readReceiptMap[userId];
            if (!readReceiptInfo) {
                readReceiptInfo = {};
                readReceiptMap[userId] = readReceiptInfo;
            }
        }

        // add to the start so the most recent is on the end (ie. ends up rightmost)
        avatars.unshift(
            <ReadReceiptMarker
                key={userId}
                member={receipt.roomMember}
                fallbackUserId={userId}
                leftOffset={left}
                hidden={hidden}
                readReceiptInfo={readReceiptInfo}
                checkUnmounting={checkUnmounting}
                suppressAnimation={suppressAnimation}
                onClick={toggleAllReadAvatars}
                timestamp={receipt.ts}
                showTwelveHour={isTwelveHour}
            />,
        );
    }

    let remText: JSX.Element;
    if (!allReadAvatars) {
        const remainder = readReceipts.length - MAX_READ_AVATARS;
        if (remainder > 0) {
            remText = (
                <span className="mx_EventTile_readAvatarRemainder"
                    onClick={toggleAllReadAvatars}
                    style={{ right: "calc(" + toRem(-left) + " + " + receiptOffset + "px)" }}
                    aria-live="off">
                    { remainder }+
                </span>
            );
        }
    }

    return (
        <div className="mx_EventTile_msgOption">
            <button className="mx_EventTile_readAvatars">
                { remText }
                { avatars }
            </button>
        </div>
    );
}
