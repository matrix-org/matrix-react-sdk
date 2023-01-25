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

import { SubSelection } from "../types";

export function setSelection(selection: SubSelection): Promise<void> {
    if (selection.anchorNode && selection.focusNode) {
        const range = new Range();

        document.getSelection()?.removeAllRanges();
        document.getSelection()?.addRange(range);
    }

    // Waiting for the next loop to ensure that the selection is effective
    return new Promise((resolve) => setTimeout(resolve, 0));
}

export function isSelectionEmpty(): boolean {
    const selection = document.getSelection();
    return Boolean(selection?.isCollapsed);
}

export function isCaretAtStart(editor: HTMLElement): boolean {
    const selection = document.getSelection();

    // No selection or the caret is not at the beginning of the selected element
    if (!selection || selection.anchorOffset !== 0) {
        return false;
    }

    // In case of nested html elements (list, code blocks), we are going through all the first child
    let child = editor.firstChild;
    do {
        if (child === selection.anchorNode) {
            return true;
        }
    } while ((child = child.firstChild));

    return false;
}

export function isCaretAtEnd(editor: HTMLElement): boolean {
    const selection = document.getSelection();

    if (!selection) {
        return false;
    }

    // When we are going cycling across all the timeline message with the keyboard
    // The caret is on the last message element but the focusNode and the anchorNode is the editor himself instead of the text in it.
    // In this case, the focusOffset & anchorOffset match the index + 1 of the selected text
    const isOnLastElement = selection.focusNode === editor && selection.focusOffset === editor.childNodes?.length;
    if (isOnLastElement) {
        return true;
    }

    // In case of nested html elements (list, code blocks), we are going through all the last child
    // The last child of the editor is always a <br> tag, we skip it
    let child = editor.childNodes.item(editor.childNodes.length - 2);
    do {
        if (child === selection.focusNode) {
            // Checking that the cursor is at end of the selected text
            return child.nodeType === Node.TEXT_NODE && selection.focusOffset === child.textContent.length;
        }
    } while ((child = child.lastChild));

    return false;
}
