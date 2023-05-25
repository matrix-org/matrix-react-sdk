/*
Copyright 2023 The Matrix.org Foundation C.I.C.

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

import React, { ComponentProps } from "react";
import { fireEvent, render, RenderResult, screen, within } from "@testing-library/react";
import fetchMockJest from "fetch-mock-jest";
import { ClientEvent } from "matrix-js-sdk/src/client";
import { SyncState } from "matrix-js-sdk/src/sync";
import { MediaHandler } from "matrix-js-sdk/src/webrtc/mediaHandler";
import { MatrixEvent, Room } from "matrix-js-sdk/src/matrix";

import MatrixChat from "../../../src/components/structures/MatrixChat";
import * as StorageManager from "../../../src/utils/StorageManager";
import defaultDispatcher from "../../../src/dispatcher/dispatcher";
import { Action } from "../../../src/dispatcher/actions";
import { UserTab } from "../../../src/components/views/dialogs/UserTab";
import { clearAllModals, flushPromises, getMockClientWithEventEmitter, mockClientMethodsUser } from "../../test-utils";
import * as leaveRoomUtils from "../../../src/utils/leave-behaviour";
import RoomListStore from "../../../src/stores/room-list/RoomListStore";
import { RoomUpdateCause } from "../../../src/stores/room-list/models";
import SettingsStore from "../../../src/settings/SettingsStore";
import ThemeWatcher from "../../../src/settings/watchers/ThemeWatcher";

describe("<MatrixChat />", () => {
    const userId = "@alice:server.org";
    const deviceId = "qwertyui";
    const accessToken = "abc123";
    const mockClient = getMockClientWithEventEmitter({
        ...mockClientMethodsUser(userId),
        // room related
        hasLazyLoadMembersEnabled: jest.fn(),
        forget: jest.fn(),
        getRoom: jest.fn(),
        stopPeeking: jest.fn(),
        isRoomEncrypted: jest.fn(),
        // other
        startClient: jest.fn(),
        stopClient: jest.fn(),
        setCanResetTimelineCallback: jest.fn(),
        isInitialSyncComplete: jest.fn(),
        getSyncState: jest.fn(),
        getSyncStateData: jest.fn().mockReturnValue(null),
        getThirdpartyProtocols: jest.fn().mockResolvedValue({}),
        getClientWellKnown: jest.fn().mockReturnValue({}),
        isVersionSupported: jest.fn().mockResolvedValue(false),
        isCryptoEnabled: jest.fn().mockReturnValue(false),
        getCapabilities: jest.fn().mockReturnValue({}),
        getMediaHandler: jest.fn().mockReturnValue({
            setVideoInput: jest.fn(),
            setAudioInput: jest.fn(),
            setAudioSettings: jest.fn(),
            stopAllStreams: jest.fn(),
        } as unknown as MediaHandler),
        setAccountData: jest.fn(),
        store: {
            destroy: jest.fn(),
        },
    });
    const serverConfig = {
        hsUrl: "https://test.com",
        hsName: "Test Server",
        hsNameIsDifferent: false,
        isUrl: "https://is.com",
        isDefault: true,
        isNameResolvable: true,
        warning: "",
    };
    const defaultProps: ComponentProps<typeof MatrixChat> = {
        config: {
            brand: "Test",
            element_call: {},
            feedback: {
                existing_issues_url: "https://feedback.org/existing",
                new_issue_url: "https://feedback.org/new",
            },
            validated_server_config: serverConfig,
        },
        onNewScreen: jest.fn(),
        onTokenLoginCompleted: jest.fn(),
        makeRegistrationUrl: jest.fn(),
        realQueryParams: {},
    };
    const getComponent = (props: Partial<ComponentProps<typeof MatrixChat>> = {}) =>
        render(<MatrixChat {...defaultProps} {...props} />);
    const localStorageSpy = jest.spyOn(localStorage.__proto__, "getItem").mockReturnValue(undefined);

    beforeEach(() => {
        fetchMockJest.get("https://test.com/_matrix/client/versions", {
            unstable_features: {},
            versions: [],
        });
        localStorageSpy.mockClear();
        jest.spyOn(StorageManager, "idbLoad").mockRestore();
        jest.spyOn(StorageManager, "idbSave").mockResolvedValue(undefined);
        jest.spyOn(defaultDispatcher, "dispatch").mockClear();
    });

    it("should render spinner while app is loading", () => {
        const { container } = getComponent();

        expect(container).toMatchSnapshot();
    });

    describe("with an existing session", () => {
        const mockidb: Record<string, Record<string, string>> = {
            acccount: {
                mx_access_token: accessToken,
            },
        };
        const mockLocalStorage: Record<string, string> = {
            mx_hs_url: serverConfig.hsUrl,
            mx_is_url: serverConfig.isUrl,
            mx_access_token: accessToken,
            mx_user_id: userId,
            mx_device_id: deviceId,
        };

        beforeEach(async () => {
            localStorageSpy.mockImplementation((key: unknown) => mockLocalStorage[key as string] || "");

            jest.spyOn(StorageManager, "idbLoad").mockImplementation(async (table, key) => {
                const safeKey = Array.isArray(key) ? key[0] : key;
                return mockidb[table]?.[safeKey];
            });

            await clearAllModals();
        });

        const getComponentAndWaitForReady = async (): Promise<RenderResult> => {
            const renderResult = getComponent();
            // we think we are logged in, but are still waiting for the /sync to complete
            await screen.findByText("Logout");
            // initial sync
            mockClient.emit(ClientEvent.Sync, SyncState.Prepared, null);
            // wait for logged in view to load
            await screen.findByLabelText("User menu");
            // let things settle
            await flushPromises();
            // and some more for good measure
            // this proved to be a little flaky
            await flushPromises();

            return renderResult;
        };

        it("should render welcome page after login", async () => {
            getComponent();

            // we think we are logged in, but are still waiting for the /sync to complete
            const logoutButton = await screen.findByText("Logout");

            expect(logoutButton).toBeInTheDocument();
            expect(screen.getByRole("progressbar")).toBeInTheDocument();

            // initial sync
            mockClient.emit(ClientEvent.Sync, SyncState.Prepared, null);

            // wait for logged in view to load
            await screen.findByLabelText("User menu");
            // let things settle
            await flushPromises();
            expect(screen.queryByRole("progressbar")).not.toBeInTheDocument();
            expect(screen.getByText(`Welcome ${userId}`)).toBeInTheDocument();
        });

        describe("onAction()", () => {
            it("should open user device settings", async () => {
                await getComponentAndWaitForReady();

                defaultDispatcher.dispatch({
                    action: Action.ViewUserDeviceSettings,
                });

                await flushPromises();

                expect(defaultDispatcher.dispatch).toHaveBeenCalledWith({
                    action: Action.ViewUserSettings,
                    initialTabId: UserTab.Security,
                });
            });

            describe("room actions", () => {
                const roomId = "!room:server.org";
                const spaceId = "!spaceRoom:server.org";
                const room = new Room(roomId, mockClient, userId);
                const spaceRoom = new Room(spaceId, mockClient, userId);
                jest.spyOn(spaceRoom, "isSpaceRoom").mockReturnValue(true);

                beforeEach(() => {
                    mockClient.getRoom.mockImplementation(
                        (id) => [room, spaceRoom].find((room) => room.roomId === id) || null,
                    );
                });

                describe("leave_room", () => {
                    beforeEach(async () => {
                        await getComponentAndWaitForReady();
                        // this is thoroughly unit tested elsewhere
                        jest.spyOn(leaveRoomUtils, "leaveRoomBehaviour").mockClear().mockResolvedValue(undefined);
                    });
                    const dispatchAction = () =>
                        defaultDispatcher.dispatch({
                            action: "leave_room",
                            room_id: roomId,
                        });
                    const publicJoinRule = new MatrixEvent({
                        type: "m.room.join_rules",
                        content: {
                            join_rule: "public",
                        },
                    });
                    const inviteJoinRule = new MatrixEvent({
                        type: "m.room.join_rules",
                        content: {
                            join_rule: "invite",
                        },
                    });
                    describe("for a room", () => {
                        beforeEach(() => {
                            jest.spyOn(room.currentState, "getJoinedMemberCount").mockReturnValue(2);
                            jest.spyOn(room.currentState, "getStateEvents").mockReturnValue(publicJoinRule);
                        });
                        it("should launch a confirmation modal", async () => {
                            dispatchAction();
                            const dialog = await screen.findByRole("dialog");
                            expect(dialog).toMatchSnapshot();
                        });
                        it("should warn when room has only one joined member", async () => {
                            jest.spyOn(room.currentState, "getJoinedMemberCount").mockReturnValue(1);
                            dispatchAction();
                            await screen.findByRole("dialog");
                            expect(
                                screen.getByText(
                                    "You are the only person here. If you leave, no one will be able to join in the future, including you.",
                                ),
                            ).toBeInTheDocument();
                        });
                        it("should warn when room is not public", async () => {
                            jest.spyOn(room.currentState, "getStateEvents").mockReturnValue(inviteJoinRule);
                            dispatchAction();
                            await screen.findByRole("dialog");
                            expect(
                                screen.getByText(
                                    "This room is not public. You will not be able to rejoin without an invite.",
                                ),
                            ).toBeInTheDocument();
                        });
                        it("should do nothing on cancel", async () => {
                            dispatchAction();
                            const dialog = await screen.findByRole("dialog");
                            fireEvent.click(within(dialog).getByText("Cancel"));

                            await flushPromises();

                            expect(leaveRoomUtils.leaveRoomBehaviour).not.toHaveBeenCalled();
                            expect(defaultDispatcher.dispatch).not.toHaveBeenCalledWith({
                                action: Action.AfterLeaveRoom,
                                room_id: roomId,
                            });
                        });
                        it("should leave room and dispatch after leave action", async () => {
                            dispatchAction();
                            const dialog = await screen.findByRole("dialog");
                            fireEvent.click(within(dialog).getByText("Leave"));

                            await flushPromises();

                            expect(leaveRoomUtils.leaveRoomBehaviour).toHaveBeenCalled();
                            expect(defaultDispatcher.dispatch).toHaveBeenCalledWith({
                                action: Action.AfterLeaveRoom,
                                room_id: roomId,
                            });
                        });
                    });

                    describe("for a space", () => {
                        const dispatchAction = () =>
                            defaultDispatcher.dispatch({
                                action: "leave_room",
                                room_id: spaceId,
                            });
                        beforeEach(() => {
                            jest.spyOn(spaceRoom.currentState, "getStateEvents").mockReturnValue(publicJoinRule);
                        });
                        it("should launch a confirmation modal", async () => {
                            dispatchAction();
                            const dialog = await screen.findByRole("dialog");
                            expect(dialog).toMatchSnapshot();
                        });
                        it("should warn when space is not public", async () => {
                            jest.spyOn(spaceRoom.currentState, "getStateEvents").mockReturnValue(inviteJoinRule);
                            dispatchAction();
                            await screen.findByRole("dialog");
                            expect(
                                screen.getByText(
                                    "This space is not public. You will not be able to rejoin without an invite.",
                                ),
                            ).toBeInTheDocument();
                        });
                    });
                });

                describe("forget_room", () => {
                    const dispatchAction = () =>
                        defaultDispatcher.dispatch({
                            action: "forget_room",
                            room_id: roomId,
                        });

                    beforeEach(async () => {
                        jest.spyOn(room.currentState, "getStateEvents").mockRestore();
                        await getComponentAndWaitForReady();
                        // clear dispatch calls during init
                        jest.spyOn(defaultDispatcher, "dispatch").mockClear();
                        mockClient.forget.mockClear().mockResolvedValue(undefined);
                        // stub
                        jest.spyOn(RoomListStore.instance, "manualRoomUpdate").mockReturnValue(undefined);
                    });

                    it("should forget the room and update roomlist", async () => {
                        dispatchAction();

                        await flushPromises();
                        expect(mockClient.forget).toHaveBeenCalledWith(roomId);
                        expect(RoomListStore.instance.manualRoomUpdate).toHaveBeenCalledWith(
                            room,
                            RoomUpdateCause.RoomRemoved,
                        );
                    });

                    it("should not redirect to home page if forgotten room is not current room", async () => {
                        dispatchAction();

                        await flushPromises();
                        expect(defaultDispatcher.dispatch).not.toHaveBeenCalledWith({
                            action: Action.ViewHomePage,
                        });
                    });

                    // @TODO(kerrya) re-enable when tests are moved out of MatrixChat
                    // loading RoomView/changing page kicks off so many actions
                    // that take a long time to settle
                    // and make this test flaky and leaky
                    // when test is moved to utils and just tests forget room behaviour
                    // that will not be an issue
                    it.skip("should redirect to home page if forgotten room is the current room", async () => {
                        // dispatching this loads RoomView and adds a lot of stuff to mock
                        // these tests will move to utils soon and wont load roomview
                        // so just do something quick and dirty here
                        jest.spyOn(SettingsStore, "getValue").mockReturnValue(undefined);
                        jest.spyOn(ThemeWatcher.prototype, "recheck").mockImplementation(() => {});
                        defaultDispatcher.dispatch({
                            action: Action.ViewRoom,
                            room_id: roomId,
                        });
                        jest.spyOn(defaultDispatcher, "dispatch").mockClear();

                        dispatchAction();

                        await flushPromises();
                        expect(defaultDispatcher.dispatch).toHaveBeenCalledWith({
                            action: Action.ViewHomePage,
                        });

                        await flushPromises();
                    });

                    it("should show an error dialog if forgetting fails", async () => {
                        const error = { errcode: "test", message: "Oups!" };
                        mockClient.forget.mockRejectedValue(error);
                        dispatchAction();
                        await flushPromises();

                        const dialog = await screen.findByRole("dialog");

                        expect(within(dialog).getByText("Failed to forget room test")).toBeInTheDocument();
                        expect(within(dialog).getByText("Oups!")).toBeInTheDocument();
                    });

                    it("should show an error dialog with default error messages when error is not a MatrixError", async () => {
                        const error = {};
                        mockClient.forget.mockRejectedValue(error);
                        dispatchAction();
                        await flushPromises();

                        const dialog = await screen.findByRole("dialog");

                        expect(
                            within(dialog).getByText("Failed to forget room unknown error code"),
                        ).toBeInTheDocument();
                        expect(within(dialog).getByText("Operation failed")).toBeInTheDocument();
                    });
                });
            });
        });
    });
});
