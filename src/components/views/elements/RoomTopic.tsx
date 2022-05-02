/*
Copyright 2021 The Matrix.org Foundation C.I.C.

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

import React, { ReactNode, useEffect, useState } from "react";
import { EventType } from "matrix-js-sdk/src/@types/event";
import { Room } from "matrix-js-sdk/src/models/room";
import { RoomStateEvent } from "matrix-js-sdk/src/models/room-state";
import { MatrixEvent } from "matrix-js-sdk/src/models/event";
import { parseTopicContent } from "matrix-js-sdk/src/content-helpers";

import { useTypedEventEmitter } from "../../../hooks/useEventEmitter";
import { linkifyElement, topicToHtml } from "../../../HtmlUtils";

interface IProps {
    room?: Room;
    children?(title: string, body: ReactNode, ref: (element: HTMLElement) => void): JSX.Element;
}

export const getTopic = room => {
    const content = room?.currentState?.getStateEvents(EventType.RoomTopic, "")?.getContent();
    return !!content ? parseTopicContent(content) : null;
};

const RoomTopic = ({ room, children }: IProps): JSX.Element => {
    const [topic, setTopic] = useState(getTopic(room));
    useTypedEventEmitter(room.currentState, RoomStateEvent.Events, (ev: MatrixEvent) => {
        if (ev.getType() !== EventType.RoomTopic) return;
        setTopic(getTopic(room));
    });
    useEffect(() => {
        setTopic(getTopic(room));
    }, [room]);

    const ref = e => e && linkifyElement(e);
    const body = topicToHtml(topic?.text, topic?.html, ref);

    if (children) return children(topic?.text, body, ref);
    return <span ref={ref}>{ body }</span>;
};

export default RoomTopic;
