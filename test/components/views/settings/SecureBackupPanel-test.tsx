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

import React from "react";
import { render, screen } from "@testing-library/react";

import { flushPromises, getMockClientWithEventEmitter, mockClientMethodsUser } from "../../../test-utils";
import SecureBackupPanel from "../../../../src/components/views/settings/SecureBackupPanel";

describe("<SecureBackupPanel />", () => {
    const userId = "@alice:server.org";
    const client = getMockClientWithEventEmitter({
        ...mockClientMethodsUser(userId),
        checkKeyBackup: jest.fn(),
        isKeyBackupKeyStored: jest.fn(),
        isSecretStorageReady: jest.fn(),
        getKeyBackupEnabled: jest.fn(),
        getClientWellKnown: jest.fn(),
    });
    // @ts-ignore allow it
    client.crypto = {
        secretStorage: { hasKey: jest.fn() },
        getSessionBackupPrivateKey: jest.fn(),
    } as unknown as Crypto;

    const getComponent = () => render(<SecureBackupPanel />);

    beforeEach(() => {
        client.checkKeyBackup.mockResolvedValue({
            backupInfo: {
                version: "1",
                algorithm: "test",
                auth_data: {
                    public_key: "1234",
                },
            },
            trustInfo: {
                usable: false,
                sigs: [],
            },
        });
    });

    it("displays a loader while checking keybackup", async () => {
        getComponent();
        expect(screen.getByRole("progressbar")).toBeInTheDocument();
        await flushPromises();
        expect(screen.queryByRole("progressbar")).not.toBeInTheDocument();
    });

    it("handles null backup info", async () => {
        // checkKeyBackup can fail and return null for various reasons
        client.checkKeyBackup.mockResolvedValue(null);
        getComponent();
        // flush checkKeyBackup promise
        await flushPromises();

        // no backup info
        expect(screen.getByText("Back up your keys before signing out to avoid losing them.")).toBeInTheDocument();
    });

    it("suggests connecting session to key backup when backup exists", async () => {
        const { container } = getComponent();
        // flush checkKeyBackup promise
        await flushPromises();

        expect(container).toMatchSnapshot();
    });

    it("displays when session is connected to key backup", async () => {
        client.getKeyBackupEnabled.mockReturnValue(true);
        getComponent();
        // flush checkKeyBackup promise
        await flushPromises();

        expect(screen.getByText("✅ This session is backing up your keys.")).toBeInTheDocument();
    });
});
