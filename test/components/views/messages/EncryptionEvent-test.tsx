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
import { mocked } from "jest-mock";
import { fireEvent, render, screen } from "@testing-library/react";
import { MatrixClient, MatrixEvent, Room, RoomMember } from "matrix-js-sdk/src/matrix";

import { Action } from "../../../../src/dispatcher/actions";
import dispatcher from "../../../../src/dispatcher/dispatcher";
import EncryptionEvent from "../../../../src/components/views/messages/EncryptionEvent";
import { createTestClient, mkMessage } from "../../../test-utils";
import { MatrixClientPeg } from "../../../../src/MatrixClientPeg";
import { LocalRoom } from "../../../../src/models/LocalRoom";
import DMRoomMap from "../../../../src/utils/DMRoomMap";
import MatrixClientContext from "../../../../src/contexts/MatrixClientContext";

const renderEncryptionEvent = (client: MatrixClient, event: MatrixEvent) => {
    render(
        <MatrixClientContext.Provider value={client}>
            <EncryptionEvent mxEvent={event} />
        </MatrixClientContext.Provider>,
    );
};

const checkTexts = (title: string, subTitle: string) => {
    screen.getByText(title);
    screen.getByText(subTitle);
};

describe("EncryptionEvent", () => {
    const roomId = "!room:example.com";
    const algorithm = "m.megolm.v1.aes-sha2";
    let client: MatrixClient;
    let event: MatrixEvent;

    beforeEach(() => {
        jest.clearAllMocks();
        client = createTestClient();
        jest.spyOn(MatrixClientPeg, "get").mockReturnValue(client);
        jest.spyOn(MatrixClientPeg, "safeGet").mockReturnValue(client);
        event = mkMessage({
            event: true,
            room: roomId,
            user: client.getUserId()!,
        });
        jest.spyOn(DMRoomMap, "shared").mockReturnValue({
            getUserIdForRoomId: jest.fn(),
        } as unknown as DMRoomMap);
    });

    describe("for an encrypted room", () => {
        beforeEach(() => {
            event.event.content!.algorithm = algorithm;
            mocked(client.isRoomEncrypted).mockReturnValue(true);
            const room = new Room(roomId, client, client.getUserId()!);
            mocked(client.getRoom).mockReturnValue(room);
        });

        it("should show the expected texts", () => {
            renderEncryptionEvent(client, event);
            checkTexts(
                "Encryption enabled",
                "Messages in this room are end-to-end encrypted. " +
                    "When people join, you can verify them in their profile, just tap on their profile picture.",
            );
        });

        describe("with same previous algorithm", () => {
            beforeEach(() => {
                jest.spyOn(event, "getPrevContent").mockReturnValue({
                    algorithm: algorithm,
                });
            });

            it("should show the expected texts", () => {
                renderEncryptionEvent(client, event);
                checkTexts("Encryption enabled", "Some encryption parameters have been changed.");
            });
        });

        describe("with unknown algorithm", () => {
            beforeEach(() => {
                event.event.content!.algorithm = "unknown";
            });

            it("should show the expected texts", () => {
                renderEncryptionEvent(client, event);
                checkTexts("Encryption enabled", "Ignored attempt to disable encryption");
            });
        });
    });

    describe("for an unencrypted room", () => {
        beforeEach(() => {
            mocked(client.isRoomEncrypted).mockReturnValue(false);
            renderEncryptionEvent(client, event);
        });

        it("should show the expected texts", () => {
            expect(client.isRoomEncrypted).toHaveBeenCalledWith(roomId);
            checkTexts("Encryption not enabled", "The encryption used by this room isn't supported.");
        });
    });

    describe("for an encrypted DM room", () => {
        const otherUserId = "@alice:example.com";
        const otherUserMember = new RoomMember(roomId, otherUserId);
        const dispatchSpy = jest.spyOn(dispatcher, "dispatch");

        beforeEach(() => {
            // Create a new test room.
            const room = new Room(roomId, client, client.getUserId()!);
            mocked(client.getRoom).mockReturnValue(room);

            // Make client think that the room is encrypted.
            event.event.content!.algorithm = algorithm;
            mocked(client.isRoomEncrypted).mockReturnValue(true);

            // Make the client think there is another user in the room,
            // and that it is a direct message room.
            jest.spyOn(DMRoomMap, "shared").mockReturnValue({
                getUserIdForRoomId: (_roomId: string) => otherUserId,
            } as unknown as DMRoomMap);

            // More faking of the other user in the room.
            jest.spyOn(room, "getMember").mockImplementation((_: string) => otherUserMember);
        });

        it("should show a link to the user's profile to verify them with", () => {
            renderEncryptionEvent(client, event);

            // Check that the expected title of the encrypted DM card exists and has the expected text.
            screen.getByText("Encryption enabled");

            // Check that the link to the user's profile in the subtitle exists.
            const linkToProfile = screen.getByText("their profile");

            // Check that the non-linkified text in the subtitle is correct.
            // Then check that the link to the profile is contained within the card subtitle.
            expect(
                screen.getByText(`Messages here are end-to-end encrypted. Verify @alice:example.com in`, {
                    exact: false,
                }),
            ).toContainElement(linkToProfile);

            // Click on the link to the user's profile.
            fireEvent.click(linkToProfile);

            // Ensure a dispatch to open the user's profile was emitted.
            expect(dispatchSpy).toHaveBeenCalledWith({
                action: Action.ViewUser,
                member: otherUserMember,
                push: false,
            });
        });
    });

    describe("for an encrypted local room", () => {
        beforeEach(() => {
            event.event.content!.algorithm = algorithm;
            mocked(client.isRoomEncrypted).mockReturnValue(true);
            const localRoom = new LocalRoom(roomId, client, client.getUserId()!);
            mocked(client.getRoom).mockReturnValue(localRoom);
            renderEncryptionEvent(client, event);
        });

        it("should show the expected texts", () => {
            expect(client.isRoomEncrypted).toHaveBeenCalledWith(roomId);
            checkTexts("Encryption enabled", "Messages in this chat will be end-to-end encrypted.");
        });
    });
});
