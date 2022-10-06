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

import { mocked, Mocked } from "jest-mock";
import { MatrixClient } from "matrix-js-sdk/src/matrix";
import { IDevice } from "matrix-js-sdk/src/crypto/deviceinfo";
import { RoomType } from "matrix-js-sdk/src/@types/event";
import { logger } from "matrix-js-sdk/src/logger";

import { stubClient, setupAsyncStoreWithClient, mockPlatformPeg } from "./test-utils";
import { MatrixClientPeg } from "../src/MatrixClientPeg";
import WidgetStore from "../src/stores/WidgetStore";
import WidgetUtils from "../src/utils/WidgetUtils";
import { JitsiCall, ElementCall } from "../src/models/Call";
import createRoom, { canEncryptToAllUsers } from '../src/createRoom';

describe("createRoom", () => {
    const userId1 = "@user1:example.com";
    const userId2 = "@user2:example.com";
    mockPlatformPeg();
    let client: Mocked<MatrixClient>;

    const itShouldNotDownloadKeys = () => {
        it("should not downloadKeys", () => {
            expect(client.downloadKeys).not.toHaveBeenCalled();
        });
    };

    const createRoomWithInvites = async () => {
        await createRoom({
            encryption: true,
            createOpts: {
                invite: [
                    userId1,
                    userId2,
                ],
            },
        });
    };

    beforeEach(() => {
        stubClient();
        client = mocked(MatrixClientPeg.get());
        jest.spyOn(logger, "warn");
    });

    afterEach(() => jest.clearAllMocks());

    it("sets up Jitsi video rooms correctly", async () => {
        setupAsyncStoreWithClient(WidgetStore.instance, client);
        jest.spyOn(WidgetUtils, "waitForRoomWidget").mockResolvedValue();
        const createCallSpy = jest.spyOn(JitsiCall, "create");

        const userId = client.getUserId()!;
        const roomId = await createRoom({ roomType: RoomType.ElementVideo });

        const [[{
            power_level_content_override: {
                users: {
                    [userId]: userPower,
                },
                events: {
                    "im.vector.modular.widgets": widgetPower,
                    [JitsiCall.MEMBER_EVENT_TYPE]: callMemberPower,
                },
            },
        }]] = client.createRoom.mock.calls as any; // no good type

        // We should have had enough power to be able to set up the widget
        expect(userPower).toBeGreaterThanOrEqual(widgetPower);
        // and should have actually set it up
        expect(createCallSpy).toHaveBeenCalled();

        // All members should be able to update their connected devices
        expect(callMemberPower).toEqual(0);
        // widget should be immutable for admins
        expect(widgetPower).toBeGreaterThan(100);
        // and we should have been reset back to admin
        expect(client.setPowerLevel).toHaveBeenCalledWith(roomId, userId, 100, undefined);
    });

    it("sets up Element video rooms correctly", async () => {
        const userId = client.getUserId()!;
        const createCallSpy = jest.spyOn(ElementCall, "create");
        const roomId = await createRoom({ roomType: RoomType.UnstableCall });

        const [[{
            power_level_content_override: {
                users: {
                    [userId]: userPower,
                },
                events: {
                    [ElementCall.CALL_EVENT_TYPE.name]: callPower,
                    [ElementCall.MEMBER_EVENT_TYPE.name]: callMemberPower,
                },
            },
        }]] = client.createRoom.mock.calls as any; // no good type

        // We should have had enough power to be able to set up the call
        expect(userPower).toBeGreaterThanOrEqual(callPower);
        // and should have actually set it up
        expect(createCallSpy).toHaveBeenCalled();

        // All members should be able to update their connected devices
        expect(callMemberPower).toEqual(0);
        // call should be immutable for admins
        expect(callPower).toBeGreaterThan(100);
        // and we should have been reset back to admin
        expect(client.setPowerLevel).toHaveBeenCalledWith(roomId, userId, 100, undefined);
    });

    it("doesn't create calls in non-video-rooms", async () => {
        const createJitsiCallSpy = jest.spyOn(JitsiCall, "create");
        const createElementCallSpy = jest.spyOn(ElementCall, "create");

        await createRoom({});

        expect(createJitsiCallSpy).not.toHaveBeenCalled();
        expect(createElementCallSpy).not.toHaveBeenCalled();
    });

    describe("when creating a non-encrypted room", () => {
        beforeEach(async () => {
            await createRoom({});
        });

        itShouldNotDownloadKeys();
    });

    describe("when creating an encrypted room without createOpts", () => {
        beforeEach(async () => {
            await createRoom({ encryption: true });
        });

        itShouldNotDownloadKeys();
    });

    describe("when creating an encrypted room without createOpts.invite", () => {
        beforeEach(async () => {
            await createRoom({ encryption: true, createOpts: { } });
        });

        itShouldNotDownloadKeys();
    });

    describe("when creating an encrypted room with empty invites", () => {
        beforeEach(async () => {
            await createRoom({ encryption: true, createOpts: { } });
        });

        itShouldNotDownloadKeys();
    });

    describe("when create an encrypted room with invites", () => {
        beforeEach(async () => {
            await createRoomWithInvites();
        });

        it("should download the keys", () => {
            expect(client.downloadKeys).toHaveBeenCalledWith([
                userId1,
                userId2,
            ]);
        });
    });

    describe("when download keys raises an error", () => {
        beforeEach(async () => {
            client.downloadKeys.mockRejectedValue("error");
            await createRoomWithInvites();
        });

        it("should log the error", () => {
            expect(logger.warn).toHaveBeenCalledWith("Error downloading keys while creating room", "error");
        });
    });
});

describe("canEncryptToAllUsers", () => {
    const trueUser = {
        "@goodUser:localhost": {
            "DEV1": {} as unknown as IDevice,
            "DEV2": {} as unknown as IDevice,
        },
    };
    const falseUser = {
        "@badUser:localhost": {},
    };

    let client: Mocked<MatrixClient>;
    beforeEach(() => {
        stubClient();
        client = mocked(MatrixClientPeg.get());
    });

    it("returns true if all devices have crypto", async () => {
        client.downloadKeys.mockResolvedValue(trueUser);
        const response = await canEncryptToAllUsers(client, ["@goodUser:localhost"]);
        expect(response).toBe(true);
    });

    it("returns false if not all users have crypto", async () => {
        client.downloadKeys.mockResolvedValue({ ...trueUser, ...falseUser });
        const response = await canEncryptToAllUsers(client, ["@goodUser:localhost", "@badUser:localhost"]);
        expect(response).toBe(false);
    });
});
