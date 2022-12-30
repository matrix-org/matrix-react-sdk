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
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { mocked } from "jest-mock";
import { Room, User, MatrixClient } from "matrix-js-sdk/src/matrix";
import { Phase, VerificationRequest } from "matrix-js-sdk/src/crypto/verification/request/VerificationRequest";

import UserInfo, { disambiguateDevices } from "../../../../src/components/views/right_panel/UserInfo";
import { RightPanelPhases } from "../../../../src/stores/right-panel/RightPanelStorePhases";
import { MatrixClientPeg } from "../../../../src/MatrixClientPeg";
import MatrixClientContext from "../../../../src/contexts/MatrixClientContext";

jest.mock("../../../../src/utils/DMRoomMap", () => {
    const mock = {
        getUserIdForRoomId: jest.fn(),
        getDMRoomsForUserId: jest.fn(),
    };

    return {
        shared: jest.fn().mockReturnValue(mock),
        sharedInstance: mock,
    };
});

describe("<UserInfo />", () => {
    const defaultUserId = "@test:test";
    const defaultUser = new User(defaultUserId);

    const mockClient = mocked({
        getUser: jest.fn(),
        isGuest: jest.fn().mockReturnValue(false),
        isUserIgnored: jest.fn(),
        isCryptoEnabled: jest.fn(),
        getUserId: jest.fn(),
        on: jest.fn(),
        isSynapseAdministrator: jest.fn().mockResolvedValue(false),
        isRoomEncrypted: jest.fn().mockReturnValue(false),
        doesServerSupportUnstableFeature: jest.fn().mockReturnValue(false),
        mxcUrlToHttp: jest.fn().mockReturnValue("mock-mxcUrlToHttp"),
        removeListener: jest.fn(),
        currentState: {
            on: jest.fn(),
        },
    } as unknown as MatrixClient);

    const verificationRequest = {
        pending: true,
        on: jest.fn(),
        phase: Phase.Ready,
        channel: { transactionId: 1 },
        otherPartySupportsMethod: jest.fn(),
        off: jest.fn(),
    } as unknown as VerificationRequest;

    const defaultProps = {
        user: defaultUser,
        // idk what is wrong with this type
        phase: RightPanelPhases.RoomMemberInfo as RightPanelPhases.RoomMemberInfo,
        onClose: jest.fn(),
    };

    const renderComponent = (props = {}) => {
        const Wrapper = (wrapperProps = {}) => {
            return <MatrixClientContext.Provider value={mockClient} {...wrapperProps} />;
        };

        return render(<UserInfo {...defaultProps} {...props} />, {
            wrapper: Wrapper,
        });
    };

    beforeAll(() => {
        jest.spyOn(MatrixClientPeg, "get").mockReturnValue(mockClient);
    });

    beforeEach(() => {
        mockClient.getUser.mockClear().mockReturnValue({} as unknown as User);
    });

    it("closes on close button click", async () => {
        const onClose = jest.fn();
        renderComponent({ onClose });

        await userEvent.click(screen.getByTestId("base-card-close-button"));

        expect(onClose).toHaveBeenCalled();
    });

    describe("without a room", () => {
        it("does not render space header", () => {
            renderComponent();
            expect(screen.queryByTestId("space-header")).not.toBeInTheDocument();
        });

        it("renders user info", () => {
            renderComponent();
            expect(screen.getByRole("heading", { name: defaultUserId })).toBeInTheDocument();
        });

        it("renders encryption info panel without pending verification", () => {
            renderComponent({ phase: RightPanelPhases.EncryptionPanel });
            expect(screen.getByRole("heading", { name: /encryption/i })).toBeInTheDocument();
        });

        it("renders encryption verification panel with pending verification", () => {
            renderComponent({ phase: RightPanelPhases.EncryptionPanel, verificationRequest });

            expect(screen.queryByRole("heading", { name: /encryption/i })).not.toBeInTheDocument();
            // the verificationRequest has phase of Phase.Ready but .otherPartySupportsMethod
            // will not return true, so we expect to see the noCommonMethod error from VerificationPanel
            expect(screen.getByText(/try with a different client/i)).toBeInTheDocument();
        });

        it("renders close button correctly when encryption panel with a pending verification request", () => {
            renderComponent({ phase: RightPanelPhases.EncryptionPanel, verificationRequest });
            expect(screen.getByTestId("base-card-close-button")).toHaveAttribute("title", "Cancel");
        });
    });

    describe("with a room", () => {
        const room = {
            roomId: "!fkfk",
            getType: jest.fn().mockReturnValue(undefined),
            isSpaceRoom: jest.fn().mockReturnValue(false),
            getMember: jest.fn().mockReturnValue(undefined),
            getMxcAvatarUrl: jest.fn().mockReturnValue("mock-avatar-url"),
            name: "test room",
            on: jest.fn(),
            currentState: {
                getStateEvents: jest.fn(),
                on: jest.fn(),
            },
        } as unknown as Room;

        it("renders user info", () => {
            renderComponent({ room });
            expect(screen.getByRole("heading", { name: defaultUserId })).toBeInTheDocument();
        });

        it("does not render space header when room is not a space room", () => {
            renderComponent({ room });
            expect(screen.queryByTestId("space-header")).not.toBeInTheDocument();
        });

        it("renders space header when room is a space room", () => {
            const spaceRoom = {
                ...room,
                isSpaceRoom: jest.fn().mockReturnValue(true),
            };
            renderComponent({ room: spaceRoom });
            expect(screen.getByTestId("space-header")).toBeInTheDocument();
        });

        it("renders encryption info panel without pending verification", () => {
            renderComponent({ phase: RightPanelPhases.EncryptionPanel, room });
            expect(screen.getByRole("heading", { name: /encryption/i })).toBeInTheDocument();
        });

        it("renders encryption verification panel with pending verification", () => {
            renderComponent({ phase: RightPanelPhases.EncryptionPanel, verificationRequest, room });

            expect(screen.queryByRole("heading", { name: /encryption/i })).not.toBeInTheDocument();
            // the verificationRequest has phase of Phase.Ready but .otherPartySupportsMethod
            // will not return true, so we expect to see the noCommonMethod error from VerificationPanel
            expect(screen.getByText(/try with a different client/i)).toBeInTheDocument();
        });
    });
});

describe("disambiguateDevices", () => {
    it("does not add ambiguous key to unique names", () => {
        const initialDevices = [
            { deviceId: "id1", getDisplayName: () => "name1" },
            { deviceId: "id2", getDisplayName: () => "name2" },
            { deviceId: "id3", getDisplayName: () => "name3" },
        ];
        disambiguateDevices(initialDevices);

        // mutates input so assert against initialDevices
        initialDevices.forEach((device) => {
            expect(device).not.toHaveProperty("ambiguous");
        });
    });

    it("adds ambiguous key to all ids with non-unique names", () => {
        const uniqueNameDevices = [
            { deviceId: "id3", getDisplayName: () => "name3" },
            { deviceId: "id4", getDisplayName: () => "name4" },
            { deviceId: "id6", getDisplayName: () => "name6" },
        ];
        const nonUniqueNameDevices = [
            { deviceId: "id1", getDisplayName: () => "nonUnique" },
            { deviceId: "id2", getDisplayName: () => "nonUnique" },
            { deviceId: "id5", getDisplayName: () => "nonUnique" },
        ];
        const initialDevices = [...uniqueNameDevices, ...nonUniqueNameDevices];
        disambiguateDevices(initialDevices);

        // mutates input so assert against initialDevices
        uniqueNameDevices.forEach((device) => {
            expect(device).not.toHaveProperty("ambiguous");
        });
        nonUniqueNameDevices.forEach((device) => {
            expect(device).toHaveProperty("ambiguous", true);
        });
    });
});
