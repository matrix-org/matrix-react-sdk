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
import { ReactWrapper, mount } from "enzyme";
import { MatrixEvent } from "matrix-js-sdk/src/models/event";
import { MessageEvent } from 'matrix-events-sdk';
import { act } from "react-test-renderer";

import EditMessageComposerWithMatrixClient from "../../../../src/components/views/rooms/EditMessageComposer";
import EditorStateTransfer from "../../../../src/utils/EditorStateTransfer";
import MatrixClientContext from "../../../../src/contexts/MatrixClientContext";
import { stubClient } from "../../../test-utils";
import { MatrixClientPeg } from "../../../../src/MatrixClientPeg";

describe("EditMessageComposer", () => {
    beforeAll(() => {
        stubClient();
    });

    describe("save button disabled state behaves correctly", () => {
        it("should handle regular text changes", () => {
            const mxEvent = new MatrixEvent(MessageEvent.from("world").serialize());
            const wrapper = createEditor(mxEvent);
            let saveButton = wrapper.find(".mx_AccessibleButton_kind_primary");

            expect(saveButton.props()["aria-disabled"]).toBeTruthy();
            addText(wrapper, "Hello ");

            saveButton = wrapper.find(".mx_AccessibleButton_kind_primary");
            expect(saveButton.props()["aria-disabled"]).toBeFalsy();
        });
    });
});

const addText = (wrapper: ReactWrapper, text: string) => act(() => {
    // couldn't get input event on contenteditable to work
    // paste works without illegal private method access
    const pasteEvent = {
        clipboardData: {
            types: [],
            files: [],
            getData: type => type === "text/plain" ? text : undefined,
        },
    };
    wrapper.find('[role="textbox"]').simulate('paste', pasteEvent);
    wrapper.update();
});

const createEditor = (mxEvent: MatrixEvent): ReactWrapper => {
    const client = MatrixClientPeg.get();
    const editState = new EditorStateTransfer(mxEvent);

    return mount(
        <MatrixClientContext.Provider value={client}>
            <EditMessageComposerWithMatrixClient editState={editState} />
        </MatrixClientContext.Provider>,
    );
};
