/*
Copyright 2020 The Matrix.org Foundation C.I.C.
Copyright 2021 - 2022 Šimon Brandner <simon.bra.ag@gmail.com>

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

import { _td } from "../languageHandler";
import { isMac, Key } from "../Keyboard";
import { IBaseSetting } from "../settings/Settings";
import { KeyCombo } from "../KeyBindingsManager";

export enum KeyBindingAction {
    /** Send a message */
    SendMessage = 'KeyBinding.sendMessageInComposer',
    /** Go backwards through the send history and use the message in composer view */
    SelectPrevSendHistory = 'KeyBinding.previousMessageInComposerHistory',
    /** Go forwards through the send history */
    SelectNextSendHistory = 'KeyBinding.nextMessageInComposerHistory',
    /** Start editing the user's last sent message */
    EditPrevMessage = 'KeyBinding.editPreviousMessage',
    /** Start editing the user's next sent message */
    EditNextMessage = 'KeyBinding.editNextMessage',
    /** Cancel editing a message or cancel replying to a message */
    CancelReplyOrEdit = 'KeyBinding.cancelReplyInComposer',
    /** Show the sticker picker */
    ShowStickerPicker = 'KeyBinding.showStickerPicker',

    /** Set bold format the current selection */
    FormatBold = 'KeyBinding.toggleBoldInComposer',
    /** Set italics format the current selection */
    FormatItalics = 'KeyBinding.toggleItalicsInComposer',
    /** Insert link for current selection */
    FormatLink = 'KeyBinding.FormatLink',
    /** Set code format for current selection */
    FormatCode = 'KeyBinding.FormatCode',
    /** Format the current selection as quote */
    FormatQuote = 'KeyBinding.toggleQuoteInComposer',
    /** Undo the last editing */
    EditUndo = 'KeyBinding.editUndoInComposer',
    /** Redo editing */
    EditRedo = 'KeyBinding.editRedoInComposer',
    /** Insert new line */
    NewLine = 'KeyBinding.newLineInComposer',
    /** Move the cursor to the start of the message */
    MoveCursorToStart = 'KeyBinding.jumpToStartInComposer',
    /** Move the cursor to the end of the message */
    MoveCursorToEnd = 'KeyBinding.jumpToEndInComposer',

    /** Accepts chosen autocomplete selection */
    CompleteAutocomplete = 'KeyBinding.completeAutocomplete',
    /** Accepts chosen autocomplete selection or,
     * if the autocompletion window is not shown, open the window and select the first selection */
    ForceCompleteAutocomplete = 'KeyBinding.forceCompleteAutocomplete',
    /** Move to the previous autocomplete selection */
    PrevSelectionInAutocomplete = 'KeyBinding.previousOptionInAutoComplete',
    /** Move to the next autocomplete selection */
    NextSelectionInAutocomplete = 'KeyBinding.nextOptionInAutoComplete',
    /** Close the autocompletion window */
    CancelAutocomplete = 'KeyBinding.cancelAutoComplete',

    /** Clear room list filter field */
    ClearRoomFilter = 'KeyBinding.clearRoomFilter',
    /** Navigate up/down in the room list */
    PrevRoom = 'KeyBinding.downerRoom',
    /** Navigate down in the room list */
    NextRoom = 'KeyBinding.upperRoom',
    /** Select room from the room list */
    SelectRoomInRoomList = 'KeyBinding.selectRoomInRoomList',
    /** Collapse room list section */
    CollapseRoomListSection = 'KeyBinding.collapseSectionInRoomList',
    /** Expand room list section, if already expanded, jump to first room in the selection */
    ExpandRoomListSection = 'KeyBinding.expandSectionInRoomList',

    /** Scroll up in the timeline */
    ScrollUp = 'KeyBinding.scrollUpInTimeline',
    /** Scroll down in the timeline */
    ScrollDown = 'KeyBinding.scrollDownInTimeline',
    /** Dismiss read marker and jump to bottom */
    DismissReadMarker = 'KeyBinding.dismissReadMarkerAndJumpToBottom',
    /** Jump to oldest unread message */
    JumpToOldestUnread = 'KeyBinding.jumpToOldestUnreadMessage',
    /** Upload a file */
    UploadFile = 'KeyBinding.uploadFileToRoom',
    /** Focus search message in a room (must be enabled) */
    SearchInRoom = 'KeyBinding.searchInRoom',
    /** Jump to the first (downloaded) message in the room */
    JumpToFirstMessage = 'KeyBinding.jumpToFirstMessageInTimeline',
    /** Jump to the latest message in the room */
    JumpToLatestMessage = 'KeyBinding.jumpToLastMessageInTimeline',

    /** Jump to room search (search for a room) */
    FilterRooms = 'KeyBinding.filterRooms',
    /** Toggle the space panel */
    ToggleSpacePanel = 'KeyBinding.toggleSpacePanel',
    /** Toggle the room side panel */
    ToggleRoomSidePanel = 'KeyBinding.toggleRightPanel',
    /** Toggle the user menu */
    ToggleUserMenu = 'KeyBinding.toggleTopLeftMenu',
    /** Toggle the short cut help dialog */
    ShowKeyboardSettings = 'KeyBinding.showKeyBindingsSettings',
    /** Got to the Element home screen */
    GoToHome = 'KeyBinding.goToHomeView',
    /** Select prev room */
    SelectPrevRoom = 'KeyBinding.previousRoom',
    /** Select next room */
    SelectNextRoom = 'KeyBinding.nextRoom',
    /** Select prev room with unread messages */
    SelectPrevUnreadRoom = 'KeyBinding.previousUnreadRoom',
    /** Select next room with unread messages */
    SelectNextUnreadRoom = 'KeyBinding.nextUnreadRoom',

    /** Switches to a space by number */
    SwitchToSpaceByNumber = "KeyBinding.switchToSpaceByNumber",
    /** Opens user settings */
    OpenUserSettings = "KeyBinding.openUserSettings",
    /** Navigates backward */
    PreviousVisitedRoomOrCommunity = "KeyBinding.previousVisitedRoomOrCommunity",
    /** Navigates forward */
    NextVisitedRoomOrCommunity = "KeyBinding.nextVisitedRoomOrCommunity",

    /** Toggles microphone while on a call */
    ToggleMicInCall = "KeyBinding.toggleMicInCall",
    /** Toggles webcam while on a call */
    ToggleWebcamInCall = "KeyBinding.toggleWebcamInCall",

    /** Accessibility actions */
    Escape = "KeyBinding.escape",
    Enter = "KeyBinding.enter",
    Space = "KeyBinding.space",
    Backspace = "KeyBinding.backspace",
    Delete = "KeyBinding.delete",
    Home = "KeyBinding.home",
    End = "KeyBinding.end",
    ArrowLeft = "KeyBinding.arrowLeft",
    ArrowUp = "KeyBinding.arrowUp",
    ArrowRight = "KeyBinding.arrowRight",
    ArrowDown = "KeyBinding.arrowDown",
    Tab = "KeyBinding.tab",
    Comma = "KeyBinding.comma",

    /** Toggle visibility of hidden events */
    ToggleHiddenEventVisibility = 'KeyBinding.toggleHiddenEventVisibility',
}

type KeyboardShortcutSetting = IBaseSetting<KeyCombo>;

export type IKeyboardShortcuts = {
    // TODO: We should figure out what to do with the keyboard shortcuts that are not handled by KeybindingManager
    [k in (KeyBindingAction)]?: KeyboardShortcutSetting;
};

export interface ICategory {
    categoryLabel?: string;
    // TODO: We should figure out what to do with the keyboard shortcuts that are not handled by KeybindingManager
    settingNames: (KeyBindingAction)[];
}

export enum CategoryName {
    NAVIGATION = "Navigation",
    ACCESSIBILITY = "Accessibility",
    CALLS = "Calls",
    COMPOSER = "Composer",
    ROOM_LIST = "Room List",
    ROOM = "Room",
    AUTOCOMPLETE = "Autocomplete",
    LABS = "Labs",
}

// Meta-key representing the digits [0-9] often found at the top of standard keyboard layouts
export const DIGITS = "digits";

export const ALTERNATE_KEY_NAME: Record<string, string> = {
    [Key.PAGE_UP]: _td("Page Up"),
    [Key.PAGE_DOWN]: _td("Page Down"),
    [Key.ESCAPE]: _td("Esc"),
    [Key.ENTER]: _td("Enter"),
    [Key.SPACE]: _td("Space"),
    [Key.HOME]: _td("Home"),
    [Key.END]: _td("End"),
    [Key.ALT]: _td("Alt"),
    [Key.CONTROL]: _td("Ctrl"),
    [Key.SHIFT]: _td("Shift"),
    [DIGITS]: _td("[number]"),
};
export const KEY_ICON: Record<string, string> = {
    [Key.ARROW_UP]: "↑",
    [Key.ARROW_DOWN]: "↓",
    [Key.ARROW_LEFT]: "←",
    [Key.ARROW_RIGHT]: "→",
};
if (isMac) {
    KEY_ICON[Key.META] = "⌘";
    KEY_ICON[Key.ALT] = "⌥";
}

export const CATEGORIES: Record<CategoryName, ICategory> = {
    [CategoryName.COMPOSER]: {
        categoryLabel: _td("Composer"),
        settingNames: [
            KeyBindingAction.SendMessage,
            KeyBindingAction.NewLine,
            KeyBindingAction.FormatBold,
            KeyBindingAction.FormatItalics,
            KeyBindingAction.FormatQuote,
            KeyBindingAction.FormatLink,
            KeyBindingAction.FormatCode,
            KeyBindingAction.EditUndo,
            KeyBindingAction.EditRedo,
            KeyBindingAction.MoveCursorToStart,
            KeyBindingAction.MoveCursorToEnd,
            KeyBindingAction.CancelReplyOrEdit,
            KeyBindingAction.EditNextMessage,
            KeyBindingAction.EditPrevMessage,
            KeyBindingAction.SelectNextSendHistory,
            KeyBindingAction.SelectPrevSendHistory,
            KeyBindingAction.ShowStickerPicker,
        ],
    }, [CategoryName.CALLS]: {
        categoryLabel: _td("Calls"),
        settingNames: [
            KeyBindingAction.ToggleMicInCall,
            KeyBindingAction.ToggleWebcamInCall,
        ],
    }, [CategoryName.ROOM]: {
        categoryLabel: _td("Room"),
        settingNames: [
            KeyBindingAction.SearchInRoom,
            KeyBindingAction.UploadFile,
            KeyBindingAction.DismissReadMarker,
            KeyBindingAction.JumpToOldestUnread,
            KeyBindingAction.ScrollUp,
            KeyBindingAction.ScrollDown,
            KeyBindingAction.JumpToFirstMessage,
            KeyBindingAction.JumpToLatestMessage,
        ],
    }, [CategoryName.ROOM_LIST]: {
        categoryLabel: _td("Room List"),
        settingNames: [
            KeyBindingAction.SelectRoomInRoomList,
            KeyBindingAction.ClearRoomFilter,
            KeyBindingAction.CollapseRoomListSection,
            KeyBindingAction.ExpandRoomListSection,
            KeyBindingAction.NextRoom,
            KeyBindingAction.PrevRoom,
        ],
    }, [CategoryName.ACCESSIBILITY]: {
        categoryLabel: _td("Accessibility"),
        settingNames: [
            KeyBindingAction.Escape,
            KeyBindingAction.Enter,
            KeyBindingAction.Space,
            KeyBindingAction.Backspace,
            KeyBindingAction.Delete,
            KeyBindingAction.Home,
            KeyBindingAction.End,
            KeyBindingAction.ArrowLeft,
            KeyBindingAction.ArrowUp,
            KeyBindingAction.ArrowRight,
            KeyBindingAction.ArrowDown,
            KeyBindingAction.Comma,
        ],
    }, [CategoryName.NAVIGATION]: {
        categoryLabel: _td("Navigation"),
        settingNames: [
            KeyBindingAction.ToggleUserMenu,
            KeyBindingAction.ToggleRoomSidePanel,
            KeyBindingAction.ToggleSpacePanel,
            KeyBindingAction.ShowKeyboardSettings,
            KeyBindingAction.GoToHome,
            KeyBindingAction.FilterRooms,
            KeyBindingAction.SelectNextUnreadRoom,
            KeyBindingAction.SelectPrevUnreadRoom,
            KeyBindingAction.SelectNextRoom,
            KeyBindingAction.SelectPrevRoom,
            KeyBindingAction.OpenUserSettings,
            KeyBindingAction.SwitchToSpaceByNumber,
            KeyBindingAction.PreviousVisitedRoomOrCommunity,
            KeyBindingAction.NextVisitedRoomOrCommunity,
        ],
    }, [CategoryName.AUTOCOMPLETE]: {
        categoryLabel: _td("Autocomplete"),
        settingNames: [
            KeyBindingAction.CancelAutocomplete,
            KeyBindingAction.NextSelectionInAutocomplete,
            KeyBindingAction.PrevSelectionInAutocomplete,
            KeyBindingAction.CompleteAutocomplete,
            KeyBindingAction.ForceCompleteAutocomplete,
        ],
    }, [CategoryName.LABS]: {
        categoryLabel: _td("Labs"),
        settingNames: [
            KeyBindingAction.ToggleHiddenEventVisibility,
        ],
    },
};

export const DESKTOP_SHORTCUTS = [
    KeyBindingAction.OpenUserSettings,
    KeyBindingAction.SwitchToSpaceByNumber,
    KeyBindingAction.PreviousVisitedRoomOrCommunity,
    KeyBindingAction.NextVisitedRoomOrCommunity,
];

export const MAC_ONLY_SHORTCUTS = [
    KeyBindingAction.OpenUserSettings,
];

// For tests
export function mock({ macOnlyShortcuts, desktopShortcuts }): void {
    MAC_ONLY_SHORTCUTS.splice(0, MAC_ONLY_SHORTCUTS.length);
    if (macOnlyShortcuts) macOnlyShortcuts.forEach((e) => MAC_ONLY_SHORTCUTS.push(e));
    DESKTOP_SHORTCUTS.splice(0, DESKTOP_SHORTCUTS.length);
    if (desktopShortcuts) desktopShortcuts.forEach((e) => DESKTOP_SHORTCUTS.push(e));
}
