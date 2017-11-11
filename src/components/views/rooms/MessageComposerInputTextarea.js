/*
Copyright 2015, 2016 OpenMarket Ltd

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
import React from 'react';
import PropTypes from 'prop-types';
import type SyntheticKeyboardEvent from 'react/lib/SyntheticKeyboardEvent';

import classNames from 'classnames';
import escape from 'lodash/escape';
import Promise from 'bluebird';

import {onSendMessageFailed} from './MessageComposerInput'

import MatrixClientPeg from '../../../MatrixClientPeg';
import type {MatrixClient} from 'matrix-js-sdk/lib/matrix';
import SlashCommands from '../../../SlashCommands';
import KeyCode from '../../../KeyCode';
import Modal from '../../../Modal';
import sdk from '../../../index';
import { _t, _td } from '../../../languageHandler';
import Analytics from '../../../Analytics';

import dis from '../../../dispatcher';
import UserSettingsStore from '../../../UserSettingsStore';

import * as RichText from '../../../RichText';
import * as HtmlUtils from '../../../HtmlUtils';
import Autocomplete from './Autocomplete';
import {Completion} from "../../../autocomplete/Autocompleter";
import Markdown from '../../../Markdown';
import ComposerHistoryManager from '../../../ComposerHistoryManager';
import MessageComposerStore from '../../../stores/MessageComposerStore';

import {MATRIXTO_URL_PATTERN, MATRIXTO_MD_LINK_PATTERN} from '../../../linkify-matrix';
const REGEX_MATRIXTO = new RegExp(MATRIXTO_URL_PATTERN);
const REGEX_MATRIXTO_MARKDOWN_GLOBAL = new RegExp(MATRIXTO_MD_LINK_PATTERN, 'g');

import {asciiRegexp, shortnameToUnicode, emojioneList, asciiList, mapUnicodeToShort} from 'emojione';
const EMOJI_SHORTNAMES = Object.keys(emojioneList);
const EMOJI_UNICODE_TO_SHORTNAME = mapUnicodeToShort();
const REGEX_EMOJI_WHITESPACE = new RegExp('(?:^|\\s)(' + asciiRegexp + ')\\s$');

const TYPING_USER_TIMEOUT = 10000, TYPING_SERVER_TIMEOUT = 30000;

const ZWS_CODE = 8203;
const ZWS = String.fromCharCode(ZWS_CODE); // zero width space
function stateToMarkdown(state) {
    return __stateToMarkdown(state)
        .replace(
            ZWS, // draft-js-export-markdown adds these
            ''); // this is *not* a zero width space, trust me :)
}

function insertAtCursor(element, value) {
    //IE support
    if (document.selection) {
        element.focus();
        sel = document.selection.createRange();
        sel.text = value;
    }
    //MOZILLA and others
    else if (element.selectionStart || element.selectionStart === '0') {
        const startPos = element.selectionStart;
        const endPos = element.selectionEnd;
        element.value = element.value.substring(0, startPos)
            + value
            + element.value.substring(endPos, element.value.length);
    } else {
        element.value += value;
    }
}

/*
 * The textInput part of the MessageComposer
 */
export default class MessageComposerInputTextarea extends React.Component {
    static propTypes = {
        // a callback which is called when the height of the composer is
        // changed due to a change in content.
        onResize: PropTypes.func,

        // js-sdk Room object
        room: PropTypes.object.isRequired,

        placeholder: PropTypes.string,

        // called with current plaintext content (as a string) whenever it changes
        onContentChanged: PropTypes.func,

        onFilesPasted: PropTypes.func,

        onInputStateChanged: PropTypes.func,
    };

    client: MatrixClient;
    autocomplete: Autocomplete;
    historyManager: ComposerHistoryManager;

    constructor(props, context) {
        super(props, context);

        this.state = {
            content: '',
        };

        this.client = MatrixClientPeg.get();

        const self = this;
        this.sentHistory = {
            // The list of typed messages. Index 0 is more recent
            data: [],
            // The position in data currently displayed
            position: -1,
            // The room the history is for.
            roomId: null,
            // The original text before they hit UP
            originalText: null,
            // The textarea element to set text to.
            element: null,

            init: function(element, roomId) {
                this.roomId = roomId;
                this.element = element;
                this.position = -1;
                const storedData = window.sessionStorage.getItem("history_" + roomId);
                if (storedData) {
                    this.data = JSON.parse(storedData);
                }
                if (this.roomId) {
                    this.setLastTextEntry();
                }
            },

            push: function(text) {
                // store a message in the sent history
                this.data.unshift(text);
                window.sessionStorage.setItem("history_" + this.roomId, JSON.stringify(this.data));
                // reset history position
                this.position = -1;
                this.originalText = null;
            },

            // move in the history. Returns true if we managed to move.
            next: function(offset) {
                if (this.position === -1) {
                    // user is going into the history, save the current line.
                    this.originalText = this.element.value;
                } else {
                    // user may have modified this line in the history; remember it.
                    this.data[this.position] = this.element.value;
                }

                if (offset > 0 && this.position === (this.data.length - 1)) {
                    // we've run out of history
                    return false;
                }

                // retrieve the next item (bounded).
                let newPosition = this.position + offset;
                newPosition = Math.max(-1, newPosition);
                newPosition = Math.min(newPosition, this.data.length - 1);
                this.position = newPosition;

                if (this.position !== -1) {
                    // show the message
                    this.element.value = this.data[this.position];
                } else if (this.originalText !== undefined) {
                    // restore the original text the user was typing.
                    this.element.value = this.originalText;
                }

                self.resizeInput();
                return true;
            },

            saveLastTextEntry: function() {
                // save the currently entered text in order to restore it later.
                // NB: This isn't 'originalText' because we want to restore
                // sent history items too!
                const text = this.element.value;
                window.sessionStorage.setItem("input_" + this.roomId, text);
            },

            setLastTextEntry: function() {
                const text = window.sessionStorage.getItem("input_" + this.roomId);
                if (text) {
                    this.element.value = text;
                    self.resizeInput();
                }
            },
        };

        this.onUpArrow = this.onUpArrow.bind(this);
        this.onDownArrow = this.onDownArrow.bind(this);
        this.onVerticalArrow = this.onVerticalArrow.bind(this);
        this.onKeyDown = this.onKeyDown.bind(this);
        this.moveAutocompleteSelection = this.moveAutocompleteSelection.bind(this);
        this.resizeInput = this.resizeInput.bind(this);
        this.onKeyUp = this.onKeyUp.bind(this);
        this.onEnter = this.onEnter.bind(this);
        this.onTypingActivity = this.onTypingActivity.bind(this);
        this.onFinishedTyping = this.onFinishedTyping.bind(this);
        this.startUserTypingTimer = this.startUserTypingTimer.bind(this);
        this.stopUserTypingTimer = this.stopUserTypingTimer.bind(this);
        this.startServerTypingTimer = this.startServerTypingTimer.bind(this);
        this.stopServerTypingTimer = this.stopServerTypingTimer.bind(this);
        this.sendTyping = this.sendTyping.bind(this);
        this.refreshTyping = this.refreshTyping.bind(this);
        this.onInputClick = this.onInputClick.bind(this);
        this._onPaste = this._onPaste.bind(this);
        this.onInputChange = this.onInputChange.bind(this);
        this.onAutocomplete = this.onAutocomplete.bind(this);
    }

    moveAutocompleteSelection(up) {
        up ? this.refs.autocomplete.onUpArrow() : this.refs.autocomplete.onDownArrow();
    }

    onAction(payload) {
        const textarea = this.refs.textarea;
        switch (payload.action) {
            case 'focus_composer':
                textarea.focus();
            break;
            case 'insert_displayname':
                if (textarea.value.length) {
                    let left = textarea.value.substring(0, textarea.selectionStart);
                    const right = textarea.value.substring(textarea.selectionEnd);
                    if (right.length) {
                        left += payload.displayname;
                    } else {
                        left = left.replace(/( ?)$/, " " + payload.displayname);
                    }
                    textarea.value = left + right;
                    textarea.focus();
                    textarea.setSelectionRange(left.length, left.length);
                } else {
                    textarea.value = payload.displayname + ": ";
                    textarea.focus();
                }
                break;

            case 'insert_mention': {
                // Pretend that we've autocompleted this user because keeping two code
                // paths for inserting a user pill is not fun
                // const selection = this.state.editorState.getSelection();
                const member = this.props.room.getMember(payload.user_id);
                const completion = member ?
                    member.rawDisplayName.replace(' (IRC)', '') : payload.user_id;
                console.log("INSERT_MENTION", completion);
                break;
            }
        }
    }

    onKeyDown(ev) {
        if (ev.keyCode === KeyCode.ENTER && !ev.shiftKey) {
            const input = this.refs.textarea.value;
            if (input.length === 0) {
                ev.preventDefault();
                return;
            }
            this.sentHistory.push(input);
            this.onEnter(ev);
        } else if (ev.keyCode === KeyCode.UP || ev.keyCode === KeyCode.DOWN) {
            const oldSelectionStart = this.refs.textarea.selectionStart;
            // Remember the keyCode because React will recycle the synthetic event
            const keyCode = ev.keyCode;
            // set a callback so we can see if the cursor position changes as
            // a result of this event. If it doesn't, we cycle history.
            setTimeout(() => {
                if (this.refs.textarea.selectionStart === oldSelectionStart) {
                    this.sentHistory.next(keyCode === KeyCode.UP ? 1 : -1);
                    this.resizeInput();
                }
            }, 0);
        } else if (ev.keyCode === KeyCode.TAB) {
            ev.preventDefault();
            if (this.refs.autocomplete.state.completionList.length === 0) {
                this.moveAutocompleteSelection(false);
            } else {
                this.moveAutocompleteSelection(ev.shiftKey);
            }
        }

        // if (this.props.tabComplete) {
        //     this.props.tabComplete.onKeyDown(ev);
        // }

        setTimeout(() => {
            if (this.refs.textarea && this.refs.textarea.value !== '') {
                this.onTypingActivity();
            } else {
                this.onFinishedTyping();
            }
        }, 10); // XXX: what is this 10ms setTimeout doing?  Looks hacky :(
    }

    resizeInput() {
        // scrollHeight is at least equal to clientHeight, so we have to
        // temporarily crimp clientHeight to 0 to get an accurate scrollHeight value
        this.refs.textarea.style.height = "20px"; // 20 hardcoded from CSS
        const newHeight = Math.min(this.refs.textarea.scrollHeight, this.constructor.MAX_HEIGHT);
        this.refs.textarea.style.height = Math.ceil(newHeight) + "px";
        this.oldScrollHeight = this.refs.textarea.scrollHeight;

        if (this.props.onResize) {
            // kick gemini-scrollbar to re-layout
            this.props.onResize();
        }
    }

    onKeyUp(ev) {
        if (this.refs.textarea.scrollHeight !== this.oldScrollHeight ||
            ev.keyCode === KeyCode.DELETE ||
            ev.keyCode === KeyCode.BACKSPACE) {
            this.resizeInput();
        }
    }

    onUpArrow(e) {
        this.onVerticalArrow(e, true);
    }

    onDownArrow(e) {
        this.onVerticalArrow(e, false);
    }

    onVerticalArrow(e, up) {
        if (e.ctrlKey || e.shiftKey || e.altKey || e.metaKey) {
            return;
        }

        // Select history only if we are not currently auto-completing
        if (this.refs.autocomplete.state.completionList.length === 0) {
            // Don't go back in history if we're in the middle of a multi-line message
            const selection = this.state.editorState.getSelection();
            const blockKey = selection.getStartKey();
            const firstBlock = this.state.editorState.getCurrentContent().getFirstBlock();
            const lastBlock = this.state.editorState.getCurrentContent().getLastBlock();

            let canMoveUp = false;
            let canMoveDown = false;
            if (blockKey === firstBlock.getKey()) {
                canMoveUp = selection.getStartOffset() === selection.getEndOffset() &&
                    selection.getStartOffset() === 0;
            }

            if (blockKey === lastBlock.getKey()) {
                canMoveDown = selection.getStartOffset() === selection.getEndOffset() &&
                    selection.getStartOffset() === lastBlock.getText().length;
            }

            if ((up && !canMoveUp) || (!up && !canMoveDown)) return;

            const selected = this.selectHistory(up);
            if (selected) {
                // We're selecting history, so prevent the key event from doing anything else
                e.preventDefault();
            }
        } else {
            this.moveAutocompleteSelection(up);
            e.preventDefault();
        }
    }

    onEnter(ev) {
        let contentText = this.refs.textarea.value;

        // bodge for now to set markdown state on/off. We probably want a separate
        // area for "local" commands which don't hit out to the server.
        if (contentText.indexOf("/markdown") === 0) {
            ev.preventDefault();
            this.refs.textarea.value = '';
            if (contentText.indexOf("/markdown on") === 0) {
                this.markdownEnabled = true;
            } else if (contentText.indexOf("/markdown off") === 0) {
                this.markdownEnabled = false;
            } else {
                const ErrorDialog = sdk.getComponent("dialogs.ErrorDialog");
                Modal.createDialog(ErrorDialog, {
                    title: _t("Unknown command"),
                    description: _t("Usage") + ": /markdown on|off",
                });
            }
            return;
        }

        const cmd = SlashCommands.processInput(this.props.room.roomId, contentText);
        if (cmd) {
            ev.preventDefault();
            if (!cmd.error) {
                this.refs.textarea.value = '';
            }

            if (cmd.promise) {
                cmd.promise.done(function() {
                    console.log("Command success.");
                }, function(err) {
                    console.error("Command failure: %s", err);
                    const ErrorDialog = sdk.getComponent("dialogs.ErrorDialog");
                    Modal.createDialog(ErrorDialog, {
                        title: _t("Server error"),
                        description: ((err && err.message)
                            ? err.message
                            : _t("Server unavailable, overloaded, or something else went wrong.")),
                    });
                });
            } else if (cmd.error) {
                console.error(cmd.error);
                const ErrorDialog = sdk.getComponent("dialogs.ErrorDialog");
                Modal.createDialog(ErrorDialog, {
                    title: _t("Command error"),
                    description: cmd.error,
                });
            }
            return;
        }

        const isEmote = /^\/me( |$)/i.test(contentText);
        let sendMessagePromise;

        if (isEmote) {
            contentText = contentText.substring(4);
        } else if (contentText[0] === '/') {
            contentText = contentText.substring(1);
        }

        let sendMarkdown = false;
        let mdown;
        if (this.markdownEnabled) {
            mdown = new Markdown(contentText);
            sendMarkdown = !mdown.isPlainText();
        }

        if (sendMarkdown) {
            const htmlText = mdown.toHTML();
            sendMessagePromise = isEmote ?
                MatrixClientPeg.get().sendHtmlEmote(this.props.room.roomId, contentText, htmlText) :
                MatrixClientPeg.get().sendHtmlMessage(this.props.room.roomId, contentText, htmlText);
        } else {
            if (mdown) contentText = mdown.toPlaintext();
            sendMessagePromise = isEmote ?
                MatrixClientPeg.get().sendEmoteMessage(this.props.room.roomId, contentText) :
                MatrixClientPeg.get().sendTextMessage(this.props.room.roomId, contentText);
        }

        sendMessagePromise.done(function(res) {
            dis.dispatch({
                action: 'message_sent',
            });
        }, (e) => onSendMessageFailed(e, this.props.room));

        this.refs.textarea.value = '';
        this.resizeInput();
        ev.preventDefault();
    }

    onTypingActivity() {
        this.isTyping = true;
        if (!this.userTypingTimer) {
            this.sendTyping(true);
        }
        this.startUserTypingTimer();
        this.startServerTypingTimer();
    }

    onFinishedTyping() {
        this.isTyping = false;
        this.sendTyping(false);
        this.stopUserTypingTimer();
        this.stopServerTypingTimer();
    }

    startUserTypingTimer() {
        this.stopUserTypingTimer();
        this.userTypingTimer = setTimeout(() => {
            this.isTyping = false;
            this.sendTyping(this.isTyping);
            this.userTypingTimer = null;
        }, TYPING_USER_TIMEOUT);
    }

    stopUserTypingTimer() {
        if (this.userTypingTimer) {
            clearTimeout(this.userTypingTimer);
            this.userTypingTimer = null;
        }
    }

    startServerTypingTimer() {
        if (!this.serverTypingTimer) {
            this.serverTypingTimer = setTimeout(() => {
                if (this.isTyping) {
                    this.sendTyping(this.isTyping);
                    this.startServerTypingTimer();
                }
            }, TYPING_SERVER_TIMEOUT / 2);
        }
    }

    stopServerTypingTimer() {
        if (this.serverTypingTimer) {
            clearTimeout(this.servrTypingTimer);
            this.serverTypingTimer = null;
        }
    }

    sendTyping(isTyping) {
        if (UserSettingsStore.getSyncedSetting('dontSendTypingNotifications', false)) return;
        this.client.sendTyping(this.props.room.roomId, this.isTyping, TYPING_SERVER_TIMEOUT);
    }

    refreshTyping() {
        if (this.typingTimeout) {
            clearTimeout(this.typingTimeout);
            this.typingTimeout = null;
        }
    }

    onInputClick(ev) {
        this.refs.textarea.focus();
    }

    onInputChange(ev) {
        this.setState({
            content: ev.target.value,
        });
        this.originalContent = null;
    }

    _onPaste(ev) {
        const items = ev.clipboardData.items;
        const files = [];
        for (const item of items) {
            if (item.kind === 'file') {
                files.push(item.getAsFile());
            }
        }
        if (files.length && this.props.onFilesPasted) {
            this.props.onFilesPasted(files);
            return true;
        }
        return false;
    }

    onAutocomplete(displayedCompletion: ?Completion): boolean {
        console.log("DEBUG222", displayedCompletion);
        if (!displayedCompletion) {
            if (this.originalContent) {
                this.refs.textarea.value = this.originalContent;
            }
            return false;
        }

        const {range = null, completion = ''} = displayedCompletion;

        if (!this.originalContent) {
            this.originalContent = this.refs.textarea.value;
        }

        if (range) {
            const value = this.originalContent;
            const start = value.substring(0, range.start);
            const end = value.substring(range.end, value.length);
            this.refs.textarea.value = start + completion + end;
        }

        // TODO move cursor back to where it was

        // insertAtCursor(this.refs.textarea, completion);
        return true;
    }

    render() {
        const className = classNames('mx_MessageComposer_input', {
            // mx_MessageComposer_input_empty: hidePlaceholder,
            mx_MessageComposer_input_error: this.state.someCompletions === false,
        });

        const selection = this.refs.textarea ? {
            start: this.refs.textarea.selectionStart,
            end: this.refs.textarea.selectionEnd,
        } : {
            start: 0,
            end: 0,
        };

        return (
            <div className="mx_MessageComposer_input_wrapper" onClick={this.onInputClick}>
                <div className="mx_MessageComposer_autocomplete_wrapper">
                    <Autocomplete
                        ref="autocomplete"
                        onConfirm={this.onAutocomplete}
                        onSelectionChange={this.onAutocomplete}
                        selection={selection}
                        query={this.state.content} />
                </div>
                <div className={className}>
                    <textarea dir="auto"
                              autoFocus={true}
                              ref="textarea"
                              rows="1"
                              onKeyDown={this.onKeyDown}
                              onKeyUp={this.onKeyUp}
                              placeholder={this.props.placeholder}
                              onPaste={this._onPaste}
                              onChange={this.onInputChange}
                    />
                </div>
            </div>
        );
    }
}
