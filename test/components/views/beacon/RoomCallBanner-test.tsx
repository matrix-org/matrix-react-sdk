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
import { act } from "react-dom/test-utils";
import { mount } from "enzyme";
import {
    Room,
    PendingEventOrdering,
    MatrixClient,
    RoomMember,
    RoomStateEvent,
} from "matrix-js-sdk/src/matrix";
import {
    mkRoomMember,
    MockedCall,
    setupAsyncStoreWithClient,
    stubClient,
    useMockedCalls,
} from "../../../test-utils";
import RoomCallBanner from "../../../../src/components/views/beacon/RoomCallBanner";
import { CallStore } from "../../../../src/stores/CallStore";
import { CallView as _CallView } from "../../../../src/components/views/voip/CallView";

import { ClientWidgetApi, Widget } from "matrix-widget-api";
import { WidgetMessagingStore } from "../../../../src/stores/widgets/WidgetMessagingStore";
import {
    cleanup,
    render,
    screen,
} from "@testing-library/react";
import { mocked, Mocked } from "jest-mock";
import { MatrixClientPeg } from "../../../../src/MatrixClientPeg";
import { RoomViewStore } from "../../../../src/stores/RoomViewStore";


describe("<RoomLiveShareWarning />", () => {
    let client: Mocked<MatrixClient>;
    let room: Room;
    let alice: RoomMember;
    useMockedCalls();
    

    const defaultProps = {
        roomId: "!1:example.org",
    };
    const getComponent = (props = {}) => {
        let component;
        // component updates on render therefore wrap in act
        act(() => {
            component = mount(<RoomCallBanner {...defaultProps} {...props} />);
        });
        return component;
    };

    beforeEach(() => {
        stubClient();

        client = mocked(MatrixClientPeg.get());

        room = new Room("!1:example.org", client, "@alice:example.org", {
            pendingEventOrdering: PendingEventOrdering.Detached,
        });
        alice = mkRoomMember(room.roomId, "@alice:example.org");
        jest.spyOn(room, "getMember").mockImplementation((userId) =>
            userId === alice.userId ? alice : null
        );

        client.getRoom.mockImplementation((roomId) =>
            roomId === room.roomId ? room : null
        );
        client.getRooms.mockReturnValue([room]);
        client.reEmitter.reEmit(room, [RoomStateEvent.Events]);

        setupAsyncStoreWithClient(CallStore.instance, client);
        setupAsyncStoreWithClient(WidgetMessagingStore.instance, client);
    });

    afterEach(async () => {
        client.reEmitter.stopReEmitting(room, [RoomStateEvent.Events]);
    });

    const renderBanner = async (props = {}): Promise<void> => {
        render(<RoomCallBanner {...defaultProps} {...props} />);
        await act(() => Promise.resolve()); // Let effects settle
    };

    it("renders nothing when there is no call", async () => {
        
        let component = getComponent();
        expect(component.html()).toBe(null);
    });

    describe("call started", () => {
        let call: MockedCall;
        let widget: Widget;

        beforeEach(() => {
            MockedCall.create(room, "1");
            const maybeCall = CallStore.instance.getCall(room.roomId);
            if (!(maybeCall instanceof MockedCall))
                throw new Error("Failed to create call");
            call = maybeCall;

            widget = new Widget(call.widget);
            WidgetMessagingStore.instance.storeMessaging(widget, room.roomId, {
                stop: () => {},
            } as unknown as ClientWidgetApi);
        });
        afterEach(() => {
            cleanup(); // Unmount before we do any cleanup that might update the component
            call.destroy();
            WidgetMessagingStore.instance.stopMessaging(widget, room.roomId);
        });

        it("renders if there is a call", async () => {
            await renderBanner();
            let videoCallLabel = await screen.findByText("Video call");
            expect(videoCallLabel.innerHTML).toBe("Video call");
        });

        it("show Join button if the user has not joined", async () => {
            await renderBanner();
            let videoCallLabel = await screen.findByText("Join");
            expect(videoCallLabel.innerHTML).toBe("Join");
        });
        it("dont show banner if the call is shown", async () => {
            jest.spyOn(RoomViewStore.instance, 'isViewingCall').mockReturnValue(false);
            await renderBanner();
            let videoCallLabel = await screen.findByText("Video call");
            expect(videoCallLabel.innerHTML).toBe("Video call");
        });
    });
    // TODO: add live location share warning test (should not render if there is an active live location share)
});
