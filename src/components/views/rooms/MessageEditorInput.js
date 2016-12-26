import React from 'react';
import type SyntheticKeyboardEvent from 'react/lib/SyntheticKeyboardEvent';

import dis from '../../../dispatcher';
import { Editor, EditorState, ContentState, RichUtils } from 'draft-js';
import classNames from 'classnames';
import escape from 'lodash/escape';
import Q from 'q';

import MatrixClientPeg from '../../../MatrixClientPeg';
import type {MatrixClient} from 'matrix-js-sdk/lib/matrix';
import Modal from '../../../Modal';
import sdk from '../../../index';
import Markdown from '../../../Markdown';

/*
 * The textInput for editing existing messages
 */
export default class MessageEditorInput extends React.Component {
    client: MatrixClient;

    constructor(props, context) {
        super(props, context);
        this.handleReturn = this.handleReturn.bind(this);
        this.onEditorContentChanged = this.onEditorContentChanged.bind(this);
        this.onEscape = this.onEscape.bind(this);
        this.state = {
            editorState: this.createEditorState(props.contentText)
        };

        this.client = MatrixClientPeg.get();
    }

    createEditorState(content) {
        let editorState;

        if (content) {
            const contentState = ContentState.createFromText(content);
            editorState = EditorState.createWithContent(contentState);
        } else {
            editorState = EditorState.createEmpty();
        }

        return EditorState.moveFocusToEnd(editorState);
    }

    onEditorContentChanged(editorState) {
        this.setState({editorState: editorState});
        // this.forceUpdate() //WHY U NO UPDATEZ?!1
    }

    handleReturn(ev) {
        if (ev.shiftKey) {
            this.onEditorContentChanged(RichUtils.insertSoftNewline(this.state.editorState));
            return true;
        }

        const contentState = this.state.editorState.getCurrentContent();
        if (!contentState.hasText()) {
            return true;
        }


        let contentText = contentState.getPlainText();
        let contentHTML;

        const md = new Markdown(contentText);
        if (!md.isPlainText()) {
            contentHTML = md.toHTML();
        }

        let sendMessageEditPromise;
        const roomId = this.props.mxEvent.event.room_id;
        const targetId = this.props.mxEvent.event.event_id;
        if (contentHTML) {
            sendMessageEditPromise = this.client.sendHtmlMessageEdit.call(
                this.client, roomId, targetId, contentText, contentHTML
            );
        } else {
            sendMessageEditPromise = this.client.sendTextMessageEdit.call(
                this.client, roomId, targetId, contentText
            );
        }
        this.props.onMessageEditSent(sendMessageEditPromise, contentText)
    }

    onEscape(e) {
        e.preventDefault()
        return this.props.onEscape()
    }

    render() {
        return (
            <Editor
                    editorState={this.state.editorState}
                    onChange={this.onEditorContentChanged}
                    handleReturn={this.handleReturn}
                    onEscape={this.onEscape}
                    spellCheck={true} />        );
    }
};

MessageEditorInput.propTypes = {
    // // a callback which is called when the height of the composer is
    // // changed due to a change in content.
    // onResize: React.PropTypes.func,

    // // js-sdk Room object
    // mxEvent: React.PropTypes.object.isRequired,
};

