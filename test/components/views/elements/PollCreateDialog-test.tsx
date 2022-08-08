/*
Copyright 2021 The Matrix.org Foundation C.I.C.

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
// eslint-disable-next-line deprecate/import
import { mount, ReactWrapper } from "enzyme";
import { Room } from "matrix-js-sdk/src/models/room";
import {
    M_POLL_KIND_DISCLOSED,
    M_POLL_KIND_UNDISCLOSED,
    M_POLL_START,
    M_TEXT,
    PollStartEvent,
} from 'matrix-events-sdk';
import { MatrixEvent } from 'matrix-js-sdk/src/models/event';

import {
    findById,
    getMockClientWithEventEmitter,
} from '../../../test-utils';
import { MatrixClientPeg } from "../../../../src/MatrixClientPeg";
import PollCreateDialog from "../../../../src/components/views/elements/PollCreateDialog";
import MatrixClientContext from '../../../../src/contexts/MatrixClientContext';

// Fake date to give a predictable snapshot
const realDateNow = Date.now;
const realDateToISOString = Date.prototype.toISOString;
Date.now = jest.fn(() => 2345678901234);
// eslint-disable-next-line no-extend-native
Date.prototype.toISOString = jest.fn(() => "2021-11-23T14:35:14.240Z");

afterAll(() => {
    Date.now = realDateNow;
    // eslint-disable-next-line no-extend-native
    Date.prototype.toISOString = realDateToISOString;
});

describe("PollCreateDialog", () => {
    const mockClient = getMockClientWithEventEmitter({
        sendEvent: jest.fn().mockResolvedValue({ event_id: '1' }),
    });

    beforeEach(() => {
        mockClient.sendEvent.mockClear();
    });

    it("renders a blank poll", () => {
        const dialog = mount(
            <PollCreateDialog room={createRoom()} onFinished={jest.fn()} />,
            {
                wrappingComponent: MatrixClientContext.Provider,
                wrappingComponentProps: { value: mockClient },
            },
        );
        expect(dialog.html()).toMatchSnapshot();
    });

    it("autofocuses the poll topic on mount", () => {
        const dialog = mount(
            <PollCreateDialog room={createRoom()} onFinished={jest.fn()} />,
        );
        expect(findById(dialog, 'poll-topic-input').at(0).props().autoFocus).toEqual(true);
    });

    it("autofocuses the new poll option field after clicking add option button", () => {
        const dialog = mount(
            <PollCreateDialog room={createRoom()} onFinished={jest.fn()} />,
        );
        expect(findById(dialog, 'poll-topic-input').at(0).props().autoFocus).toEqual(true);

        dialog.find("div.mx_PollCreateDialog_addOption").simulate("click");

        expect(findById(dialog, 'poll-topic-input').at(0).props().autoFocus).toEqual(false);
        expect(findById(dialog, 'pollcreate_option_1').at(0).props().autoFocus).toEqual(false);
        expect(findById(dialog, 'pollcreate_option_2').at(0).props().autoFocus).toEqual(true);
    });

    it("renders a question and some options", () => {
        const dialog = mount(
            <PollCreateDialog room={createRoom()} onFinished={jest.fn()} />,
        );
        expect(submitIsDisabled(dialog)).toBe(true);

        // When I set some values in the boxes
        changeValue(
            dialog,
            "Question or topic",
            "How many turnips is the optimal number?",
        );
        changeValue(dialog, "Option 1", "As many as my neighbour");
        changeValue(dialog, "Option 2", "The question is meaningless");
        dialog.find("div.mx_PollCreateDialog_addOption").simulate("click");
        changeValue(dialog, "Option 3", "Mu");
        expect(dialog.html()).toMatchSnapshot();
    });

    it("renders info from a previous event", () => {
        const previousEvent: MatrixEvent = new MatrixEvent(
            PollStartEvent.from(
                "Poll Q",
                ["Answer 1", "Answer 2"],
                M_POLL_KIND_DISCLOSED,
            ).serialize(),
        );

        const dialog = mount(
            <PollCreateDialog
                room={createRoom()}
                onFinished={jest.fn()}
                editingMxEvent={previousEvent}
            />,
        );

        expect(submitIsDisabled(dialog)).toBe(false);
        expect(dialog.html()).toMatchSnapshot();
    });

    it("doesn't allow submitting until there are options", () => {
        const dialog = mount(
            <PollCreateDialog room={createRoom()} onFinished={jest.fn()} />,
        );
        expect(submitIsDisabled(dialog)).toBe(true);
    });

    it("does allow submitting when there are options and a question", () => {
        // Given a dialog with no info in (which I am unable to submit)
        const dialog = mount(
            <PollCreateDialog room={createRoom()} onFinished={jest.fn()} />,
        );
        expect(submitIsDisabled(dialog)).toBe(true);

        // When I set some values in the boxes
        changeValue(dialog, "Question or topic", "Q");
        changeValue(dialog, "Option 1", "A1");
        changeValue(dialog, "Option 2", "A2");

        // Then I am able to submit
        expect(submitIsDisabled(dialog)).toBe(false);
    });

    it("shows the open poll description at first", () => {
        const dialog = mount(
            <PollCreateDialog room={createRoom()} onFinished={jest.fn()} />,
        );
        expect(
            dialog.find('select').prop("value"),
        ).toEqual(M_POLL_KIND_DISCLOSED.name);
        expect(
            dialog.find('p').text(),
        ).toEqual("Voters see results as soon as they have voted");
    });

    it("shows the closed poll description if we choose it", () => {
        const dialog = mount(
            <PollCreateDialog room={createRoom()} onFinished={jest.fn()} />,
        );
        changeKind(dialog, M_POLL_KIND_UNDISCLOSED.name);
        expect(
            dialog.find('select').prop("value"),
        ).toEqual(M_POLL_KIND_UNDISCLOSED.name);
        expect(
            dialog.find('p').text(),
        ).toEqual("Results are only revealed when you end the poll");
    });

    it("shows the open poll description if we choose it", () => {
        const dialog = mount(
            <PollCreateDialog room={createRoom()} onFinished={jest.fn()} />,
        );
        changeKind(dialog, M_POLL_KIND_UNDISCLOSED.name);
        changeKind(dialog, M_POLL_KIND_DISCLOSED.name);
        expect(
            dialog.find('select').prop("value"),
        ).toEqual(M_POLL_KIND_DISCLOSED.name);
        expect(
            dialog.find('p').text(),
        ).toEqual("Voters see results as soon as they have voted");
    });

    it("shows the closed poll description when editing a closed poll", () => {
        const previousEvent: MatrixEvent = new MatrixEvent(
            PollStartEvent.from(
                "Poll Q",
                ["Answer 1", "Answer 2"],
                M_POLL_KIND_UNDISCLOSED,
            ).serialize(),
        );
        previousEvent.event.event_id = "$prevEventId";

        const dialog = mount(
            <PollCreateDialog
                room={createRoom()}
                onFinished={jest.fn()}
                editingMxEvent={previousEvent}
            />,
        );

        expect(
            dialog.find('select').prop("value"),
        ).toEqual(M_POLL_KIND_UNDISCLOSED.name);
        expect(
            dialog.find('p').text(),
        ).toEqual("Results are only revealed when you end the poll");
    });

    it("displays a spinner after submitting", () => {
        const dialog = mount(
            <PollCreateDialog room={createRoom()} onFinished={jest.fn()} />,
        );
        changeValue(dialog, "Question or topic", "Q");
        changeValue(dialog, "Option 1", "A1");
        changeValue(dialog, "Option 2", "A2");
        expect(dialog.find("Spinner").length).toBe(0);

        dialog.find("button").simulate("click");
        expect(dialog.find("Spinner").length).toBe(1);
    });

    it("sends a poll create event when submitted", () => {
        const dialog = mount(
            <PollCreateDialog room={createRoom()} onFinished={jest.fn()} />,
        );
        changeValue(dialog, "Question or topic", "Q");
        changeValue(dialog, "Option 1", "A1");
        changeValue(dialog, "Option 2", "A2");

        dialog.find("button").simulate("click");
        const [, , eventType, sentEventContent] = mockClient.sendEvent.mock.calls[0];
        expect(M_POLL_START.matches(eventType)).toBeTruthy();
        expect(sentEventContent).toEqual(
            {
                [M_TEXT.name]: "Q\n1. A1\n2. A2",
                [M_POLL_START.name]: {
                    "answers": [
                        {
                            "id": expect.any(String),
                            [M_TEXT.name]: "A1",
                        },
                        {
                            "id": expect.any(String),
                            [M_TEXT.name]: "A2",
                        },
                    ],
                    "kind": M_POLL_KIND_DISCLOSED.name,
                    "max_selections": 1,
                    "question": {
                        "body": "Q",
                        "format": undefined,
                        "formatted_body": undefined,
                        "msgtype": "m.text",
                        [M_TEXT.name]: "Q",
                    },
                },
            },
        );
    });

    it("sends a poll edit event when editing", () => {
        const previousEvent: MatrixEvent = new MatrixEvent(
            PollStartEvent.from(
                "Poll Q",
                ["Answer 1", "Answer 2"],
                M_POLL_KIND_DISCLOSED,
            ).serialize(),
        );
        previousEvent.event.event_id = "$prevEventId";

        const dialog = mount(
            <PollCreateDialog
                room={createRoom()}
                onFinished={jest.fn()}
                editingMxEvent={previousEvent}
            />,
        );

        changeValue(dialog, "Question or topic", "Poll Q updated");
        changeValue(dialog, "Option 2", "Answer 2 updated");
        changeKind(dialog, M_POLL_KIND_UNDISCLOSED.name);
        dialog.find("button").simulate("click");

        const [, , eventType, sentEventContent] = mockClient.sendEvent.mock.calls[0];
        expect(M_POLL_START.matches(eventType)).toBeTruthy();
        expect(sentEventContent).toEqual(
            {
                "m.new_content": {
                    [M_TEXT.name]: "Poll Q updated\n1. Answer 1\n2. Answer 2 updated",
                    [M_POLL_START.name]: {
                        "answers": [
                            {
                                "id": expect.any(String),
                                [M_TEXT.name]: "Answer 1",
                            },
                            {
                                "id": expect.any(String),
                                [M_TEXT.name]: "Answer 2 updated",
                            },
                        ],
                        "kind": M_POLL_KIND_UNDISCLOSED.name,
                        "max_selections": 1,
                        "question": {
                            "body": "Poll Q updated",
                            "format": undefined,
                            "formatted_body": undefined,
                            "msgtype": "m.text",
                            [M_TEXT.name]: "Poll Q updated",
                        },
                    },
                },
                "m.relates_to": {
                    "event_id": previousEvent.getId(),
                    "rel_type": "m.replace",
                },
            },
        );
    });
});

function createRoom(): Room {
    return new Room(
        "roomid",
        MatrixClientPeg.get(),
        "@name:example.com",
        {},
    );
}

function changeValue(wrapper: ReactWrapper, labelText: string, value: string) {
    wrapper.find(`input[label="${labelText}"]`).simulate(
        "change",
        { target: { value: value } },
    );
}

function changeKind(wrapper: ReactWrapper, value: string) {
    wrapper.find("select").simulate(
        "change",
        { target: { value: value } },
    );
}

function submitIsDisabled(wrapper: ReactWrapper) {
    return wrapper.find('button[type="submit"]').prop("aria-disabled") === true;
}

