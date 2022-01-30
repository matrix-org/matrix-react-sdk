/*
Copyright 2021 Clemens Zeidler

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

import { IKeyBindingsProvider, KeyBinding } from "./KeyBindingsManager";
import { isMac, Key } from "./Keyboard";
import SettingsStore from "./settings/SettingsStore";
import SdkConfig from "./SdkConfig";
import { KeyBindingAction } from "./accessibility/KeyboardShortcuts";

const messageComposerBindings = (): KeyBinding[] => {
    const bindings: KeyBinding[] = [
        {
            action: KeyBindingAction.SelectPrevSendHistory,
            keyCombo: {
                key: Key.ARROW_UP,
                altKey: true,
                ctrlKey: true,
            },
        },
        {
            action: KeyBindingAction.SelectNextSendHistory,
            keyCombo: {
                key: Key.ARROW_DOWN,
                altKey: true,
                ctrlKey: true,
            },
        },
        {
            action: KeyBindingAction.EditPrevMessage,
            keyCombo: {
                key: Key.ARROW_UP,
            },
        },
        {
            action: KeyBindingAction.EditNextMessage,
            keyCombo: {
                key: Key.ARROW_DOWN,
            },
        },
        {
            action: KeyBindingAction.CancelReplyOrEdit,
            keyCombo: {
                key: Key.ESCAPE,
            },
        },
        {
            action: KeyBindingAction.FormatBold,
            keyCombo: {
                key: Key.B,
                ctrlOrCmdKey: true,
            },
        },
        {
            action: KeyBindingAction.FormatItalics,
            keyCombo: {
                key: Key.I,
                ctrlOrCmdKey: true,
            },
        },
        {
            action: KeyBindingAction.FormatQuote,
            keyCombo: {
                key: Key.GREATER_THAN,
                ctrlOrCmdKey: true,
                shiftKey: true,
            },
        },
        {
            action: KeyBindingAction.EditUndo,
            keyCombo: {
                key: Key.Z,
                ctrlOrCmdKey: true,
            },
        },
        {
            action: KeyBindingAction.MoveCursorToStart,
            keyCombo: {
                key: Key.HOME,
                ctrlOrCmdKey: true,
            },
        },
        {
            action: KeyBindingAction.MoveCursorToEnd,
            keyCombo: {
                key: Key.END,
                ctrlOrCmdKey: true,
            },
        },
    ];
    if (isMac) {
        bindings.push({
            action: KeyBindingAction.EditRedo,
            keyCombo: {
                key: Key.Z,
                ctrlOrCmdKey: true,
                shiftKey: true,
            },
        });
    } else {
        bindings.push({
            action: KeyBindingAction.EditRedo,
            keyCombo: {
                key: Key.Y,
                ctrlOrCmdKey: true,
            },
        });
    }
    if (SettingsStore.getValue('MessageComposerInput.ctrlEnterToSend')) {
        bindings.push({
            action: KeyBindingAction.SendMessage,
            keyCombo: {
                key: Key.ENTER,
                ctrlOrCmdKey: true,
            },
        });
        bindings.push({
            action: KeyBindingAction.NewLine,
            keyCombo: {
                key: Key.ENTER,
            },
        });
        bindings.push({
            action: KeyBindingAction.NewLine,
            keyCombo: {
                key: Key.ENTER,
                shiftKey: true,
            },
        });
    } else {
        bindings.push({
            action: KeyBindingAction.SendMessage,
            keyCombo: {
                key: Key.ENTER,
            },
        });
        bindings.push({
            action: KeyBindingAction.NewLine,
            keyCombo: {
                key: Key.ENTER,
                shiftKey: true,
            },
        });
        if (isMac) {
            bindings.push({
                action: KeyBindingAction.NewLine,
                keyCombo: {
                    key: Key.ENTER,
                    altKey: true,
                },
            });
        }
    }
    return bindings;
};

const autocompleteBindings = (): KeyBinding[] => {
    return [
        {
            action: KeyBindingAction.ForceCompleteAutocomplete,
            keyCombo: {
                key: Key.TAB,
            },
        },
        {
            action: KeyBindingAction.ForceCompleteAutocomplete,
            keyCombo: {
                key: Key.TAB,
                ctrlKey: true,
            },
        },
        {
            action: KeyBindingAction.CompleteAutocomplete,
            keyCombo: {
                key: Key.ENTER,
            },
        },
        {
            action: KeyBindingAction.CompleteAutocomplete,
            keyCombo: {
                key: Key.ENTER,
                ctrlKey: true,
            },
        },
        {
            action: KeyBindingAction.CancelAutocomplete,
            keyCombo: {
                key: Key.ESCAPE,
            },
        },
        {
            action: KeyBindingAction.PrevSelectionInAutocomplete,
            keyCombo: {
                key: Key.ARROW_UP,
            },
        },
        {
            action: KeyBindingAction.NextSelectionInAutocomplete,
            keyCombo: {
                key: Key.ARROW_DOWN,
            },
        },
    ];
};

const roomListBindings = (): KeyBinding[] => {
    return [
        {
            action: KeyBindingAction.ClearRoomFilter,
            keyCombo: {
                key: Key.ESCAPE,
            },
        },
        {
            action: KeyBindingAction.PrevRoom,
            keyCombo: {
                key: Key.ARROW_UP,
            },
        },
        {
            action: KeyBindingAction.NextRoom,
            keyCombo: {
                key: Key.ARROW_DOWN,
            },
        },
        {
            action: KeyBindingAction.SelectRoomInRoomList,
            keyCombo: {
                key: Key.ENTER,
            },
        },
        {
            action: KeyBindingAction.CollapseRoomListSection,
            keyCombo: {
                key: Key.ARROW_LEFT,
            },
        },
        {
            action: KeyBindingAction.ExpandRoomListSection,
            keyCombo: {
                key: Key.ARROW_RIGHT,
            },
        },
    ];
};

const roomBindings = (): KeyBinding[] => {
    const bindings: KeyBinding[] = [
        {
            action: KeyBindingAction.ScrollUp,
            keyCombo: {
                key: Key.PAGE_UP,
            },
        },
        {
            action: KeyBindingAction.ScrollDown,
            keyCombo: {
                key: Key.PAGE_DOWN,
            },
        },
        {
            action: KeyBindingAction.DismissReadMarker,
            keyCombo: {
                key: Key.ESCAPE,
            },
        },
        {
            action: KeyBindingAction.JumpToOldestUnread,
            keyCombo: {
                key: Key.PAGE_UP,
                shiftKey: true,
            },
        },
        {
            action: KeyBindingAction.UploadFile,
            keyCombo: {
                key: Key.U,
                ctrlOrCmdKey: true,
                shiftKey: true,
            },
        },
        {
            action: KeyBindingAction.JumpToFirstMessage,
            keyCombo: {
                key: Key.HOME,
                ctrlKey: true,
            },
        },
        {
            action: KeyBindingAction.JumpToLatestMessage,
            keyCombo: {
                key: Key.END,
                ctrlKey: true,
            },
        },
    ];

    if (SettingsStore.getValue('ctrlFForSearch')) {
        bindings.push({
            action: KeyBindingAction.SearchInRoom,
            keyCombo: {
                key: Key.F,
                ctrlOrCmdKey: true,
            },
        });
    }

    return bindings;
};

const navigationBindings = (): KeyBinding[] => {
    return [
        {
            action: KeyBindingAction.FilterRooms,
            keyCombo: {
                key: Key.K,
                ctrlOrCmdKey: true,
            },
        },
        {
            action: KeyBindingAction.ToggleSpacePanel,
            keyCombo: {
                key: Key.D,
                ctrlOrCmdKey: true,
                shiftKey: true,
            },
        },
        {
            action: KeyBindingAction.ToggleRoomSidePanel,
            keyCombo: {
                key: Key.PERIOD,
                ctrlOrCmdKey: true,
            },
        },
        {
            action: KeyBindingAction.ToggleUserMenu,
            // Ideally this would be CTRL+P for "Profile", but that's
            // taken by the print dialog. CTRL+I for "Information"
            // was previously chosen but conflicted with italics in
            // composer, so CTRL+` it is
            keyCombo: {
                key: Key.BACKTICK,
                ctrlOrCmdKey: true,
            },
        },
        {
            action: KeyBindingAction.ShowKeyboardSettings,
            keyCombo: {
                key: Key.SLASH,
                ctrlOrCmdKey: true,
            },
        },
        {
            action: KeyBindingAction.ShowKeyboardSettings,
            keyCombo: {
                key: Key.SLASH,
                ctrlOrCmdKey: true,
                shiftKey: true,
            },
        },
        {
            action: KeyBindingAction.GoToHome,
            keyCombo: {
                key: Key.H,
                ctrlOrCmdKey: true,
                altKey: !isMac,
                shiftKey: isMac,
            },
        },
        {
            action: KeyBindingAction.SelectPrevRoom,
            keyCombo: {
                key: Key.ARROW_UP,
                altKey: true,
            },
        },
        {
            action: KeyBindingAction.SelectNextRoom,
            keyCombo: {
                key: Key.ARROW_DOWN,
                altKey: true,
            },
        },
        {
            action: KeyBindingAction.SelectPrevUnreadRoom,
            keyCombo: {
                key: Key.ARROW_UP,
                altKey: true,
                shiftKey: true,
            },
        },
        {
            action: KeyBindingAction.SelectNextUnreadRoom,
            keyCombo: {
                key: Key.ARROW_DOWN,
                altKey: true,
                shiftKey: true,
            },
        },
    ];
};

const labsBindings = (): KeyBinding[] => {
    if (!SdkConfig.get()['showLabsSettings']) {
        return [];
    }

    return [
        {
            action: KeyBindingAction.ToggleHiddenEventVisibility,
            keyCombo: {
                key: Key.H,
                ctrlOrCmdKey: true,
                shiftKey: true,
            },
        },
    ];
};

export const defaultBindingsProvider: IKeyBindingsProvider = {
    getMessageComposerBindings: messageComposerBindings,
    getAutocompleteBindings: autocompleteBindings,
    getRoomListBindings: roomListBindings,
    getRoomBindings: roomBindings,
    getNavigationBindings: navigationBindings,
    getLabsBindings: labsBindings,
};
