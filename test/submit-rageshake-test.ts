/*
Copyright 2024 The Matrix.org Foundation C.I.C.

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

import { Mocked, mocked } from "jest-mock";

import { getMockClientWithEventEmitter, mockClientMethodsCrypto } from "./test-utils";
import { collectBugReport } from "../src/rageshake/submit-rageshake";
import { MatrixClient } from "../../matrix-js-sdk";

describe("Rageshakes", () => {
    const RUST_CRYPTO_VERSION = "Rust SDK 0.7.0 (691ec63), Vodozemac 0.5.0";
    const OLM_CRYPTO_VERSION = "Olm 3.2.15";
    let mockClient: Mocked<MatrixClient>;

    beforeEach(() => {
        mockClient = getMockClientWithEventEmitter({
            credentials: { userId: "@test:example.com" },
            ...mockClientMethodsCrypto(),
        });
        mocked(mockClient.getCrypto()!.getOwnDeviceKeys).mockResolvedValue({
            ed25519: "",
            curve25519: "",
        });
    });

    test("Should add A-Element-R label if rust crypto", async () => {
        mocked(mockClient.getCrypto()!.getVersion).mockReturnValue(RUST_CRYPTO_VERSION);

        const formData = await collectBugReport();
        const labelsFormEntries = formData.getAll("label");
        const labelNames = Array.from(labelsFormEntries.values()).map((label) => label);
        expect(labelNames).toContain("A-Element-R");
    });

    test("Should add A-Element-R label if rust crypto and new version", async () => {
        mocked(mockClient.getCrypto()!.getVersion).mockReturnValue("Rust SDK 0.9.3 (909d09fd), Vodozemac 0.8.1");

        const formData = await collectBugReport();
        const labelsFormEntries = formData.getAll("label");
        const labelNames = Array.from(labelsFormEntries.values()).map((label) => label);
        expect(labelNames).toContain("A-Element-R");
    });

    test("Should not add A-Element-R label if not rust crypto", async () => {
        mocked(mockClient.getCrypto()!.getVersion).mockReturnValue(OLM_CRYPTO_VERSION);

        const formData = await collectBugReport();
        const labelsFormEntries = formData.getAll("label");
        const labelNames = Array.from(labelsFormEntries.values()).map((label) => label);
        expect(labelNames).not.toContain("A-Element-R");
    });

    test("Should add A-Element-R label to the set of requested labels", async () => {
        mocked(mockClient.getCrypto()!.getVersion).mockReturnValue(RUST_CRYPTO_VERSION);

        const formData = await collectBugReport({
            labels: ["Z-UISI", "Foo"],
        });
        const labelsFormEntries = formData.getAll("label");
        const labelNames = Array.from(labelsFormEntries.values()).map((label) => label);
        expect(labelNames).toContain("A-Element-R");
        expect(labelNames).toContain("Z-UISI");
        expect(labelNames).toContain("Foo");
    });


    test("Should not panic if there is no crypto", async () => {
        mocked(mockClient.getCrypto).mockReturnValue(undefined);

        const formData = await collectBugReport();
        const labelsFormEntries = formData.getAll("label");
        const labelNames = Array.from(labelsFormEntries.values()).map((label) => label);
        expect(labelNames).not.toContain("A-Element-R");
    });

});
