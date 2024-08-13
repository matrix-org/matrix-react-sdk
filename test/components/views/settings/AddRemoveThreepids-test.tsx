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

import { render, screen } from "@testing-library/react";
import { MatrixClient, ThreepidMedium } from "matrix-js-sdk/src/matrix";
import React from "react";
import userEvent from "@testing-library/user-event";
import { mocked } from "jest-mock";

import { AddRemoveThreepids } from "../../../../src/components/views/settings/AddRemoveThreepids";
import { stubClient } from "../../../test-utils";
import MatrixClientContext from "../../../../src/contexts/MatrixClientContext";

const EMAIL1 = {
    medium: ThreepidMedium.Email,
    address: "alice@nowhere.dummy",
};

const PHONE1 = {
    medium: ThreepidMedium.Phone,
    address: "447700900000",
};

const PHONE1_LOCALNUM = "07700900000";

describe("AddRemoveThreepids", () => {
    let client: MatrixClient;

    beforeEach(() => {
        client = stubClient();
    });

    const clientProviderWrapper: React.FC = ({ children }) => (
        <MatrixClientContext.Provider value={client}>{children}</MatrixClientContext.Provider>
    );

    it("should render a loader while loading", async () => {
        render(
            <AddRemoveThreepids
                mode="hs"
                medium={ThreepidMedium.Email}
                threepids={[]}
                isLoading={true}
                onChange={() => {}}
            />,
        );

        expect(screen.getByLabelText("Loading…")).toBeInTheDocument();
    });

    it("should render email addresses", async () => {
        const { container } = render(
            <AddRemoveThreepids
                mode="hs"
                medium={ThreepidMedium.Email}
                threepids={[EMAIL1]}
                isLoading={false}
                onChange={() => {}}
            />,
        );

        expect(container).toMatchSnapshot();
    });

    it("should render phone numbers", async () => {
        const { container } = render(
            <AddRemoveThreepids
                mode="hs"
                medium={ThreepidMedium.Phone}
                threepids={[PHONE1]}
                isLoading={false}
                onChange={() => {}}
            />,
        );

        expect(container).toMatchSnapshot();
    });

    it("should handle no email addresses", async () => {
        const { container } = render(
            <AddRemoveThreepids
                mode="hs"
                medium={ThreepidMedium.Email}
                threepids={[]}
                isLoading={false}
                onChange={() => {}}
            />,
        );

        expect(container).toMatchSnapshot();
    });

    it("should add an email address", async () => {
        const onChangeFn = jest.fn();
        mocked(client.requestAdd3pidEmailToken).mockResolvedValue({ sid: "1" });

        render(
            <AddRemoveThreepids
                mode="hs"
                medium={ThreepidMedium.Email}
                threepids={[]}
                isLoading={false}
                onChange={onChangeFn}
            />,
            {
                wrapper: clientProviderWrapper,
            },
        );

        const input = screen.getByRole("textbox", { name: "Email Address" });
        await userEvent.type(input, EMAIL1.address);
        const addButton = screen.getByRole("button", { name: "Add" });
        await userEvent.click(addButton);

        expect(client.requestAdd3pidEmailToken).toHaveBeenCalledWith(EMAIL1.address, client.generateClientSecret(), 1);
        const continueButton = screen.getByRole("button", { name: "Continue" });

        expect(continueButton).toBeEnabled();

        await userEvent.click(continueButton);

        expect(client.addThreePidOnly).toHaveBeenCalledWith({
            client_secret: client.generateClientSecret(),
            sid: "1",
            auth: undefined,
        });

        expect(onChangeFn).toHaveBeenCalled();
    });

    it("should add a phone number", async () => {
        const onChangeFn = jest.fn();
        mocked(client.requestAdd3pidMsisdnToken).mockResolvedValue({
            sid: "1",
            msisdn: PHONE1.address,
            intl_fmt: "+" + PHONE1.address,
            success: true,
            submit_url: "https://example.dummy",
        });

        render(
            <AddRemoveThreepids
                mode="hs"
                medium={ThreepidMedium.Phone}
                threepids={[]}
                isLoading={false}
                onChange={onChangeFn}
            />,
            {
                wrapper: clientProviderWrapper,
            },
        );

        const input = screen.getByRole("textbox", { name: "Phone Number" });
        await userEvent.type(input, PHONE1_LOCALNUM);

        const countryDropdown = screen.getByRole("button", { name: "Country Dropdown" });
        await userEvent.click(countryDropdown);
        const gbOption = screen.getByRole("option", { name: "🇬🇧 United Kingdom (+44)" });
        await userEvent.click(gbOption);

        const addButton = screen.getByRole("button", { name: "Add" });
        await userEvent.click(addButton);

        expect(client.requestAdd3pidMsisdnToken).toHaveBeenCalledWith(
            "GB",
            PHONE1_LOCALNUM,
            client.generateClientSecret(),
            1,
        );
        const continueButton = screen.getByRole("button", { name: "Continue" });

        expect(continueButton).toHaveAttribute("aria-disabled", "true");

        const verificationInput = screen.getByRole("textbox", { name: "Verification code" });
        await userEvent.type(verificationInput, "123456");

        expect(continueButton).not.toHaveAttribute("aria-disabled", "true");
        await userEvent.click(continueButton);

        expect(client.addThreePidOnly).toHaveBeenCalledWith({
            client_secret: client.generateClientSecret(),
            sid: "1",
            auth: undefined,
        });

        expect(onChangeFn).toHaveBeenCalled();
    });

    it("should remove an email address", async () => {
        const onChangeFn = jest.fn();
        render(
            <AddRemoveThreepids
                mode="hs"
                medium={ThreepidMedium.Email}
                threepids={[EMAIL1]}
                isLoading={false}
                onChange={onChangeFn}
            />,
            {
                wrapper: clientProviderWrapper,
            },
        );

        const removeButton = screen.getByRole("button", { name: "Remove" });
        await userEvent.click(removeButton);

        expect(screen.getByText(`Remove ${EMAIL1.address}?`)).toBeVisible();

        const confirmRemoveButton = screen.getByRole("button", { name: "Remove" });
        await userEvent.click(confirmRemoveButton);

        expect(client.deleteThreePid).toHaveBeenCalledWith(ThreepidMedium.Email, EMAIL1.address);
        expect(onChangeFn).toHaveBeenCalled();
    });

    it("should remove an phone number", async () => {
        const onChangeFn = jest.fn();
        render(
            <AddRemoveThreepids
                mode="hs"
                medium={ThreepidMedium.Phone}
                threepids={[PHONE1]}
                isLoading={false}
                onChange={onChangeFn}
            />,
            {
                wrapper: clientProviderWrapper,
            },
        );

        const removeButton = screen.getByRole("button", { name: "Remove" });
        await userEvent.click(removeButton);

        expect(screen.getByText(`Remove ${PHONE1.address}?`)).toBeVisible();

        const confirmRemoveButton = screen.getByRole("button", { name: "Remove" });
        await userEvent.click(confirmRemoveButton);

        expect(client.deleteThreePid).toHaveBeenCalledWith(ThreepidMedium.Phone, PHONE1.address);
        expect(onChangeFn).toHaveBeenCalled();
    });
});
