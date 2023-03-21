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

import "@testing-library/jest-dom";
import React from "react";
import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
// import userEvent from "@testing-library/user-event";

import MatrixClientContext from "../../../../../../src/contexts/MatrixClientContext";
import RoomContext from "../../../../../../src/contexts/RoomContext";
import { WysiwygAutocomplete } from "../../../../../../src/components/views/rooms/wysiwyg_composer/components/WysiwygAutocomplete";
import { createMocks } from "../utils";
import { stubClient } from "../../../../../test-utils";
import { MatrixClientPeg } from "../../../../../../src/MatrixClientPeg";

describe("WysiwygAutocomplete", () => {
    const renderComponent = (props = {}) => {
        const { mockClient, defaultRoomContext } = createMocks();

        return render(
            <MatrixClientContext.Provider value={mockClient}>
                <RoomContext.Provider value={defaultRoomContext}>
                    <WysiwygAutocomplete
                        suggestion={null}
                        handleMention={function (link: string, text: string): void {
                            throw new Error("Function not implemented.");
                        }}
                    />
                </RoomContext.Provider>
            </MatrixClientContext.Provider>,
        );
    };

    beforeEach(() => {
        stubClient();
        MatrixClientPeg.get();
    });

    it("does not show anything when room is undefined", () => {
        renderComponent();
        expect(screen.queryByRole("presentation")).not.toBeInTheDocument();
    });

    it("does something when we have a valid suggestion", () => {
        renderComponent({ suggestion: { keyChar: "@", text: "abc", type: "mention" } });
        screen.debug();
    });
});
