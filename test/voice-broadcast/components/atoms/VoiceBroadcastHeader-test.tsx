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
import { Container } from "react-dom";
import { RoomMember } from "matrix-js-sdk/src/matrix";
import { render, RenderResult } from "@testing-library/react";

import MemberAvatar from "../../../../src/components/views/avatars/MemberAvatar";
import { VoiceBroadcastHeader } from "../../../../src/voice-broadcast";
import { Icon } from "../../../../src/components/atoms/Icon";

jest.mock("../../../../src/components/views/avatars/MemberAvatar", () => ({
    __esModule: true,
    default: ({ member, fallbackUserId }: React.ComponentProps<typeof MemberAvatar>) => {
        return <div data-testid="member-avatar">
            { member.name },
            { fallbackUserId }
        </div>;
    },
}));

jest.mock("../../../../src/voice-broadcast/components/atoms/LiveBadge", () => ({
    LiveBadge: () => {
        return <div data-testid="live-badge" />;
    },
}));

jest.mock("../../../../src/components/atoms/Icon", () => ({
    ...jest.requireActual("../../../../src/components/atoms/Icon") as object,
    Icon: ({ type, colour }: React.ComponentProps<typeof Icon>) => {
        return <div data-testid="icon">
            type: { type },
            colour: { colour }
        </div>;
    },
}));

describe("VoiceBroadcastHeader", () => {
    const userId = "@user:example.com";
    const roomId = "!room:example.com";
    const roomName = "test room";
    const sender = new RoomMember(roomId, userId);
    let container: Container;

    const renderHeader = (live: boolean, showBroadcast: boolean = undefined): RenderResult => {
        return render(<VoiceBroadcastHeader
            live={live}
            sender={sender}
            roomName={roomName}
            showBroadcast={showBroadcast}
        />);
    };

    beforeAll(() => {
        sender.name = "test user";
    });

    describe("when rendering a live broadcast header with broadcast info", () => {
        beforeEach(() => {
            container = renderHeader(true, true).container;
        });

        it("should render the header with a live badge", () => {
            expect(container).toMatchSnapshot();
        });
    });

    describe("when rendering a non-live broadcast header", () => {
        beforeEach(() => {
            container = renderHeader(false).container;
        });

        it("should render the header without a live badge", () => {
            expect(container).toMatchSnapshot();
        });
    });
});
