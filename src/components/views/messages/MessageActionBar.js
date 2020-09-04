/*
Copyright 2019 New Vector Ltd
Copyright 2019 Michael Telatynski <7t3chguy@gmail.com>
Copyright 2019, 2020 The Matrix.org Foundation C.I.C.

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
import { EventStatus } from 'matrix-js-sdk';

import { _t } from '../../../languageHandler';
import * as sdk from '../../../index';
import dis from '../../../dispatcher/dispatcher';
import {aboveLeftOf, ContextMenu, ContextMenuTooltipButton, useContextMenu} from '../../structures/ContextMenu';
import { isContentActionable, canEditContent } from '../../../utils/EventUtils';
import RoomContext from "../../../contexts/RoomContext";
import Toolbar from "../../../accessibility/Toolbar";
import {RovingAccessibleTooltipButton, useRovingTabIndex} from "../../../accessibility/RovingTabIndex";

const OptionsButton = ({mxEvent, getTile, getReplyThread, permalinkCreator, onFocusChange}) => {
    const [menuDisplayed, button, openMenu, closeMenu] = useContextMenu();
    const [onFocus, isActive, ref] = useRovingTabIndex(button);
    useEffect(() => {
        onFocusChange(menuDisplayed);
    }, [onFocusChange, menuDisplayed]);

    let contextMenu;
    if (menuDisplayed) {
        const MessageContextMenu = sdk.getComponent('context_menus.MessageContextMenu');

        const tile = getTile && getTile();
        const replyThread = getReplyThread && getReplyThread();

        const buttonRect = button.current.getBoundingClientRect();
        contextMenu = <ContextMenu {...aboveLeftOf(buttonRect)} onFinished={closeMenu}>
            <MessageContextMenu
                mxEvent={mxEvent}
                permalinkCreator={permalinkCreator}
                eventTileOps={tile && tile.getEventTileOps ? tile.getEventTileOps() : undefined}
                collapseReplyThread={replyThread && replyThread.canCollapse() ? replyThread.collapse : undefined}
                onFinished={closeMenu}
            />
        </ContextMenu>;
    }

    return <React.Fragment>
        <ContextMenuTooltipButton
            className="mx_MessageActionBar_maskButton mx_MessageActionBar_optionsButton"
            title={_t("Options")}
            onClick={openMenu}
            isExpanded={menuDisplayed}
            inputRef={ref}
            onFocus={onFocus}
            tabIndex={isActive ? 0 : -1}
        />

        { contextMenu }
    </React.Fragment>;
};

const ReactButton = ({mxEvent, reactions, onFocusChange}) => {
    const [menuDisplayed, button, openMenu, closeMenu] = useContextMenu();
    const [onFocus, isActive, ref] = useRovingTabIndex(button);
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
        <ContextMenuTooltipButton
            className="mx_MessageActionBar_maskButton mx_MessageActionBar_reactButton"
            title={_t("React")}
            onClick={openMenu}
            isExpanded={menuDisplayed}
            inputRef={ref}
            onFocus={onFocus}
            tabIndex={isActive ? 0 : -1}
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
        if (this.props.mxEvent.status && this.props.mxEvent.status !== EventStatus.SENT) {
            this.props.mxEvent.on("Event.status", this.onSent);
        }
        if (this.props.mxEvent.isBeingDecrypted()) {
            this.props.mxEvent.once("Event.decrypted", this.onDecrypted);
        }
        this.props.mxEvent.on("Event.beforeRedaction", this.onBeforeRedaction);
    }

    componentWillUnmount() {
        this.props.mxEvent.off("Event.status", this.onSent);
        this.props.mxEvent.off("Event.decrypted", this.onDecrypted);
        this.props.mxEvent.off("Event.beforeRedaction", this.onBeforeRedaction);
    }

    onDecrypted = () => {
        // When an event decrypts, it is likely to change the set of available
        // actions, so we force an update to check again.
        this.forceUpdate();
    };

    onBeforeRedaction = () => {
        // When an event is redacted, we can't edit it so update the available actions.
        this.forceUpdate();
    };

    onSent = () => {
        // When an event is sent and echoed the possible actions change.
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

    render() {
        let reactButton;
        let replyButton;
        let editButton;

        if (isContentActionable(this.props.mxEvent)) {
            if (this.context.canReact) {
                reactButton = (
                    <ReactButton mxEvent={this.props.mxEvent} reactions={this.props.reactions} onFocusChange={this.onFocusChange} />
                );
            }
            if (this.context.canReply) {
                replyButton = <RovingAccessibleTooltipButton
                    className="mx_MessageActionBar_maskButton mx_MessageActionBar_replyButton"
                    title={_t("Reply")}
                    onClick={this.onReplyClick}
                />;
            }
        }
        if (canEditContent(this.props.mxEvent)) {
            editButton = <RovingAccessibleTooltipButton
                className="mx_MessageActionBar_maskButton mx_MessageActionBar_editButton"
                title={_t("Edit")}
                onClick={this.onEditClick}
            />;
        }

        // aria-live=off to not have this read out automatically as navigating around timeline, gets repetitive.
        return <Toolbar className="mx_MessageActionBar" aria-label={_t("Message Actions")} aria-live="off">
            {reactButton}
            {replyButton}
            {editButton}
            <OptionsButton
                mxEvent={this.props.mxEvent}
                getReplyThread={this.props.getReplyThread}
                getTile={this.props.getTile}
                permalinkCreator={this.props.permalinkCreator}
                onFocusChange={this.onFocusChange}
            />
        </Toolbar>;
    }
}
