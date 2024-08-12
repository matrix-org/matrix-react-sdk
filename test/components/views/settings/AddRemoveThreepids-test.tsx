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
import { ThreepidMedium } from "matrix-js-sdk/src/matrix";
import React from "react";

import { AddRemoveThreepids } from "../../../../src/components/views/settings/AddRemoveThreepids";

const EMAIL1 = {
    medium: ThreepidMedium.Email,
    address: "alice@nowhere.dummy",
};

describe("AddRemoveThreepids", () => {
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
                threepids={[]}
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
                threepids={[EMAIL1]}
                isLoading={false}
                onChange={() => {}}
            />,
        );

        expect(container).toMatchSnapshot();
    });
});
