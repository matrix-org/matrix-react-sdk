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

import { _t } from '../../../languageHandler';
import * as sdk from '../../../index';
import dis from '../../../dispatcher/dispatcher';
import {aboveLeftOf, ContextMenu, ContextMenuButton, useContextMenu} from '../../structures/ContextMenu';
import { isContentActionable, canEditContent } from '../../../utils/EventUtils';
import RoomContext from "../../../contexts/RoomContext";
import {Key} from '../../../Keyboard';

const OptionsButton = ({mxEvent, getTile, getReplyThread, permalinkCreator, onFocusChange, tabIndex}) => {
    const [menuDisplayed, button, openMenu, closeMenu] = useContextMenu();
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
        <ContextMenuButton
            className="mx_MessageActionBar_maskButton mx_MessageActionBar_optionsButton"
            label={_t("Options")}
            onClick={openMenu}
            isExpanded={menuDisplayed}
            inputRef={button}
            tabIndex={tabIndex}
        />

        { contextMenu }
    </React.Fragment>;
};

const ReactButton = ({mxEvent, reactions, onFocusChange, tabIndex}) => {
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
            tabIndex={tabIndex}
        />

        { contextMenu }
    </React.Fragment>;
};

// This component implements the Toolbar design pattern from the WAI-ARIA
// Authoring Practices guidelines.
//
// https://www.w3.org/TR/wai-aria-practices-1.1/#toolbar
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

    constructor(props) {
        super(props);
        this.elRef = React.createRef();
        this.state = { focused: "options", buttonNames: [] };
    }

    componentDidMount() {
        this.props.mxEvent.on("Event.decrypted", this.onDecrypted);
        this.props.mxEvent.on("Event.beforeRedaction", this.onBeforeRedaction);
        this.elRef.current.addEventListener("keydown", this.onKeyDown, true);
    }

    componentWillUnmount() {
        this.props.mxEvent.removeListener("Event.decrypted", this.onDecrypted);
        this.props.mxEvent.removeListener("Event.beforeRedaction", this.onBeforeRedaction);
        this.elRef.current.removeEventListener("keydown", this.onKeyDown, true);
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

    onFocusChange = (focused) => {
        if (!this.props.onFocusChange) {
            return;
        }
        this.props.onFocusChange(focused);
    };

    onKeyDown = (ev) => {
        const {key} = ev;
        const buttonNames = this.state.buttonNames;
        const current = buttonNames.indexOf(this.state.focused);
        let newIndex = null;

        if (key === Key.ARROW_UP || key === Key.ARROW_DOWN) {
            ev.target.click();
        } else if (key === Key.ARROW_RIGHT) {
            newIndex = (current + 1) % buttonNames.length;
        } else if (key === Key.ARROW_LEFT) {
            newIndex = current ? current - 1 : buttonNames.length - 1;
        } else if (key === Key.HOME) {
            newIndex = 0;
        } else if (key === Key.END) {
            newIndex = buttonNames.length - 1;
        } else {
            return;
        }

        if (newIndex !== null) {
            this.setState({ focused: buttonNames[newIndex] });
            this.elRef.current.children[newIndex].focus();
        }

        ev.stopPropagation();
        ev.preventDefault();
    };

    tabIndex = (target) => target === this.state.focused ? 0 : -1;

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
        const AccessibleButton = sdk.getComponent('elements.AccessibleButton');
        const buttons = [];

        if (isContentActionable(this.props.mxEvent)) {
            if (this.context.canReact) {
                buttons.push(
                    <ReactButton
                        mxEvent={this.props.mxEvent}
                        reactions={this.props.reactions}
                        onFocusChange={this.onFocusChange}
                        tabIndex={this.tabIndex("react")}
                        key="react"
                    />,
                );
            }
            if (this.context.canReply) {
                buttons.push(
                    <AccessibleButton
                        className="mx_MessageActionBar_maskButton mx_MessageActionBar_replyButton"
                        title={_t("Reply")}
                        onClick={this.onReplyClick}
                        tabIndex={this.tabIndex("reply")}
                        key="reply"
                    />,
                );
            }
        }
        if (canEditContent(this.props.mxEvent)) {
            buttons.push(
                <AccessibleButton
                    className="mx_MessageActionBar_maskButton mx_MessageActionBar_editButton"
                    title={_t("Edit")}
                    onClick={this.onEditClick}
                    tabIndex={this.tabIndex("edit")}
                    key="edit"
                />,
            );
        }

        buttons.push(
            <OptionsButton
                mxEvent={this.props.mxEvent}
                getReplyThread={this.props.getReplyThread}
                getTile={this.props.getTile}
                permalinkCreator={this.props.permalinkCreator}
                onFocusChange={this.onFocusChange}
                tabIndex={this.tabIndex("options")}
                key="options"
            />,
        );

        const newButtonNames = buttons.map((button) => button.key);
        if (this.state.buttonNames.join() !== newButtonNames.join()) {
            this.setState({buttonNames: newButtonNames});
        }

        // aria-live=off to not have this read out automatically as navigating around timeline, gets repetitive.
        return <div
            className="mx_MessageActionBar"
            role="toolbar"
            aria-label={_t("Message Actions")}
            aria-live="off"
            ref={this.elRef}
        >
            {buttons}
        </div>;
    }
}
