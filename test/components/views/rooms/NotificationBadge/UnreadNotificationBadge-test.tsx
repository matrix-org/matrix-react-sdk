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

import React from "react";
import { act, render } from "@testing-library/react";
import { MatrixClient, PendingEventOrdering } from "matrix-js-sdk/src/client";
import { NotificationCountType, Room } from "matrix-js-sdk/src/models/room";
import { mocked } from "jest-mock";

import {
    UnreadNotificationBadge,
} from "../../../../../src/components/views/rooms/NotificationBadge/UnreadNotificationBadge";
import { stubClient } from "../../../../test-utils/test-utils";
import { MatrixClientPeg } from "../../../../../src/MatrixClientPeg";

const ROOM_ID = "!roomId:example.org";
let THREAD_ID;

describe("UnreadNotificationBadge", () => {
    let mockClient: MatrixClient;
    let room: Room;

    function getComponent(threadId?: string) {
        return <UnreadNotificationBadge room={room} threadId={threadId} />;
    }

    beforeEach(() => {
        jest.clearAllMocks();

        stubClient();
        mockClient = mocked(MatrixClientPeg.get());

        room = new Room(ROOM_ID, mockClient, mockClient.getUserId() ?? "", {
            pendingEventOrdering: PendingEventOrdering.Detached,
        });
        room.setUnreadNotificationCount(NotificationCountType.Total, 1);
        room.setUnreadNotificationCount(NotificationCountType.Highlight, 0);

        room.setThreadUnreadNotificationCount(THREAD_ID, NotificationCountType.Total, 1);
        room.setThreadUnreadNotificationCount(THREAD_ID, NotificationCountType.Highlight, 0);
    });

    it("renders unread notification badge", () => {
        const { container } = render(getComponent());

        expect(container.querySelector(".mx_NotificationBadge_visible")).toBeTruthy();
        expect(container.querySelector(".mx_NotificationBadge_highlighted")).toBeFalsy();

        act(() => {
            room.setUnreadNotificationCount(NotificationCountType.Highlight, 1);
        });

        expect(container.querySelector(".mx_NotificationBadge_highlighted")).toBeTruthy();
    });

    it("renders unread thread notification badge", () => {
        const { container } = render(getComponent(THREAD_ID));

        expect(container.querySelector(".mx_NotificationBadge_visible")).toBeTruthy();
        expect(container.querySelector(".mx_NotificationBadge_highlighted")).toBeFalsy();

        act(() => {
            room.setThreadUnreadNotificationCount(THREAD_ID, NotificationCountType.Highlight, 1);
        });

        expect(container.querySelector(".mx_NotificationBadge_highlighted")).toBeTruthy();
    });

    it("hides unread notification badge", () => {
        act(() => {
            room.setThreadUnreadNotificationCount(THREAD_ID, NotificationCountType.Total, 0);
            room.setThreadUnreadNotificationCount(THREAD_ID, NotificationCountType.Highlight, 0);
            const { container } = render(getComponent(THREAD_ID));
            expect(container.querySelector(".mx_NotificationBadge_visible")).toBeFalsy();
        });
    });
});
