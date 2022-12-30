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
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { mocked } from "jest-mock";
import { Room, User, MatrixClient, RoomMember } from "matrix-js-sdk/src/matrix";
import { Phase, VerificationRequest } from "matrix-js-sdk/src/crypto/verification/request/VerificationRequest";
import { DeviceTrustLevel, UserTrustLevel } from "matrix-js-sdk/src/crypto/CrossSigning";

import UserInfo, {
    DeviceItem,
    disambiguateDevices,
    IDevice,
    UserOptionsSection,
} from "../../../../src/components/views/right_panel/UserInfo";
import dis from "../../../../src/dispatcher/dispatcher";
import { RightPanelPhases } from "../../../../src/stores/right-panel/RightPanelStorePhases";
import { MatrixClientPeg } from "../../../../src/MatrixClientPeg";
import MatrixClientContext from "../../../../src/contexts/MatrixClientContext";
import MultiInviter from "../../../../src/utils/MultiInviter";
import * as mockVerification from "../../../../src/verification";

jest.mock("../../../../src/dispatcher/dispatcher");

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

const mockRoom = mocked({
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
    getEventReadUpTo: jest.fn(),
} as unknown as Room);

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
    checkDeviceTrust: jest.fn(),
    checkUserTrust: jest.fn(),
    getRoom: jest.fn(),
} as unknown as MatrixClient);

const defaultUserId = "@test:test";
const defaultUser = new User(defaultUserId);

beforeAll(() => {
    jest.spyOn(MatrixClientPeg, "get").mockReturnValue(mockClient);
});

beforeEach(() => {
    mockClient.getUser.mockClear().mockReturnValue({} as unknown as User);
});

describe("<UserInfo />", () => {
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
        it("renders user info", () => {
            renderComponent({ room: mockRoom });
            expect(screen.getByRole("heading", { name: defaultUserId })).toBeInTheDocument();
        });

        it("does not render space header when room is not a space room", () => {
            renderComponent({ room: mockRoom });
            expect(screen.queryByTestId("space-header")).not.toBeInTheDocument();
        });

        it("renders space header when room is a space room", () => {
            const spaceRoom = {
                ...mockRoom,
                isSpaceRoom: jest.fn().mockReturnValue(true),
            };
            renderComponent({ room: spaceRoom });
            expect(screen.getByTestId("space-header")).toBeInTheDocument();
        });

        it("renders encryption info panel without pending verification", () => {
            renderComponent({ phase: RightPanelPhases.EncryptionPanel, room: mockRoom });
            expect(screen.getByRole("heading", { name: /encryption/i })).toBeInTheDocument();
        });

        it("renders encryption verification panel with pending verification", () => {
            renderComponent({ phase: RightPanelPhases.EncryptionPanel, verificationRequest, room: mockRoom });

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

describe("<DeviceItem />", () => {
    const device: IDevice = { deviceId: "deviceId", getDisplayName: () => "deviceName" };
    const defaultProps = {
        userId: defaultUserId,
        device,
    };

    const renderComponent = (props = {}) => {
        const Wrapper = (wrapperProps = {}) => {
            return <MatrixClientContext.Provider value={mockClient} {...wrapperProps} />;
        };

        return render(<DeviceItem {...defaultProps} {...props} />, {
            wrapper: Wrapper,
        });
    };

    const setMockUserTrust = (isVerified = false) => {
        mockClient.checkUserTrust.mockReturnValue({ isVerified: () => isVerified } as UserTrustLevel);
    };
    const setMockDeviceTrust = (isVerified = false, isCrossSigningVerified = false) => {
        mockClient.checkDeviceTrust.mockReturnValue({
            isVerified: () => isVerified,
            isCrossSigningVerified: () => isCrossSigningVerified,
        } as DeviceTrustLevel);
    };

    const mockVerifyDevice = jest.spyOn(mockVerification, "verifyDevice");

    beforeEach(() => {
        setMockUserTrust();
        setMockDeviceTrust();
    });

    afterEach(() => {
        mockClient.checkDeviceTrust.mockReset();
        mockClient.checkUserTrust.mockReset();
        mockVerifyDevice.mockClear;
    });

    it("with unverified user and device, displays button without a label", () => {
        renderComponent();

        expect(screen.getByRole("button", { name: device.getDisplayName() })).toBeInTheDocument;
        expect(screen.queryByText(/trusted/i)).not.toBeInTheDocument();
    });

    it("with verified user only, displays button with a 'Not trusted' label", () => {
        setMockUserTrust(true);
        renderComponent();

        expect(screen.getByRole("button", { name: `${device.getDisplayName()} Not trusted` })).toBeInTheDocument;
    });

    it("with verified device only, displays no button without a label", () => {
        setMockDeviceTrust(true);
        renderComponent();

        expect(screen.getByText(device.getDisplayName())).toBeInTheDocument();
        expect(screen.queryByText(/trusted/)).not.toBeInTheDocument();
    });

    it("when userId is the same as userId from client, uses isCrossSigningVerified to determine if button is shown", () => {
        mockClient.getUserId.mockReturnValueOnce(defaultUserId);
        renderComponent();

        // set trust to be false for isVerified, true for isCrossSigningVerified
        setMockDeviceTrust(false, true);

        // expect to see no button in this case
        expect(screen.queryByRole("button")).not.toBeInTheDocument;
        expect(screen.getByText(device.getDisplayName())).toBeInTheDocument();
    });

    it("with verified user and device, displays no button and a 'Trusted' label", () => {
        setMockUserTrust(true);
        setMockDeviceTrust(true);
        renderComponent();

        expect(screen.queryByRole("button")).not.toBeInTheDocument;
        expect(screen.getByText(device.getDisplayName())).toBeInTheDocument();
        expect(screen.getByText("Trusted")).toBeInTheDocument();
    });

    it("does not call verifyDevice if client.getUser returns null", async () => {
        mockClient.getUser.mockReturnValueOnce(null);
        renderComponent();

        const button = screen.getByRole("button", { name: device.getDisplayName() });
        expect(button).toBeInTheDocument;
        await userEvent.click(button);

        expect(mockVerifyDevice).not.toHaveBeenCalled();
    });

    it("calls verifyDevice if client.getUser returns an object", async () => {
        mockClient.getUser.mockReturnValueOnce(defaultUser);
        // set mock return of isGuest to short circuit verifyDevice call to avoid
        // even more mocking
        mockClient.isGuest.mockReturnValueOnce(true);
        renderComponent();

        const button = screen.getByRole("button", { name: device.getDisplayName() });
        expect(button).toBeInTheDocument;
        await userEvent.click(button);

        expect(mockVerifyDevice).toHaveBeenCalledTimes(1);
        expect(mockVerifyDevice).toHaveBeenCalledWith(defaultUser, device);
    });
});

describe("<UserOptionsSection />", () => {
    const member = new RoomMember(mockRoom.roomId, defaultUserId);
    const defaultProps = { member, isIgnored: false, canInvite: false, isSpace: false };

    const renderComponent = (props = {}) => {
        const Wrapper = (wrapperProps = {}) => {
            return <MatrixClientContext.Provider value={mockClient} {...wrapperProps} />;
        };

        return render(<UserOptionsSection {...defaultProps} {...props} />, {
            wrapper: Wrapper,
        });
    };

    it("always shows share user button", () => {
        renderComponent();
        expect(screen.getByRole("button", { name: /share link to user/i })).toBeInTheDocument();
    });

    it("does not show ignore or direct message buttons when member userId matches client userId ", () => {
        mockClient.getUserId.mockReturnValueOnce(member.userId);
        renderComponent();

        expect(screen.queryByRole("button", { name: /ignore/i })).not.toBeInTheDocument();
        expect(screen.queryByRole("button", { name: /message/i })).not.toBeInTheDocument();
    });

    it("shows ignore, direct message and mention buttons when member userId does not match client userId ", () => {
        // call to client.getUserId returns undefined, which will not match member.userId
        renderComponent();

        expect(screen.getByRole("button", { name: /ignore/i })).toBeInTheDocument();
        expect(screen.getByRole("button", { name: /message/i })).toBeInTheDocument();
        expect(screen.getByRole("button", { name: /mention/i })).toBeInTheDocument();
    });

    it("when call to client.getRoom is null, does not show read receipt button", () => {
        mockClient.getRoom.mockReturnValueOnce(null);
        renderComponent();

        expect(screen.queryByRole("button", { name: /jump to read receipt/i })).not.toBeInTheDocument();
    });

    it("when call to client.getRoom is non-null and room.getEventReadUpTo is null, does not show read receipt button", () => {
        mockRoom.getEventReadUpTo.mockReturnValueOnce(null);
        mockClient.getRoom.mockReturnValueOnce(mockRoom);
        renderComponent();

        expect(screen.queryByRole("button", { name: /jump to read receipt/i })).not.toBeInTheDocument();
    });

    it("when calls to client.getRoom and room.getEventReadUpTo are non-null, shows read receipt button", () => {
        mockRoom.getEventReadUpTo.mockReturnValueOnce("1234");
        mockClient.getRoom.mockReturnValueOnce(mockRoom);
        renderComponent();

        expect(screen.getByRole("button", { name: /jump to read receipt/i })).toBeInTheDocument();
    });

    it("clicking the read receipt button calls dispatch with correct event_id", async () => {
        const mockEventId = "1234";
        mockRoom.getEventReadUpTo.mockReturnValue(mockEventId);
        mockClient.getRoom.mockReturnValue(mockRoom);
        renderComponent();

        const readReceiptButton = screen.getByRole("button", { name: /jump to read receipt/i });

        expect(readReceiptButton).toBeInTheDocument();
        await userEvent.click(readReceiptButton);
        expect(dis.dispatch).toHaveBeenCalledWith({
            action: "view_room",
            event_id: mockEventId,
            highlighted: true,
            metricsTrigger: undefined,
            room_id: "!fkfk",
        });

        mockRoom.getEventReadUpTo.mockReset();
        mockClient.getRoom.mockReset();
    });

    it("firing the read receipt event handler with a null event_id calls dispatch with undefined not null", async () => {
        const mockEventId = "1234";
        // the first call is the check to see if we should render the button, second call is
        // when the button is clicked
        mockRoom.getEventReadUpTo.mockReturnValueOnce(mockEventId).mockReturnValueOnce(null);
        mockClient.getRoom.mockReturnValue(mockRoom);
        renderComponent();

        const readReceiptButton = screen.getByRole("button", { name: /jump to read receipt/i });

        expect(readReceiptButton).toBeInTheDocument();
        await userEvent.click(readReceiptButton);
        expect(dis.dispatch).toHaveBeenCalledWith({
            action: "view_room",
            event_id: undefined,
            highlighted: true,
            metricsTrigger: undefined,
            room_id: "!fkfk",
        });

        mockClient.getRoom.mockReset();
    });

    it("does not show the invite button when canInvite is false", () => {
        renderComponent();
        expect(screen.queryByRole("button", { name: /invite/i })).not.toBeInTheDocument();
    });

    it("shows the invite button when canInvite is true", () => {
        renderComponent({ canInvite: true });
        expect(screen.getByRole("button", { name: /invite/i })).toBeInTheDocument();
    });

    it("clicking the invite button will call MultiInviter.invite", async () => {
        // to save mocking, we will reject the call to .invite
        const inviteSpy = jest.spyOn(MultiInviter.prototype, "invite");
        const mockErrorMessage = new Error("test error message");
        inviteSpy.mockRejectedValue(mockErrorMessage);

        // render the component and click the button
        renderComponent({ canInvite: true });
        const inviteButton = screen.getByRole("button", { name: /invite/i });
        expect(inviteButton).toBeInTheDocument();
        await userEvent.click(inviteButton);

        // check that we have called .invite
        expect(inviteSpy).toHaveBeenCalledWith([member.userId]);

        // check that the test error message is displayed
        await waitFor(() => {
            expect(screen.getByText(mockErrorMessage.message)).toBeInTheDocument();
        });
    });

    it("if calling .invite throws something strange, show default error message", async () => {
        const inviteSpy = jest.spyOn(MultiInviter.prototype, "invite");
        inviteSpy.mockRejectedValue({ this: "could be anything" });

        // render the component and click the button
        renderComponent({ canInvite: true });
        const inviteButton = screen.getByRole("button", { name: /invite/i });
        expect(inviteButton).toBeInTheDocument();
        await userEvent.click(inviteButton);

        // check that the default test error message is displayed
        await waitFor(() => {
            expect(screen.getByText(/operation failed/i)).toBeInTheDocument();
        });
    });
});
