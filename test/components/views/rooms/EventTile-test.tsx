/*
Copyright 2022 - 2023 The Matrix.org Foundation C.I.C.

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

import * as React from "react";
import { EventType } from "matrix-js-sdk/src/@types/event";
import { MatrixClient, PendingEventOrdering } from "matrix-js-sdk/src/client";
import { MatrixEvent } from "matrix-js-sdk/src/models/event";
import { NotificationCountType, Room } from "matrix-js-sdk/src/models/room";
import { DeviceTrustLevel, UserTrustLevel } from "matrix-js-sdk/src/crypto/CrossSigning";
import { DeviceInfo } from "matrix-js-sdk/src/crypto/deviceinfo";
import { IEncryptedEventInfo } from "matrix-js-sdk/src/crypto/api";
import { render, waitFor, screen, act, fireEvent } from "@testing-library/react";

import EventTile, { EventTileProps } from "../../../../src/components/views/rooms/EventTile";
import MatrixClientContext from "../../../../src/contexts/MatrixClientContext";
import RoomContext, { TimelineRenderingType } from "../../../../src/contexts/RoomContext";
import { MatrixClientPeg } from "../../../../src/MatrixClientPeg";
import { getRoomContext, mkEncryptedEvent, mkEvent, mkMessage, stubClient } from "../../../test-utils";
import { mkThread } from "../../../test-utils/threads";
import DMRoomMap from "../../../../src/utils/DMRoomMap";
import dis from "../../../../src/dispatcher/dispatcher";
import { Action } from "../../../../src/dispatcher/actions";

describe("EventTile", () => {
    const ROOM_ID = "!roomId:example.org";
    let mxEvent: MatrixEvent;
    let room: Room;
    let client: MatrixClient;

    // let changeEvent: (event: MatrixEvent) => void;

    function TestEventTile(props: Partial<EventTileProps>) {
        // const [event] = useState(mxEvent);
        // Give a way for a test to update the event prop.
        // changeEvent = setEvent;

        return <EventTile mxEvent={mxEvent} {...props} />;
    }

    function getComponent(
        overrides: Partial<EventTileProps> = {},
        renderingType: TimelineRenderingType = TimelineRenderingType.Room,
    ) {
        const context = getRoomContext(room, {
            timelineRenderingType: renderingType,
        });
        return render(
            <MatrixClientContext.Provider value={client}>
                <RoomContext.Provider value={context}>
                    <TestEventTile {...overrides} />
                </RoomContext.Provider>
                ,
            </MatrixClientContext.Provider>,
        );
    }

    beforeEach(() => {
        jest.clearAllMocks();

        stubClient();
        client = MatrixClientPeg.get();

        room = new Room(ROOM_ID, client, client.getUserId()!, {
            pendingEventOrdering: PendingEventOrdering.Detached,
        });

        jest.spyOn(client, "getRoom").mockReturnValue(room);
        jest.spyOn(client, "decryptEventIfNeeded").mockResolvedValue();

        mxEvent = mkMessage({
            room: room.roomId,
            user: "@alice:example.org",
            msg: "Hello world!",
            event: true,
        });
    });

    describe("EventTile thread summary", () => {
        beforeEach(() => {
            jest.spyOn(client, "supportsThreads").mockReturnValue(true);
        });

        it("removes the thread summary when thread is deleted", async () => {
            const {
                rootEvent,
                events: [, reply],
            } = mkThread({
                room,
                client,
                authorId: "@alice:example.org",
                participantUserIds: ["@alice:example.org"],
                length: 2, // root + 1 answer
            });
            getComponent(
                {
                    mxEvent: rootEvent,
                },
                TimelineRenderingType.Room,
            );

            await waitFor(() => expect(screen.queryByTestId("thread-summary")).not.toBeNull());

            const redaction = mkEvent({
                event: true,
                type: EventType.RoomRedaction,
                user: "@alice:example.org",
                room: room.roomId,
                redacts: reply.getId(),
                content: {},
            });

            act(() => room.processThreadedEvents([redaction], false));

            await waitFor(() => expect(screen.queryByTestId("thread-summary")).toBeNull());
        });
    });

    describe("EventTile renderingType: ThreadsList", () => {
        beforeEach(() => {
            const { rootEvent } = mkThread({
                room,
                client,
                authorId: "@alice:example.org",
                participantUserIds: ["@alice:example.org"],
            });
            mxEvent = rootEvent;
        });

        it("shows an unread notification badge", () => {
            const { container } = getComponent({}, TimelineRenderingType.ThreadsList);

            // By default, the thread will assume it is read.
            expect(container.getElementsByClassName("mx_NotificationBadge")).toHaveLength(0);

            act(() => {
                room.setThreadUnreadNotificationCount(mxEvent.getId()!, NotificationCountType.Total, 3);
            });

            expect(container.getElementsByClassName("mx_NotificationBadge")).toHaveLength(1);
            expect(container.getElementsByClassName("mx_NotificationBadge_highlighted")).toHaveLength(0);

            act(() => {
                room.setThreadUnreadNotificationCount(mxEvent.getId()!, NotificationCountType.Highlight, 1);
            });

            expect(container.getElementsByClassName("mx_NotificationBadge")).toHaveLength(1);
            expect(container.getElementsByClassName("mx_NotificationBadge_highlighted")).toHaveLength(1);
        });
    });

    describe("EventTile in the right panel", () => {
        beforeAll(() => {
            const dmRoomMap: DMRoomMap = {
                getUserIdForRoomId: jest.fn(),
            } as unknown as DMRoomMap;
            DMRoomMap.setShared(dmRoomMap);
        });

        it("renders the room name for notifications", () => {
            const { container } = getComponent({}, TimelineRenderingType.Notification);
            expect(container.getElementsByClassName("mx_EventTile_details")[0]).toHaveTextContent(
                "@alice:example.org in !roomId:example.org",
            );
        });

        it("renders the sender for the thread list", () => {
            const { container } = getComponent({}, TimelineRenderingType.ThreadsList);
            expect(container.getElementsByClassName("mx_EventTile_details")[0]).toHaveTextContent("@alice:example.org");
        });

        it.each([
            [TimelineRenderingType.Notification, Action.ViewRoom],
            [TimelineRenderingType.ThreadsList, Action.ShowThread],
        ])("type %s dispatches %s", (renderingType, action) => {
            jest.spyOn(dis, "dispatch");

            const { container } = getComponent({}, renderingType);

            fireEvent.click(container.querySelector("li")!);

            expect(dis.dispatch).toHaveBeenCalledWith(
                expect.objectContaining({
                    action,
                }),
            );
        });
    });
    describe("Event verification", () => {
        // data for our stubbed getEventEncryptionInfo: a map from event id to result
        const eventToEncryptionInfoMap = new Map<string, IEncryptedEventInfo>();

        const TRUSTED_DEVICE = DeviceInfo.fromStorage({}, "TRUSTED_DEVICE");
        const UNTRUSTED_DEVICE = DeviceInfo.fromStorage({}, "UNTRUSTED_DEVICE");

        beforeEach(() => {
            eventToEncryptionInfoMap.clear();

            // a mocked version of getEventEncryptionInfo which will pick its result from `eventToEncryptionInfoMap`
            client.getEventEncryptionInfo = (event) => eventToEncryptionInfoMap.get(event.getId()!)!;

            // a mocked version of checkUserTrust which always says the user is trusted (we do our testing via
            // unverified devices).
            const trustedUserTrustLevel = new UserTrustLevel(true, true, true);
            client.checkUserTrust = (_userId) => trustedUserTrustLevel;

            // a version of checkDeviceTrust which says that TRUSTED_DEVICE is trusted, and others are not.
            const trustedDeviceTrustLevel = DeviceTrustLevel.fromUserTrustLevel(trustedUserTrustLevel, true, false);
            const untrustedDeviceTrustLevel = DeviceTrustLevel.fromUserTrustLevel(trustedUserTrustLevel, false, false);
            client.checkDeviceTrust = (userId, deviceId) => {
                if (deviceId === TRUSTED_DEVICE.deviceId) {
                    return trustedDeviceTrustLevel;
                } else {
                    return untrustedDeviceTrustLevel;
                }
            };
        });

        it("shows a warning for an event from an unverified device", async () => {
            mxEvent = await mkEncryptedEvent({
                plainContent: { msgtype: "m.text", body: "msg1" },
                plainType: "m.room.message",
                user: "@alice:example.org",
                room: room.roomId,
            });
            eventToEncryptionInfoMap.set(mxEvent.getId()!, {
                authenticated: true,
                sender: UNTRUSTED_DEVICE,
            } as IEncryptedEventInfo);

            const { container } = getComponent();

            const eventTiles = container.getElementsByClassName("mx_EventTile");
            expect(eventTiles).toHaveLength(1);
            const eventTile = eventTiles[0];

            expect(eventTile.classList).toContain("mx_EventTile_unverified");

            // there should be a warning shield
            expect(container.getElementsByClassName("mx_EventTile_e2eIcon")).toHaveLength(1);
            expect(container.getElementsByClassName("mx_EventTile_e2eIcon")[0].classList).toContain(
                "mx_EventTile_e2eIcon_warning",
            );
        });

        it("shows no shield for a verified event", async () => {
            mxEvent = await mkEncryptedEvent({
                plainContent: { msgtype: "m.text", body: "msg1" },
                plainType: "m.room.message",
                user: "@alice:example.org",
                room: room.roomId,
            });
            eventToEncryptionInfoMap.set(mxEvent.getId()!, {
                authenticated: true,
                sender: TRUSTED_DEVICE,
            } as IEncryptedEventInfo);

            const { container } = getComponent();

            const eventTiles = container.getElementsByClassName("mx_EventTile");
            expect(eventTiles).toHaveLength(1);
            const eventTile = eventTiles[0];

            expect(eventTile.classList).toContain("mx_EventTile_verified");

            // there should be no warning
            expect(container.getElementsByClassName("mx_EventTile_e2eIcon")).toHaveLength(0);
        });

        it("should update the warning when the event is edited", async () => {
            // we start out with an event from the trusted device
            mxEvent = await mkEncryptedEvent({
                plainContent: { msgtype: "m.text", body: "msg1" },
                plainType: "m.room.message",
                user: "@alice:example.org",
                room: room.roomId,
            });
            eventToEncryptionInfoMap.set(mxEvent.getId()!, {
                authenticated: true,
                sender: TRUSTED_DEVICE,
            } as IEncryptedEventInfo);

            const { container } = getComponent();

            const eventTiles = container.getElementsByClassName("mx_EventTile");
            expect(eventTiles).toHaveLength(1);
            const eventTile = eventTiles[0];

            expect(eventTile.classList).toContain("mx_EventTile_verified");

            // there should be no warning
            expect(container.getElementsByClassName("mx_EventTile_e2eIcon")).toHaveLength(0);

            // then we replace the event with one from the unverified device
            const replacementEvent = await mkEncryptedEvent({
                plainContent: { msgtype: "m.text", body: "msg1" },
                plainType: "m.room.message",
                user: "@alice:example.org",
                room: room.roomId,
            });
            eventToEncryptionInfoMap.set(replacementEvent.getId()!, {
                authenticated: true,
                sender: UNTRUSTED_DEVICE,
            } as IEncryptedEventInfo);

            act(() => {
                mxEvent.makeReplaced(replacementEvent);
            });

            // check it was updated
            expect(eventTile.classList).toContain("mx_EventTile_unverified");
            expect(container.getElementsByClassName("mx_EventTile_e2eIcon")).toHaveLength(1);
            expect(container.getElementsByClassName("mx_EventTile_e2eIcon")[0].classList).toContain(
                "mx_EventTile_e2eIcon_warning",
            );
        });

        it("should update the warning when the event is replaced with an unencrypted one", async () => {
            jest.spyOn(client, "isRoomEncrypted").mockReturnValue(true);

            // we start out with an event from the trusted device
            mxEvent = await mkEncryptedEvent({
                plainContent: { msgtype: "m.text", body: "msg1" },
                plainType: "m.room.message",
                user: "@alice:example.org",
                room: room.roomId,
            });
            eventToEncryptionInfoMap.set(mxEvent.getId()!, {
                authenticated: true,
                sender: TRUSTED_DEVICE,
            } as IEncryptedEventInfo);

            const { container } = getComponent();

            const eventTiles = container.getElementsByClassName("mx_EventTile");
            expect(eventTiles).toHaveLength(1);
            const eventTile = eventTiles[0];

            expect(eventTile.classList).toContain("mx_EventTile_verified");

            // there should be no warning
            expect(container.getElementsByClassName("mx_EventTile_e2eIcon")).toHaveLength(0);

            // then we replace the event with an unencrypted one
            const replacementEvent = await mkMessage({
                msg: "msg2",
                user: "@alice:example.org",
                room: room.roomId,
                event: true,
            });

            act(() => {
                mxEvent.makeReplaced(replacementEvent);
            });

            // check it was updated
            expect(eventTile.classList).not.toContain("mx_EventTile_verified");
            expect(container.getElementsByClassName("mx_EventTile_e2eIcon")).toHaveLength(1);
            expect(container.getElementsByClassName("mx_EventTile_e2eIcon")[0].classList).toContain(
                "mx_EventTile_e2eIcon_warning",
            );
        });
    });
});
