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

import { Wysiwyg, WysiwygEvent } from "@matrix-org/matrix-wysiwyg";
import { useCallback } from "react";
import { MatrixClient } from "matrix-js-sdk/src/matrix";

import { useSettingValue } from "../../../../../hooks/useSettings";
import { getKeyBindingsManager } from "../../../../../KeyBindingsManager";
import { KeyBindingAction } from "../../../../../accessibility/KeyboardShortcuts";
import { findEditableEvent } from "../../../../../utils/EventUtils";
import dis from "../../../../../dispatcher/dispatcher";
import { Action } from "../../../../../dispatcher/actions";
import { useRoomContext } from "../../../../../contexts/RoomContext";
import { IRoomState } from "../../../../structures/RoomView";
import { ComposerContextState, useComposerContext } from "../ComposerContext";
import EditorStateTransfer from "../../../../../utils/EditorStateTransfer";
import { useMatrixClientContext } from "../../../../../contexts/MatrixClientContext";
import { isCaretAtEnd, isCaretAtStart } from "../utils/selection";
import { getEventsFromEditorStateTransfer, getEventsFromRoom } from "../utils/event";
import { endEditing } from "../utils/editing";
import Autocomplete from "../../Autocomplete";
import { handleEventWithAutocomplete } from "./utils";
import ContentMessages from "../../../../../ContentMessages";

export function useInputEventProcessor(
    onSend: () => void,
    autocompleteRef: React.RefObject<Autocomplete>,
    initialContent?: string,
): (event: WysiwygEvent, composer: Wysiwyg, editor: HTMLElement) => WysiwygEvent | null {
    const roomContext = useRoomContext();
    const composerContext = useComposerContext();
    const mxClient = useMatrixClientContext();
    const isCtrlEnterToSend = useSettingValue<boolean>("MessageComposerInput.ctrlEnterToSend");

    return useCallback(
        (event: WysiwygEvent, composer: Wysiwyg, editor: HTMLElement) => {
            if (event instanceof ClipboardEvent) {
                // This code unashamedly pillaged from SendMessageComposer.onPaste with the arguments
                // tweaked a bit to see if it works.
                // It does work, just need to figure out the `this.props.relation` translation

                const { clipboardData } = event;
                if (clipboardData?.files.length && !clipboardData.types.includes("text/rtf")) {
                    if (roomContext.room?.roomId) {
                        ContentMessages.sharedInstance().sendContentListToRoom(
                            Array.from(clipboardData.files),
                            roomContext.room.roomId,
                            {}, // this.props.relation, is IEventRelation, which is passed through MessageComposer
                            // which it looks like comes from ThreadView
                            // looks like there is a call to this.props.room.getThread(this.props.mxEvent.getId())

                            // looks like skipping out this bit means when you try and paste into a thread in the right
                            // panel, it actually just appears in the timeline
                            mxClient,
                            roomContext.timelineRenderingType,
                        );
                        return null;
                    }
                }

                return event;
            }

            const send = (): void => {
                event.stopPropagation?.();
                event.preventDefault?.();
                // do not send the message if we have the autocomplete open, regardless of settings
                if (autocompleteRef?.current && !autocompleteRef.current.state.hide) {
                    return;
                }
                onSend();
            };

            const isKeyboardEvent = event instanceof KeyboardEvent;
            if (isKeyboardEvent) {
                return handleKeyboardEvent(
                    event,
                    send,
                    initialContent,
                    composer,
                    editor,
                    roomContext,
                    composerContext,
                    mxClient,
                    autocompleteRef,
                );
            } else {
                return handleInputEvent(event, send, isCtrlEnterToSend);
            }
        },
        [isCtrlEnterToSend, onSend, initialContent, roomContext, composerContext, mxClient, autocompleteRef],
    );
}

type Send = () => void;

function handleKeyboardEvent(
    event: KeyboardEvent,
    send: Send,
    initialContent: string | undefined,
    composer: Wysiwyg,
    editor: HTMLElement,
    roomContext: IRoomState,
    composerContext: ComposerContextState,
    mxClient: MatrixClient | undefined,
    autocompleteRef: React.RefObject<Autocomplete>,
): KeyboardEvent | null {
    const { editorStateTransfer } = composerContext;
    const isEditing = Boolean(editorStateTransfer);
    const isEditorModified = isEditing ? initialContent !== composer.content() : composer.content().length !== 0;
    const action = getKeyBindingsManager().getMessageComposerAction(event);

    // we need autocomplete to take priority when it is open for using enter to select
    const isHandledByAutocomplete = handleEventWithAutocomplete(autocompleteRef, event);
    if (isHandledByAutocomplete) {
        return event;
    }

    // taking the client from context gives us an client | undefined type, narrow it down
    if (mxClient === undefined) {
        return null;
    }

    switch (action) {
        case KeyBindingAction.SendMessage:
            send();
            return null;
        case KeyBindingAction.EditPrevMessage: {
            // Or if the caret is not at the beginning of the editor
            // Or the editor is modified
            if (!isCaretAtStart(editor) || isEditorModified) {
                break;
            }

            const isDispatched = dispatchEditEvent(
                event,
                false,
                editorStateTransfer,
                composerContext,
                roomContext,
                mxClient,
            );

            if (isDispatched) {
                return null;
            }

            break;
        }
        case KeyBindingAction.EditNextMessage: {
            // If not in edition
            // Or if the caret is not at the end of the editor
            // Or the editor is modified
            if (!editorStateTransfer || !isCaretAtEnd(editor) || isEditorModified) {
                break;
            }

            const isDispatched = dispatchEditEvent(
                event,
                true,
                editorStateTransfer,
                composerContext,
                roomContext,
                mxClient,
            );
            if (!isDispatched) {
                endEditing(roomContext);
                event.preventDefault();
                event.stopPropagation();
            }

            return null;
        }
    }

    return event;
}

function dispatchEditEvent(
    event: KeyboardEvent,
    isForward: boolean,
    editorStateTransfer: EditorStateTransfer | undefined,
    composerContext: ComposerContextState,
    roomContext: IRoomState,
    mxClient: MatrixClient,
): boolean {
    const foundEvents = editorStateTransfer
        ? getEventsFromEditorStateTransfer(editorStateTransfer, roomContext, mxClient)
        : getEventsFromRoom(composerContext, roomContext);
    if (!foundEvents) {
        return false;
    }

    const newEvent = findEditableEvent({
        events: foundEvents,
        isForward,
        fromEventId: editorStateTransfer?.getEvent().getId(),
        matrixClient: mxClient,
    });
    if (newEvent) {
        dis.dispatch({
            action: Action.EditEvent,
            event: newEvent,
            timelineRenderingType: roomContext.timelineRenderingType,
        });
        event.stopPropagation();
        event.preventDefault();
        return true;
    }
    return false;
}

type InputEvent = Exclude<WysiwygEvent, KeyboardEvent | ClipboardEvent>;

function handleInputEvent(event: InputEvent, send: Send, isCtrlEnterToSend: boolean): InputEvent | null {
    switch (event.inputType) {
        case "insertParagraph":
            if (!isCtrlEnterToSend) {
                send();
                return null;
            }
            break;
        case "sendMessage":
            if (isCtrlEnterToSend) {
                send();
                return null;
            }
            break;
    }

    return event;
}
