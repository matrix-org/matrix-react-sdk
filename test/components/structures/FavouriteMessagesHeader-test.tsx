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
import { render } from "@testing-library/react";

import { stubClient } from "../../test-utils";
import SettingsStore from "../../../src/settings/SettingsStore";
import FavouriteMessagesHeader from "../../../src/components/structures/FavouriteMessagesView/FavouriteMessagesHeader";

describe("FavouriteMessagesHeader", () => {
    beforeEach(async () => {
        jest.spyOn(SettingsStore, "getValue").mockImplementation((setting) => setting === "feature_favourite_messages");
        stubClient();
    });

    afterEach(async () => {
        jest.resetAllMocks();
    });

    it("displays a title and buttons", async () => {
        const view = render(<FavouriteMessagesHeader query="" handleSearchQuery={() => {}} />);
        view.getByTestId("avatar-img");
        view.getByText("Favourite Messages");
        view.getByLabelText("Search");
        view.getByLabelText("Clear");
        expect(view.asFragment()).toMatchSnapshot();
    });

    it("displays a search box after Search is clicked", async () => {
        // Given a favourites header with a (hidden) search query
        const view = render(<FavouriteMessagesHeader query="foo" handleSearchQuery={() => {}} />);
        expect(view.queryByRole("textbox")).toBeNull();

        // When we click Search
        view.getByLabelText("Search").click();

        // Then the search box appears
        const textbox = view.getByRole("textbox");
        // And it contains our search query
        expect(textbox.getAttribute("placeholder")).toBe("Search...");
        expect(textbox.getAttribute("value")).toBe("foo");

        expect(view.asFragment()).toMatchSnapshot();
    });

    it("hides the search box when you click Cancel", async () => {
        // Given a favourites header where Search has been clicked
        const view = render(<FavouriteMessagesHeader query="" handleSearchQuery={() => {}} />);
        expect(view.queryByRole("textbox")).toBeNull();
        view.getByLabelText("Search").click();

        // Sanity: Search button has disappeared and textbox has appeared
        expect(view.queryByLabelText("Search")).toBeNull();
        view.getByRole("textbox");

        // When we click Cancel
        view.getByLabelText("Cancel").click();

        // Then the search box disappeared
        expect(view.queryByRole("textbox")).toBeNull();
        // And the Cancel button transformed back into Search
        expect(view.queryByLabelText("Cancel")).toBeNull();
        view.getByLabelText("Search");
    });
});
