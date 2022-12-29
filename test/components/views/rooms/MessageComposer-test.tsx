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

import * as React from "react";
import { EventType, MatrixEvent, RoomMember } from "matrix-js-sdk/src/matrix";
import { THREAD_RELATION_TYPE } from "matrix-js-sdk/src/models/thread";
import { act, render, RenderResult } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { createTestClient, mkEvent, mkStubRoom, mockPlatformPeg, stubClient } from "../../../test-utils";
import MessageComposer from "../../../../src/components/views/rooms/MessageComposer";
import MatrixClientContext from "../../../../src/contexts/MatrixClientContext";
import { MatrixClientPeg } from "../../../../src/MatrixClientPeg";
import RoomContext from "../../../../src/contexts/RoomContext";
import { IRoomState } from "../../../../src/components/structures/RoomView";
import ResizeNotifier from "../../../../src/utils/ResizeNotifier";
import { RoomPermalinkCreator } from "../../../../src/utils/permalinks/Permalinks";
import { LocalRoom } from "../../../../src/models/LocalRoom";
import { Features } from "../../../../src/settings/Settings";
import SettingsStore from "../../../../src/settings/SettingsStore";
import { SettingLevel } from "../../../../src/settings/SettingLevel";
import dis from "../../../../src/dispatcher/dispatcher";
import { E2EStatus } from "../../../../src/utils/ShieldUtils";
import { addTextToComposerRTL } from "../../../test-utils/composer";
import UIStore, { UI_EVENTS } from "../../../../src/stores/UIStore";
import { Action } from "../../../../src/dispatcher/actions";
import { VoiceBroadcastInfoState, VoiceBroadcastRecording } from "../../../../src/voice-broadcast";
import { mkVoiceBroadcastInfoStateEvent } from "../../../voice-broadcast/utils/test-utils";
import { SdkContextClass } from "../../../../src/contexts/SDKContext";

jest.mock("../../../../src/components/views/rooms/wysiwyg_composer", () => ({
    SendWysiwygComposer: jest.fn().mockImplementation(() => <div data-testid="wysiwyg-composer" />),
}));

const openStickerPicker = async (renderResult: RenderResult): Promise<void> => {
    await act(async () => {
        await userEvent.click(renderResult.getByLabelText("More options"));
        await userEvent.click(renderResult.getByLabelText("Sticker"));
    });
};

const startVoiceMessage = async (renderResult: RenderResult): Promise<void> => {
    await act(async () => {
        await userEvent.click(renderResult.getByLabelText("More options"));
        await userEvent.click(renderResult.getByLabelText("Voice Message"));
    });
};

describe("MessageComposer", () => {
    stubClient();
    const cli = createTestClient();

    beforeEach(() => {
        mockPlatformPeg();
    });

    afterEach(() => {
        jest.useRealTimers();

        // restore settings
        act(() => {
            [
                "MessageComposerInput.showStickersButton",
                "MessageComposerInput.showPollsButton",
                Features.VoiceBroadcast,
                "feature_wysiwyg_composer",
            ].forEach((setting: string): void => {
                SettingsStore.setValue(setting, null, SettingLevel.DEVICE, SettingsStore.getDefaultValue(setting));
            });
        });
    });

    describe("for a Room", () => {
        const room = mkStubRoom("!roomId:server", "Room 1", cli);

        it("Renders a SendMessageComposer and MessageComposerButtons by default", () => {
            const { renderResult } = wrapAndRender({ room });
            expect(renderResult.getByLabelText("Send a message…")).toBeInTheDocument();
        });

        it("Does not render a SendMessageComposer or MessageComposerButtons when user has no permission", () => {
            const { renderResult } = wrapAndRender({ room }, false);
            expect(renderResult.queryByLabelText("Send a message…")).not.toBeInTheDocument();
            expect(renderResult.getByText("You do not have permission to post to this room")).toBeInTheDocument();
        });

        it("Does not render a SendMessageComposer or MessageComposerButtons when room is tombstoned", () => {
            const { renderResult } = wrapAndRender(
                { room },
                true,
                false,
                mkEvent({
                    event: true,
                    type: "m.room.tombstone",
                    room: room.roomId,
                    user: "@user1:server",
                    skey: "",
                    content: {},
                    ts: Date.now(),
                }),
            );

            expect(renderResult.queryByLabelText("Send a message…")).not.toBeInTheDocument();
            expect(renderResult.getByText("This room has been replaced and is no longer active.")).toBeInTheDocument();
        });

        describe("when receiving a »reply_to_event«", () => {
            let roomContext: IRoomState;
            let resizeNotifier: ResizeNotifier;

            beforeEach(() => {
                jest.useFakeTimers();
                resizeNotifier = {
                    notifyTimelineHeightChanged: jest.fn(),
                } as unknown as ResizeNotifier;
                roomContext = wrapAndRender({
                    room,
                    resizeNotifier,
                }).roomContext;
            });

            it("should call notifyTimelineHeightChanged() for the same context", () => {
                dis.dispatch({
                    action: "reply_to_event",
                    context: roomContext.timelineRenderingType,
                });

                jest.advanceTimersByTime(150);
                expect(resizeNotifier.notifyTimelineHeightChanged).toHaveBeenCalled();
            });

            it("should not call notifyTimelineHeightChanged() for a different context", () => {
                dis.dispatch({
                    action: "reply_to_event",
                    context: "test",
                });

                jest.advanceTimersByTime(150);
                expect(resizeNotifier.notifyTimelineHeightChanged).not.toHaveBeenCalled();
            });
        });

        // test button display depending on settings
        [
            {
                setting: "MessageComposerInput.showStickersButton",
                buttonLabel: "Sticker",
            },
            {
                setting: "MessageComposerInput.showPollsButton",
                buttonLabel: "Poll",
            },
            {
                setting: Features.VoiceBroadcast,
                buttonLabel: "Voice broadcast",
            },
        ].forEach(({ setting, buttonLabel }) => {
            [true, false].forEach((value: boolean) => {
                describe(`when ${setting} = ${value}`, () => {
                    let renderResult: RenderResult;

                    beforeEach(async () => {
                        SettingsStore.setValue(setting, null, SettingLevel.DEVICE, value);
                        renderResult = wrapAndRender({ room }).renderResult;
                        await act(async () => {
                            await userEvent.click(renderResult.getByLabelText("More options"));
                        });
                    });

                    it(`should${value || "not"} display the button`, () => {
                        if (value) {
                            expect(renderResult.getByLabelText(buttonLabel)).toBeInTheDocument();
                        } else {
                            expect(renderResult.queryByLabelText(buttonLabel)).not.toBeInTheDocument();
                        }
                    });

                    describe(`and setting ${setting} to ${!value}`, () => {
                        beforeEach(async () => {
                            // simulate settings update
                            await SettingsStore.setValue(setting, null, SettingLevel.DEVICE, !value);
                            dis.dispatch(
                                {
                                    action: Action.SettingUpdated,
                                    settingName: setting,
                                    newValue: !value,
                                },
                                true,
                            );
                        });

                        it(`should${!value || "not"} display the button`, () => {
                            if (!value) {
                                expect(renderResult.getByLabelText(buttonLabel)).toBeInTheDocument();
                            } else {
                                expect(renderResult.queryByLabelText(buttonLabel)).not.toBeInTheDocument();
                            }
                        });
                    });
                });
            });
        });

        it("should not render the send button", () => {
            const { renderResult } = wrapAndRender({ room });
            expect(renderResult.queryByLabelText("Send message")).not.toBeInTheDocument();
        });

        describe("when a message has been entered", () => {
            let renderResult: RenderResult;

            beforeEach(async () => {
                renderResult = wrapAndRender({ room }).renderResult;
                await addTextToComposerRTL(renderResult, "Hello");
            });

            it("should render the send button", () => {
                expect(renderResult.getByLabelText("Send message")).toBeInTheDocument();
            });
        });

        describe("UIStore interactions", () => {
            let renderResult: RenderResult;
            let resizeCallback: Function;

            beforeEach(() => {
                jest.spyOn(UIStore.instance, "on").mockImplementation((_event: string, listener: Function): any => {
                    resizeCallback = listener;
                });
            });

            describe("when a non-resize event occurred in UIStore", () => {
                beforeEach(async () => {
                    renderResult = wrapAndRender({ room }).renderResult;
                    await openStickerPicker(renderResult);
                    resizeCallback("test", {});
                });

                it("should still display the sticker picker", () => {
                    expect(
                        renderResult.getByText("You don't currently have any stickerpacks enabled"),
                    ).toBeInTheDocument();
                });
            });

            describe("when a resize to narrow event occurred in UIStore", () => {
                beforeEach(async () => {
                    renderResult = wrapAndRender({ room }, true, true).renderResult;
                    await openStickerPicker(renderResult);
                    resizeCallback(UI_EVENTS.Resize, {});
                });

                it("should close the menu", () => {
                    expect(renderResult.queryByLabelText("Sticker")).not.toBeInTheDocument();
                });

                it("should not show the attachment button", () => {
                    expect(renderResult.queryByLabelText("Attachment")).not.toBeInTheDocument();
                });

                it("should close the sticker picker", () => {
                    expect(
                        renderResult.queryByText("You don't currently have any stickerpacks enabled"),
                    ).not.toBeInTheDocument();
                });
            });

            describe("when a resize to non-narrow event occurred in UIStore", () => {
                beforeEach(async () => {
                    renderResult = wrapAndRender({ room }, true, false).renderResult;
                    await openStickerPicker(renderResult);
                    resizeCallback(UI_EVENTS.Resize, {});
                });

                it("should close the menu", () => {
                    expect(renderResult.queryByLabelText("Sticker")).not.toBeInTheDocument();
                });

                it("should show the attachment button", () => {
                    expect(renderResult.getByLabelText("Attachment")).toBeInTheDocument();
                });

                it("should close the sticker picker", () => {
                    expect(
                        renderResult.queryByText("You don't currently have any stickerpacks enabled"),
                    ).not.toBeInTheDocument();
                });
            });
        });

        describe("when not replying to an event", () => {
            it("should pass the expected placeholder to SendMessageComposer", () => {
                const renderResult = wrapAndRender({ room }).renderResult;
                expect(renderResult.getByLabelText("Send a message…")).toBeInTheDocument();
            });

            it("and an e2e status it should pass the expected placeholder to SendMessageComposer", () => {
                const renderResult = wrapAndRender({
                    room,
                    e2eStatus: E2EStatus.Normal,
                }).renderResult;
                expect(renderResult.getByLabelText("Send an encrypted message…")).toBeInTheDocument();
            });
        });

        describe("when replying to an event", () => {
            let replyToEvent: MatrixEvent;
            let props: Partial<React.ComponentProps<typeof MessageComposer>>;

            const checkPlaceholder = (expected: string) => {
                it("should pass the expected placeholder to SendMessageComposer", () => {
                    const renderResult = wrapAndRender(props).renderResult;
                    expect(renderResult.getByLabelText(expected)).toBeInTheDocument();
                });
            };

            const setEncrypted = () => {
                beforeEach(() => {
                    props.e2eStatus = E2EStatus.Normal;
                });
            };

            beforeEach(() => {
                replyToEvent = mkEvent({
                    event: true,
                    type: EventType.RoomMessage,
                    user: cli.getUserId(),
                    content: {},
                });

                props = {
                    room,
                    replyToEvent,
                };
            });

            describe("without encryption", () => {
                checkPlaceholder("Send a reply…");
            });

            describe("with encryption", () => {
                setEncrypted();
                checkPlaceholder("Send an encrypted reply…");
            });

            describe("with a non-thread relation", () => {
                beforeEach(() => {
                    props.relation = { rel_type: "test" };
                });

                checkPlaceholder("Send a reply…");
            });

            describe("that is a thread", () => {
                beforeEach(() => {
                    props.relation = { rel_type: THREAD_RELATION_TYPE.name };
                });

                checkPlaceholder("Reply to thread…");

                describe("with encryption", () => {
                    setEncrypted();
                    checkPlaceholder("Reply to encrypted thread…");
                });
            });
        });

        describe("when recording a voice broadcast and trying to start a voice message", () => {
            let renderResult: RenderResult;

            beforeEach(async () => {
                const recording = new VoiceBroadcastRecording(
                    mkVoiceBroadcastInfoStateEvent(
                        room.roomId,
                        VoiceBroadcastInfoState.Started,
                        "@user:example.com",
                        "ABC123",
                    ),
                    MatrixClientPeg.get(),
                );
                SdkContextClass.instance.voiceBroadcastRecordingsStore.setCurrent(recording);
                renderResult = wrapAndRender({ room }).renderResult;
                await startVoiceMessage(renderResult);
            });

            it("should not start a voice message and display an info dialog", async () => {
                expect(renderResult.queryByLabelText("Stop recording")).not.toBeInTheDocument();
                expect(await renderResult.findByText("Can't start voice message")).toBeInTheDocument();
            });
        });
    });

    describe("for a LocalRoom", () => {
        const localRoom = new LocalRoom("!room:example.com", cli, cli.getUserId()!);

        it("should not show the stickers button", async () => {
            const renderResult = wrapAndRender({ room: localRoom }).renderResult;
            await act(async () => {
                await userEvent.click(renderResult.getByLabelText("More options"));
            });
            expect(renderResult.queryByLabelText("Sticker")).not.toBeInTheDocument();
        });
    });

    it("should render SendWysiwygComposer when enabled", () => {
        const room = mkStubRoom("!roomId:server", "Room 1", cli);
        SettingsStore.setValue("feature_wysiwyg_composer", null, SettingLevel.DEVICE, true);

        const renderResult = wrapAndRender({ room }).renderResult;
        expect(renderResult.getByTestId("wysiwyg-composer")).toBeInTheDocument();
    });
});

function wrapAndRender(
    props: Partial<React.ComponentProps<typeof MessageComposer>> = {},
    canSendMessages = true,
    narrow = false,
    tombstone?: MatrixEvent,
) {
    const mockClient = MatrixClientPeg.get();
    const roomId = "myroomid";
    const room: any = props.room || {
        currentState: undefined,
        roomId,
        client: mockClient,
        getMember: function (userId: string): RoomMember {
            return new RoomMember(roomId, userId);
        },
    };

    const roomContext = {
        room,
        canSendMessages,
        tombstone,
        narrow,
    } as unknown as IRoomState;

    const defaultProps = {
        room,
        resizeNotifier: new ResizeNotifier(),
        permalinkCreator: new RoomPermalinkCreator(room),
    };

    return {
        renderResult: render(
            <MatrixClientContext.Provider value={mockClient}>
                <RoomContext.Provider value={roomContext}>
                    <MessageComposer {...defaultProps} {...props} />
                </RoomContext.Provider>
            </MatrixClientContext.Provider>,
        ),
        roomContext,
    };
}
