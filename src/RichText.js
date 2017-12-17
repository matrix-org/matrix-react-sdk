import React from 'react';
import {
    Editor,
    EditorState,
    Modifier,
    ContentState,
    ContentBlock,
    convertFromHTML,
    DefaultDraftBlockRenderMap,
    DefaultDraftInlineStyle,
    CompositeDecorator,
    SelectionState,
    Entity,
} from 'draft-js';
import * as sdk from './index';
import * as emojione from 'emojione';
import {stateToHTML} from 'draft-js-export-html';
import {SelectionRange} from "./autocomplete/Autocompleter";
import {stateToMarkdown as __stateToMarkdown} from 'draft-js-export-markdown';

const MARKDOWN_REGEX = {
    LINK: /(?:\[([^\]]+)\]\(([^\)]+)\))|\<(\w+:\/\/[^\>]+)\>/g,
    ITALIC: /([\*_])([\w\s]+?)\1/g,
    BOLD: /([\*_])\1([\w\s]+?)\1\1/g,
    HR: /(\n|^)((-|\*|_) *){3,}(\n|$)/g,
    CODE: /`[^`]*`/g,
    STRIKETHROUGH: /~{2}[^~]*~{2}/g,
};

const USERNAME_REGEX = /@\S+:\S+/g;
const ROOM_REGEX = /#\S+:\S+/g;
const EMOJI_REGEX = new RegExp(emojione.unicodeRegexp, 'g');

const ZWS_CODE = 8203;
const ZWS = String.fromCharCode(ZWS_CODE); // zero width space
export function stateToMarkdown(state) {
    return __stateToMarkdown(state)
        .replace(
            ZWS, // draft-js-export-markdown adds these
            ''); // this is *not* a zero width space, trust me :)
}

export const contentStateToHTML = (contentState: ContentState) => {
    return stateToHTML(contentState, {
        inlineStyles: {
            UNDERLINE: {
                element: 'u',
            },
        },
    });
};

export function htmlToContentState(html: string): ContentState {
    const blockArray = convertFromHTML(html).contentBlocks;
    return ContentState.createFromBlockArray(blockArray);
}

function unicodeToEmojiUri(str) {
    let replaceWith, unicode, alt;
    if ((!emojione.unicodeAlt) || (emojione.sprites)) {
        // if we are using the shortname as the alt tag then we need a reversed array to map unicode code point to shortnames
        const mappedUnicode = emojione.mapUnicodeToShort();
    }

    str = str.replace(emojione.regUnicode, function(unicodeChar) {
        if ( (typeof unicodeChar === 'undefined') || (unicodeChar === '') || (!(unicodeChar in emojione.jsEscapeMap)) ) {
            // if the unicodeChar doesnt exist just return the entire match
            return unicodeChar;
        } else {
            // Remove variant selector VS16 (explicitly emoji) as it is unnecessary and leads to an incorrect URL below
            if (unicodeChar.length == 2 && unicodeChar[1] == '\ufe0f') {
                unicodeChar = unicodeChar[0];
            }

            // get the unicode codepoint from the actual char
            unicode = emojione.jsEscapeMap[unicodeChar];

            return emojione.imagePathSVG+unicode+'.svg'+emojione.cacheBustParam;
        }
    });

    return str;
}

/**
 * Utility function that looks for regex matches within a ContentBlock and invokes {callback} with (start, end)
 * From https://facebook.github.io/draft-js/docs/advanced-topics-decorators.html
 */
function findWithRegex(regex, contentBlock: ContentBlock, callback: (start: number, end: number) => any) {
    const text = contentBlock.getText();
    let matchArr, start;
    while ((matchArr = regex.exec(text)) !== null) {
        start = matchArr.index;
        callback(start, start + matchArr[0].length);
    }
}

// Workaround for https://github.com/facebook/draft-js/issues/414
const emojiDecorator = {
    strategy: (contentState, contentBlock, callback) => {
        findWithRegex(EMOJI_REGEX, contentBlock, callback);
    },
    component: (props) => {
        const uri = unicodeToEmojiUri(props.children[0].props.text);
        const shortname = emojione.toShort(props.children[0].props.text);
        const style = {
            display: 'inline-block',
            width: '1em',
            maxHeight: '1em',
            background: `url(${uri})`,
            backgroundSize: 'contain',
            backgroundPosition: 'center center',
            overflow: 'hidden',
        };
        return (<span title={shortname} style={style}><span style={{opacity: 0}}>{ props.children }</span></span>);
    },
};

/**
 * Returns a composite decorator which has access to provided scope.
 */
export function getScopedRTDecorators(scope: any): CompositeDecorator {
    return [emojiDecorator];
}

export function getScopedMDDecorators(scope: any): CompositeDecorator {
    const markdownDecorators = ['HR', 'BOLD', 'ITALIC', 'CODE', 'STRIKETHROUGH'].map(
        (style) => ({
            strategy: (contentState, contentBlock, callback) => {
                return findWithRegex(MARKDOWN_REGEX[style], contentBlock, callback);
            },
            component: (props) => (
                <span className={"mx_MarkdownElement mx_Markdown_" + style}>
                    { props.children }
                </span>
            ),
        }));

    markdownDecorators.push({
        strategy: (contentState, contentBlock, callback) => {
            return findWithRegex(MARKDOWN_REGEX.LINK, contentBlock, callback);
        },
        component: (props) => (
            <a href="#" className="mx_MarkdownElement mx_Markdown_LINK">
                { props.children }
            </a>
        ),
    });
    // markdownDecorators.push(emojiDecorator);
    // TODO Consider renabling "syntax highlighting" when we can do it properly
    return [emojiDecorator];
}

/**
 * Passes rangeToReplace to modifyFn and replaces it in contentState with the result.
 */
export function modifyText(contentState: ContentState, rangeToReplace: SelectionState,
                           modifyFn: (text: string) => string, inlineStyle, entityKey): ContentState {
    let getText = (key) => contentState.getBlockForKey(key).getText(),
        startKey = rangeToReplace.getStartKey(),
        startOffset = rangeToReplace.getStartOffset(),
        endKey = rangeToReplace.getEndKey(),
        endOffset = rangeToReplace.getEndOffset(),
        text = "";


    for (let currentKey = startKey;
            currentKey && currentKey !== endKey;
            currentKey = contentState.getKeyAfter(currentKey)) {
        const blockText = getText(currentKey);
        text += blockText.substring(startOffset, blockText.length);

        // from now on, we'll take whole blocks
        startOffset = 0;
    }

    // add remaining part of last block
    text += getText(endKey).substring(startOffset, endOffset);

    return Modifier.replaceText(contentState, rangeToReplace, modifyFn(text), inlineStyle, entityKey);
}

/**
 * Computes the plaintext offsets of the given SelectionState.
 * Note that this inherently means we make assumptions about what that means (no separator between ContentBlocks, etc)
 * Used by autocomplete to show completions when the current selection lies within, or at the edges of a command.
 */
export function selectionStateToTextOffsets(selectionState: SelectionState,
                                            contentBlocks: Array<ContentBlock>): {start: number, end: number} {
    let offset = 0, start = 0, end = 0;
    for (const block of contentBlocks) {
        if (selectionState.getStartKey() === block.getKey()) {
            start = offset + selectionState.getStartOffset();
        }
        if (selectionState.getEndKey() === block.getKey()) {
            end = offset + selectionState.getEndOffset();
            break;
        }
        offset += block.getLength();
    }

    return {
        start,
        end,
    };
}

export function textOffsetsToSelectionState({start, end}: SelectionRange,
                                            contentBlocks: Array<ContentBlock>): SelectionState {
    let selectionState = SelectionState.createEmpty();
    // Subtract block lengths from `start` and `end` until they are less than the current
    // block length (accounting for the NL at the end of each block). Set them to -1 to
    // indicate that the corresponding selection state has been determined.
    for (const block of contentBlocks) {
        const blockLength = block.getLength();
        // -1 indicating that the position start position has been found
        if (start !== -1) {
            if (start < blockLength + 1) {
                selectionState = selectionState.merge({
                    anchorKey: block.getKey(),
                    anchorOffset: start,
                });
                start = -1; // selection state for the start calculated
            } else {
                start -= blockLength + 1; // +1 to account for newline between blocks
            }
        }
        // -1 indicating that the position end position has been found
        if (end !== -1) {
            if (end < blockLength + 1) {
                selectionState = selectionState.merge({
                    focusKey: block.getKey(),
                    focusOffset: end,
                });
                end = -1; // selection state for the end calculated
            } else {
                end -= blockLength + 1; // +1 to account for newline between blocks
            }
        }
    }
    return selectionState;
}

// modified version of https://github.com/draft-js-plugins/draft-js-plugins/blob/master/draft-js-emoji-plugin/src/modifiers/attachImmutableEntitiesToEmojis.js
export function attachImmutableEntitiesToEmoji(editorState: EditorState): EditorState {
    const contentState = editorState.getCurrentContent();
    const blocks = contentState.getBlockMap();
    let newContentState = contentState;

    blocks.forEach((block) => {
        const plainText = block.getText();

        const addEntityToEmoji = (start, end) => {
            const existingEntityKey = block.getEntityAt(start);
            if (existingEntityKey) {
                // avoid manipulation in case the emoji already has an entity
                const entity = newContentState.getEntity(existingEntityKey);
                if (entity && entity.get('type') === 'emoji') {
                    return;
                }
            }

            const selection = SelectionState.createEmpty(block.getKey())
                .set('anchorOffset', start)
                .set('focusOffset', end);
            const emojiText = plainText.substring(start, end);
            newContentState = newContentState.createEntity(
                'emoji', 'IMMUTABLE', { emojiUnicode: emojiText },
            );
            const entityKey = newContentState.getLastCreatedEntityKey();
            newContentState = Modifier.replaceText(
                newContentState,
                selection,
                emojiText,
                null,
                entityKey,
            );
        };

        findWithRegex(EMOJI_REGEX, block, addEntityToEmoji);
    });

    if (!newContentState.equals(contentState)) {
        const oldSelection = editorState.getSelection();
        editorState = EditorState.push(
            editorState,
            newContentState,
            'convert-to-immutable-emojis',
        );
        // this is somewhat of a hack, we're undoing selection changes caused above
        // it would be better not to make those changes in the first place
        editorState = EditorState.forceSelection(editorState, oldSelection);
    }

    return editorState;
}

export function hasMultiLineSelection(editorState: EditorState): boolean {
    const selectionState = editorState.getSelection();
    const anchorKey = selectionState.getAnchorKey();
    const currentContent = editorState.getCurrentContent();
    const currentContentBlock = currentContent.getBlockForKey(anchorKey);
    const start = selectionState.getStartOffset();
    const end = selectionState.getEndOffset();
    const selectedText = currentContentBlock.getText().slice(start, end);
    return selectedText.includes('\n');
}
