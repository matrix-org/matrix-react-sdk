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
import { act, fireEvent, render, screen, waitFor, RenderResult } from "@testing-library/react";
import "@testing-library/jest-dom";
import { RoomKeyRequestState } from "matrix-js-sdk/src/crypto/OutgoingRoomKeyRequestManager";
import { OutgoingRoomKeyRequest } from "matrix-js-sdk/src/crypto/store/base";

import MatrixClientContext from "../../../../src/contexts/MatrixClientContext";
import { DecryptionFailureBar } from "../../../../src/components/views/rooms/DecryptionFailureBar";

type MockDevice = { device_id: string };

const verifiedDevice1: MockDevice = { device_id: "verified1" };
const verifiedDevice2: MockDevice = { device_id: "verified2" };
const unverifiedDevice1: MockDevice = { device_id: "unverified1" };
const unverifiedDevice2: MockDevice = { device_id: "unverified2" };

const mockEvent1 = {
    event: { event_id: "mockEvent1" },
    getWireContent: () => ({ session_id: "sessionA" }),
};

const mockEvent2 = {
    event: { event_id: "mockEvent2" },
    getWireContent: () => ({ session_id: "sessionB" }),
};

const mockEvent3 = {
    event: { event_id: "mockEvent3" },
    getWireContent: () => ({ session_id: "sessionB" }),
};

const outgoingRequest3: OutgoingRoomKeyRequest = {
    requestId: "outgoingRequest",
    recipients: [],
    requestBody: {
        session_id: "sessionB",
        sender_key: "senderkey",
        room_id: "!room",
        algorithm: "m.megolm.v1.aes-sha2",
    },
    state: RoomKeyRequestState.Sent,
};

const userId = "@user:example.com";

let ourDevice: MockDevice | undefined;
let allDevices: MockDevice[] | undefined;
let keyBackup = false;

const mockClient = {
    getUserId: () => userId,
    getDeviceId: () => ourDevice.device_id,
    getDevices: () => Promise.resolve({ devices: allDevices }),
    isSecretStored: jest.fn(() => Promise.resolve(keyBackup ? { key: "yes" } : null)),
    checkIfOwnDeviceCrossSigned: (deviceId: string) => deviceId.startsWith("verified"),
    downloadKeys: jest.fn(() => {}),
    cancelAndResendEventRoomKeyRequest: jest.fn(() => {}),
    getOutgoingRoomKeyRequest: jest.fn((ev) => Promise.resolve(ev === mockEvent3 ? outgoingRequest3 : null)),
};

function getBar(wrapper: RenderResult) {
    return wrapper.container.querySelector(".mx_DecryptionFailureBar");
}

describe("<DecryptionFailureBar />", () => {
    beforeEach(() => {
        jest.useFakeTimers();
    });

    afterEach(() => {
        const container = document.body.firstChild;
        container && document.body.removeChild(container);

        jest.runOnlyPendingTimers();
        jest.useRealTimers();

        mockClient.cancelAndResendEventRoomKeyRequest.mockClear();
    });

    it("Displays a loading spinner", async () => {
        ourDevice = unverifiedDevice1;
        allDevices = [unverifiedDevice1];

        const bar = render(
            // @ts-ignore
            <MatrixClientContext.Provider value={mockClient}>
                <DecryptionFailureBar
                    failures={[
                        // @ts-ignore
                        mockEvent1,
                    ]}
                    room={null}
                />,
            </MatrixClientContext.Provider>,
        );

        await waitFor(() => expect(mockClient.isSecretStored).toHaveBeenCalled());

        expect(getBar(bar)).toMatchSnapshot();

        bar.unmount();
    });

    it("Prompts the user to verify if they have other devices", async () => {
        ourDevice = unverifiedDevice1;
        allDevices = [unverifiedDevice1, verifiedDevice1];
        keyBackup = false;

        const bar = render(
            // @ts-ignore
            <MatrixClientContext.Provider value={mockClient}>
                <DecryptionFailureBar
                    failures={[
                        // @ts-ignore
                        mockEvent1,
                    ]}
                    room={null}
                />,
            </MatrixClientContext.Provider>,
        );

        await waitFor(() => expect(mockClient.isSecretStored).toHaveBeenCalled());

        act(() => { jest.advanceTimersByTime(5000); });
        expect(getBar(bar)).toMatchSnapshot();

        bar.unmount();
    });

    it("Prompts the user to verify if they have backups", async () => {
        ourDevice = unverifiedDevice1;
        allDevices = [unverifiedDevice1];
        keyBackup = true;

        const bar = render(
            // @ts-ignore
            <MatrixClientContext.Provider value={mockClient}>
                <DecryptionFailureBar
                    failures={[
                        // @ts-ignore
                        mockEvent1,
                    ]}
                    room={null}
                />,
            </MatrixClientContext.Provider>,
        );

        await waitFor(() => expect(mockClient.isSecretStored).toHaveBeenCalled());

        act(() => { jest.advanceTimersByTime(5000); });
        expect(getBar(bar)).toMatchSnapshot();

        bar.unmount();
    });

    it("Prompts the user to reset if they have no other verified devices and no backups", async () => {
        ourDevice = unverifiedDevice1;
        allDevices = [unverifiedDevice1, unverifiedDevice2];
        keyBackup = false;

        const bar = render(
            // @ts-ignore
            <MatrixClientContext.Provider value={mockClient}>
                <DecryptionFailureBar
                    failures={[
                        // @ts-ignore
                        mockEvent1,
                    ]}
                    room={null}
                />,
            </MatrixClientContext.Provider>,
        );

        await waitFor(() => expect(mockClient.isSecretStored).toHaveBeenCalled());

        act(() => { jest.advanceTimersByTime(5000); });
        expect(getBar(bar)).toMatchSnapshot();

        bar.unmount();
    });

    it("Recommends opening other devices if there are other verified devices", async () => {
        ourDevice = verifiedDevice1;
        allDevices = [verifiedDevice1, verifiedDevice2];
        keyBackup = false;

        const bar = render(
            // @ts-ignore
            <MatrixClientContext.Provider value={mockClient}>
                <DecryptionFailureBar
                    failures={[
                        // @ts-ignore
                        mockEvent1,
                    ]}
                    room={null}
                />,
            </MatrixClientContext.Provider>,
        );

        await waitFor(() => expect(mockClient.isSecretStored).toHaveBeenCalled());

        act(() => { jest.advanceTimersByTime(5000); });
        expect(getBar(bar)).toMatchSnapshot();

        bar.unmount();
    });

    it("Displays a general error message if there are no other verified devices", async () => {
        ourDevice = verifiedDevice1;
        allDevices = [verifiedDevice1, unverifiedDevice1];
        keyBackup = true;

        const bar = render(
            // @ts-ignore
            <MatrixClientContext.Provider value={mockClient}>
                <DecryptionFailureBar
                    failures={[
                        // @ts-ignore
                        mockEvent1,
                    ]}
                    room={null}
                />,
            </MatrixClientContext.Provider>,
        );

        await waitFor(() => expect(mockClient.isSecretStored).toHaveBeenCalled());

        act(() => { jest.advanceTimersByTime(5000); });
        expect(getBar(bar)).toMatchSnapshot();

        bar.unmount();
    });

    it("Displays button to resend key requests if we are verified", async () => {
        ourDevice = verifiedDevice1;
        allDevices = [verifiedDevice1, verifiedDevice2];

        const bar = render(
            // @ts-ignore
            <MatrixClientContext.Provider value={mockClient}>
                <DecryptionFailureBar
                    failures={[
                        // @ts-ignore
                        mockEvent1, mockEvent2, mockEvent3,
                    ]}
                    room={null}
                />,
            </MatrixClientContext.Provider>,
        );

        await waitFor(() => expect(mockClient.isSecretStored).toHaveBeenCalled());

        act(() => { jest.advanceTimersByTime(5000); });
        expect(getBar(bar)).toMatchSnapshot();

        await fireEvent.click(screen.getByText("Resend key requests"));

        expect(mockClient.cancelAndResendEventRoomKeyRequest).toHaveBeenCalledTimes(2);
        expect(mockClient.cancelAndResendEventRoomKeyRequest).toHaveBeenCalledWith(mockEvent1);
        expect(mockClient.cancelAndResendEventRoomKeyRequest).toHaveBeenCalledWith(mockEvent2);

        expect(getBar(bar)).toMatchSnapshot();

        bar.unmount();
    });

    it("Does not display a button to send key requests if we are unverified", async () => {
        ourDevice = unverifiedDevice1;
        allDevices = [unverifiedDevice1, verifiedDevice2];

        const bar = render(
            // @ts-ignore
            <MatrixClientContext.Provider value={mockClient}>
                <DecryptionFailureBar
                    failures={[
                        // @ts-ignore
                        mockEvent1, mockEvent2,
                    ]}
                    room={null}
                />,
            </MatrixClientContext.Provider>,
        );

        await waitFor(() => expect(mockClient.isSecretStored).toHaveBeenCalled());

        act(() => { jest.advanceTimersByTime(5000); });
        expect(getBar(bar)).toMatchSnapshot();

        bar.unmount();
    });

    it("Displays the button to resend key requests only if sessions without pending requests appear", async () => {
        ourDevice = verifiedDevice1;
        allDevices = [verifiedDevice1, verifiedDevice2];

        const bar = render(
            // @ts-ignore
            <MatrixClientContext.Provider value={mockClient}>
                <DecryptionFailureBar
                    failures={[
                        // @ts-ignore
                        mockEvent3,
                    ]}
                    room={null}
                />,
            </MatrixClientContext.Provider>,
        );

        await waitFor(() => expect(mockClient.isSecretStored).toHaveBeenCalled());

        act(() => { jest.advanceTimersByTime(5000); });
        expect(getBar(bar)).toMatchSnapshot();

        bar.rerender(
            // @ts-ignore
            <MatrixClientContext.Provider value={mockClient}>
                <DecryptionFailureBar
                    failures={[
                        // @ts-ignore
                        mockEvent1, mockEvent2, mockEvent3,
                    ]}
                    room={null}
                />,
            </MatrixClientContext.Provider>,
        );

        await waitFor(() => expect(mockClient.getOutgoingRoomKeyRequest).toHaveBeenCalledWith(mockEvent1));
        expect(getBar(bar)).toMatchSnapshot();

        bar.unmount();
    });

    it("Forces a refresh of device lists", async () => {
        ourDevice = unverifiedDevice1;
        allDevices = [unverifiedDevice1, verifiedDevice2];

        const bar = render(
            // @ts-ignore
            <MatrixClientContext.Provider value={mockClient}>
                <DecryptionFailureBar
                    failures={[
                        // @ts-ignore
                        mockEvent1, mockEvent2,
                    ]}
                    room={null}
                />,
            </MatrixClientContext.Provider>,
        );

        await waitFor(() => expect(mockClient.isSecretStored).toHaveBeenCalled());
        expect(mockClient.downloadKeys).toHaveBeenCalledWith([userId], true);

        bar.unmount();
    });
});
