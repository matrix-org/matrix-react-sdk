/*
Copyright 2019 New Vector Ltd
Copyright 2019 Michael Telatynski <7t3chguy@gmail.com>
Copyright 2019 The Matrix.org Foundation C.I.C.

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

import React, {useEffect} from 'react';
import PropTypes from 'prop-types';

import { _t } from '../../../languageHandler';
import * as sdk from '../../../index';
import dis from '../../../dispatcher';
import Modal from '../../../Modal';
import {aboveLeftOf, ContextMenu, ContextMenuButton, useContextMenu} from '../../structures/ContextMenu';
import { isContentActionable, canEditContent } from '../../../utils/EventUtils';
import RoomContext from "../../../contexts/RoomContext";
import {MatrixClientPeg} from "../../../MatrixClientPeg";

const OptionsButton = ({mxEvent, getTile, getReplyThread, permalinkCreator, onFocusChange}) => {
    if (mxEvent.getType() !== 'm.room.message') {
        return '';
    }

    const [menuDisplayed, button, openMenu, closeMenu] = useContextMenu();
    useEffect(() => {
        onFocusChange(menuDisplayed);
    }, [onFocusChange, menuDisplayed]);

    let contextMenu;
    if (menuDisplayed) {
        const MessageContextMenu = sdk.getComponent('context_menus.MessageContextMenu');

        const tile = getTile && getTile();
        const replyThread = getReplyThread && getReplyThread();

        const onCryptoClick = () => {
            Modal.createTrackedDialogAsync('Encrypted Event Dialog', '',
                import('../../../async-components/views/dialogs/EncryptedEventDialog'),
                {event: mxEvent},
            );
        };

        let e2eInfoCallback = null;
        if (mxEvent.isEncrypted()) {
            e2eInfoCallback = onCryptoClick;
        }

        const buttonRect = button.current.getBoundingClientRect();
        contextMenu = <ContextMenu {...aboveLeftOf(buttonRect)} onFinished={closeMenu}>
            <MessageContextMenu
                mxEvent={mxEvent}
                permalinkCreator={permalinkCreator}
                eventTileOps={tile && tile.getEventTileOps ? tile.getEventTileOps() : undefined}
                collapseReplyThread={replyThread && replyThread.canCollapse() ? replyThread.collapse : undefined}
                e2eInfoCallback={e2eInfoCallback}
                onFinished={closeMenu}
            />
        </ContextMenu>;
    }

    return <React.Fragment>
        <ContextMenuButton
            className="mx_MessageActionBar_maskButton mx_MessageActionBar_optionsButton"
            label={_t("Options")}
            onClick={openMenu}
            isExpanded={menuDisplayed}
            inputRef={button}
        />

        { contextMenu }
    </React.Fragment>;
};

const ReactButton = ({mxEvent, reactions, onFocusChange}) => {
    const [menuDisplayed, button, openMenu, closeMenu] = useContextMenu();
    useEffect(() => {
        onFocusChange(menuDisplayed);
    }, [onFocusChange, menuDisplayed]);

    let contextMenu;
    if (menuDisplayed) {
        const buttonRect = button.current.getBoundingClientRect();
        const ReactionPicker = sdk.getComponent('emojipicker.ReactionPicker');
        contextMenu = <ContextMenu {...aboveLeftOf(buttonRect)} onFinished={closeMenu} managed={false}>
            <ReactionPicker mxEvent={mxEvent} reactions={reactions} onFinished={closeMenu} />
        </ContextMenu>;
    }

    return <React.Fragment>
        <ContextMenuButton
            className="mx_MessageActionBar_maskButton mx_MessageActionBar_reactButton"
            label={_t("React")}
            onClick={openMenu}
            isExpanded={menuDisplayed}
            inputRef={button}
        />

        { contextMenu }
    </React.Fragment>;
};

export default class MessageActionBar extends React.PureComponent {
    static propTypes = {
        mxEvent: PropTypes.object.isRequired,
        // The Relations model from the JS SDK for reactions to `mxEvent`
        reactions: PropTypes.object,
        permalinkCreator: PropTypes.object,
        getTile: PropTypes.func,
        getReplyThread: PropTypes.func,
        onFocusChange: PropTypes.func,
    };

    static contextType = RoomContext;

    componentDidMount() {
        this.props.mxEvent.on("Event.decrypted", this.onDecrypted);
    }

    componentWillUnmount() {
        this.props.mxEvent.removeListener("Event.decrypted", this.onDecrypted);
    }

    onDecrypted = () => {
        // When an event decrypts, it is likely to change the set of available
        // actions, so we force an update to check again.
        this.forceUpdate();
    };

    onFocusChange = (focused) => {
        if (!this.props.onFocusChange) {
            return;
        }
        this.props.onFocusChange(focused);
    };

    onReplyClick = (ev) => {
        dis.dispatch({
            action: 'reply_to_event',
            event: this.props.mxEvent,
        });
    };

    onEditClick = (ev) => {
        dis.dispatch({
            action: 'edit_event',
            event: this.props.mxEvent,
        });
    };

    onRemoveClick = () => {
        const ConfirmRedactDialog = sdk.getComponent("dialogs.ConfirmRedactDialog");
        Modal.createTrackedDialog('Confirm Redact Dialog', '', ConfirmRedactDialog, {
            onFinished: async (proceed) => {
                if (!proceed) return;

                const cli = MatrixClientPeg.get();
                try {
                    await cli.redactEvent(
                        this.props.mxEvent.getRoomId(),
                        this.props.mxEvent.getId(),
                    );
                } catch (e) {
                    const code = e.errcode || e.statusCode;
                    // only show the dialog if failing for something other than a network error
                    // (e.g. no errcode or statusCode) as in that case the redactions end up in the
                    // detached queue and we show the room status bar to allow retry
                    if (typeof code !== "undefined") {
                        const ErrorDialog = sdk.getComponent("dialogs.ErrorDialog");
                        // display error message stating you couldn't delete this.
                        Modal.createTrackedDialog('You cannot delete this message', '', ErrorDialog, {
                            title: _t('Error'),
                            description: _t('You cannot delete this message. (%(code)s)', {code}),
                        });
                    }
                }
            },
        }, 'mx_Dialog_confirmredact');
    };

    render() {
        const AccessibleButton = sdk.getComponent('elements.AccessibleButton');

        let reactButton;
        let replyButton;
        let removeButton;
        let editButton;

        if (isContentActionable(this.props.mxEvent)) {
            if (this.context.canReact) {
                reactButton = (
                    <ReactButton mxEvent={this.props.mxEvent} reactions={this.props.reactions} onFocusChange={this.onFocusChange} />
                );
            }
            if (this.context.canReply) {
                replyButton = <AccessibleButton
                    className="mx_MessageActionBar_maskButton mx_MessageActionBar_replyButton"
                    title={_t("Reply")}
                    onClick={this.onReplyClick}
                />;
            }
        }

        if (canEditContent(this.props.mxEvent)) {
            editButton = <AccessibleButton
                className="mx_MessageActionBar_maskButton mx_MessageActionBar_editButton"
                title={_t("Edit")}
                onClick={this.onEditClick}
            />;
        }

        if (this.props.mxEvent.event.type !== 'm.room.message') {
            removeButton = <AccessibleButton
                className="mx_MessageActionBar_maskButton mx_MessageActionBar_removeButton"
                title={_t("Remove")}
                onClick={this.onRemoveClick}
            />;
        }

        // aria-live=off to not have this read out automatically as navigating around timeline, gets repetitive.
        return <div className="mx_MessageActionBar" role="toolbar" aria-label={_t("Message Actions")} aria-live="off">
            {reactButton}
            {replyButton}
            {editButton}
            {removeButton}
            <OptionsButton
                mxEvent={this.props.mxEvent}
                getReplyThread={this.props.getReplyThread}
                getTile={this.props.getTile}
                permalinkCreator={this.props.permalinkCreator}
                onFocusChange={this.onFocusChange}
            />
        </div>;
    }
}
