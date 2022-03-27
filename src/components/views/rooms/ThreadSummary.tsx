/*
Copyright 2022 The Matrix.org Foundation C.I.C.

Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

    http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.
*/

import React, { useContext } from "react";
import { Thread, ThreadEvent } from "matrix-js-sdk/src/models/thread";
import { MatrixEvent, MatrixEventEvent } from "matrix-js-sdk/src/models/event";

import { _t } from "../../../languageHandler";
import { CardContext } from "../right_panel/BaseCard";
import AccessibleButton, { ButtonEvent } from "../elements/AccessibleButton";
import { showThread } from "../../../dispatcher/dispatch-actions/threads";
import PosthogTrackers from "../../../PosthogTrackers";
import { useTypedEventEmitterState } from "../../../hooks/useEventEmitter";
import RoomContext from "../../../contexts/RoomContext";
import { MessagePreviewStore } from "../../../stores/room-list/MessagePreviewStore";
import MemberAvatar from "../avatars/MemberAvatar";
import { useAsyncMemo } from "../../../hooks/useAsyncMemo";
import MatrixClientContext from "../../../contexts/MatrixClientContext";

interface IProps {
    mxEvent: MatrixEvent;
    thread: Thread;
}

const ThreadSummary = ({ mxEvent, thread }: IProps) => {
    const roomContext = useContext(RoomContext);
    const cardContext = useContext(CardContext);
    const count = useTypedEventEmitterState(thread, ThreadEvent.Update, () => thread.length);
    if (!count) return null; // We don't want to show a thread summary if the thread doesn't have replies yet

    let countSection: string | number = count;
    if (!roomContext.narrow) {
        countSection = _t("%(count)s reply", { count });
    }

    return (
        <AccessibleButton
            className="mx_ThreadInfo"
            onClick={(ev: ButtonEvent) => {
                showThread({
                    rootEvent: mxEvent,
                    push: cardContext.isCard,
                });
                PosthogTrackers.trackInteraction("WebRoomTimelineThreadSummaryButton", ev);
            }}
            aria-label={_t("Open thread")}
        >
            <span className="mx_ThreadInfo_threads-amount">
                { countSection }
            </span>
            <ThreadMessagePreview thread={thread} showDisplayname={!roomContext.narrow} />
            <div className="mx_ThreadInfo_chevron" />
        </AccessibleButton>
    );
};

interface IPreviewProps {
    thread: Thread;
    showDisplayname?: boolean;
}

export const ThreadMessagePreview = ({ thread, showDisplayname = false }: IPreviewProps) => {
    const cli = useContext(MatrixClientContext);

    const lastReply = useTypedEventEmitterState(thread, ThreadEvent.Update, () => thread.replyToEvent);
    // track the replacing event id as a means to regenerate the thread message preview
    const replacingEventId = useTypedEventEmitterState(
        lastReply,
        MatrixEventEvent.Replaced,
        () => lastReply?.replacingEventId(),
    );

    const preview = useAsyncMemo(async () => {
        if (!lastReply) return;
        await cli.decryptEventIfNeeded(lastReply);
        return MessagePreviewStore.instance.generatePreviewForEvent(lastReply);
    }, [lastReply, replacingEventId]);
    if (!preview) return null;

    const sender = thread.roomState.getSentinelMember(lastReply.getSender());
    return <>
        <MemberAvatar
            member={sender}
            fallbackUserId={lastReply.getSender()}
            width={24}
            height={24}
            className="mx_ThreadInfo_avatar"
        />
        { showDisplayname && <div className="mx_ThreadInfo_sender">
            { sender?.name ?? lastReply.getSender() }
        </div> }
        <div className="mx_ThreadInfo_content">
            <span className="mx_ThreadInfo_message-preview">
                { preview }
            </span>
        </div>
    </>;
};

export default ThreadSummary;
