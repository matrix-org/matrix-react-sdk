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
import React, { createRef } from "react";
import { render, screen, waitFor } from "@testing-library/react";
// import userEvent from "@testing-library/user-event";

import MatrixClientContext from "../../../../../../src/contexts/MatrixClientContext";
import RoomContext from "../../../../../../src/contexts/RoomContext";
import { WysiwygAutocomplete } from "../../../../../../src/components/views/rooms/wysiwyg_composer/components/WysiwygAutocomplete";
import { getRoomContext, mkStubRoom, stubClient } from "../../../../../test-utils";
import Autocomplete from "../../../../../../src/components/views/rooms/Autocomplete";
import Autocompleter, { ICompletion } from "../../../../../../src/autocomplete/Autocompleter";
import AutocompleteProvider from "../../../../../../src/autocomplete/AutocompleteProvider";

const mockCompletion: ICompletion[] = [
    {
        type: "user",
        completion: "user_1",
        completionId: "@user_1:host.local",
        range: { start: 1, end: 1 },
        component: <div>user_1</div>,
    },
    {
        type: "user",
        completion: "user_2",
        completionId: "@user_2:host.local",
        range: { start: 1, end: 1 },
        component: <div>user_2</div>,
    },
];
const constructMockProvider = (data: ICompletion[]) =>
    ({
        getCompletions: jest.fn().mockImplementation(async () => data),
        getName: jest.fn().mockReturnValue("hello"),
        renderCompletions: jest.fn().mockImplementation((...args) => {
            mockCompletion.map((c) => c.component);
        }),
    } as unknown as AutocompleteProvider);

describe("WysiwygAutocomplete", () => {
    beforeAll(() => {
        // scrollTo not implemented in JSDOM
        window.HTMLElement.prototype.scrollTo = function () {};
        jest.useFakeTimers();
    });
    afterAll(() => jest.useRealTimers());

    const autocompleteRef = createRef<Autocomplete>();
    const AutocompleterSpy = jest.spyOn(Autocompleter.prototype, "getCompletions").mockImplementation((...args) => {
        return Promise.resolve([
            {
                completions: mockCompletion,
                provider: constructMockProvider(mockCompletion),
                command: { command: "truthy" },
            },
        ]);
    });

    const renderComponent = (props = {}) => {
        const mockClient = stubClient();
        const mockRoom = mkStubRoom("test_room", "test_room", mockClient);
        const mockRoomContext = getRoomContext(mockRoom, {});

        return render(
            <MatrixClientContext.Provider value={mockClient}>
                <RoomContext.Provider value={mockRoomContext}>
                    <WysiwygAutocomplete
                        ref={autocompleteRef}
                        suggestion={null}
                        handleMention={function (link: string, text: string): void {
                            throw new Error("Function not implemented.");
                        }}
                        {...props}
                    />
                </RoomContext.Provider>
            </MatrixClientContext.Provider>,
        );
    };

    it("does not show any suggestions when room is undefined", () => {
        const { container } = render(
            <WysiwygAutocomplete
                ref={autocompleteRef}
                suggestion={null}
                handleMention={function (link: string, text: string): void {
                    throw new Error("Function not implemented.");
                }}
            />,
        );
        expect(container).toBeEmptyDOMElement();
    });

    it("does not show any suggestions with a null suggestion prop", () => {
        // default in renderComponent is a null suggestion
        renderComponent();
        expect(screen.getByTestId("autocomplete-wrapper")).toBeEmptyDOMElement();
    });

    it.only("calls Autocompleter when given a valid suggestion prop", async () => {
        // default in renderComponent is a null suggestion
        renderComponent({ suggestion: { keyChar: "@", text: "abc", type: "mention" } });
        expect(screen.getByTestId("autocomplete-wrapper")).toBeEmptyDOMElement();
        jest.runAllTimers();

        await waitFor(() => {
            expect(autocompleteRef.current?.state.completions).not.toEqual([]);
        });

        screen.debug();
    });
});
