/*
Copyright 2019 New Vector Ltd
Copyright 2019 Michael Telatynski <7t3chguy@gmail.com>

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

import React from "react";
import PropTypes from "prop-types";

import { _t } from "../../../languageHandler";
import sdk from "../../../index";
import dis from "../../../dispatcher";
import Modal from "../../../Modal";
import { createMenu } from "../../structures/ContextualMenu";
import { isContentActionable, canEditContent } from "../../../utils/EventUtils";
import { RoomContext } from "../../structures/RoomView";

export default class MessageActionBar extends React.PureComponent {
    static propTypes = {
        mxEvent: PropTypes.object.isRequired,
        // The Relations model from the JS SDK for reactions to `mxEvent`
        reactions: PropTypes.object,
        permalinkCreator: PropTypes.object,
        getTile: PropTypes.func,
        getReplyThread: PropTypes.func,
        onFocusChange: PropTypes.func
    };

    static contextTypes = {
        room: RoomContext
    };

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

    onFocusChange = focused => {
        if (!this.props.onFocusChange) {
            return;
        }
        this.props.onFocusChange(focused);
    };

    onCryptoClick = () => {
        const event = this.props.mxEvent;
        Modal.createTrackedDialogAsync(
            "Encrypted Event Dialog",
            "",
            import("../../../async-components/views/dialogs/EncryptedEventDialog"),
            { event }
        );
    };

    onReplyClick = ev => {
        dis.dispatch({
            action: "reply_to_event",
            event: this.props.mxEvent
        });
    };

    onEditClick = ev => {
        dis.dispatch({
            action: "edit_event",
            event: this.props.mxEvent
        });
    };

    getMenuOptions = ev => {
        const menuOptions = {};
        const buttonRect = ev.target.getBoundingClientRect();
        // The window X and Y offsets are to adjust position when zoomed in to page
        const buttonRight = buttonRect.right + window.pageXOffset;
        const buttonBottom = buttonRect.bottom + window.pageYOffset;
        const buttonTop = buttonRect.top + window.pageYOffset;
        // Align the right edge of the menu to the right edge of the button
        menuOptions.right = window.innerWidth - buttonRight;
        // Align the menu vertically on whichever side of the button has more
        // space available.
        if (buttonBottom < window.innerHeight / 2) {
            menuOptions.top = buttonBottom;
        } else {
            menuOptions.bottom = window.innerHeight - buttonTop;
        }
        return menuOptions;
    };

    onReactClick = ev => {
        const ReactionPicker = sdk.getComponent("emojipicker.ReactionPicker");

        const menuOptions = {
            ...this.getMenuOptions(ev),
            mxEvent: this.props.mxEvent,
            reactions: this.props.reactions,
            chevronFace: "none",
            onFinished: () => this.onFocusChange(false)
        };

        createMenu(ReactionPicker, menuOptions);

        this.onFocusChange(true);
    };

    onOptionsClick = ev => {
        const MessageContextMenu = sdk.getComponent(
            "context_menus.MessageContextMenu"
        );

        const { getTile, getReplyThread } = this.props;
        const tile = getTile && getTile();
        const replyThread = getReplyThread && getReplyThread();

        let e2eInfoCallback = null;
        if (this.props.mxEvent.isEncrypted()) {
            e2eInfoCallback = () => this.onCryptoClick();
        }

        const menuOptions = {
            ...this.getMenuOptions(ev),
            mxEvent: this.props.mxEvent,
            chevronFace: "none",
            permalinkCreator: this.props.permalinkCreator,
            eventTileOps:
                tile && tile.getEventTileOps
                    ? tile.getEventTileOps()
                    : undefined,
            collapseReplyThread:
                replyThread && replyThread.canCollapse()
                    ? replyThread.collapse
                    : undefined,
            e2eInfoCallback: e2eInfoCallback,
            onFinished: () => {
                this.onFocusChange(false);
            }
        };

        createMenu(MessageContextMenu, menuOptions);

        this.onFocusChange(true);
    };

    render() {
        const AccessibleButton = sdk.getComponent("elements.AccessibleButton");

        let reactButton;
        let replyButton;
        let editButton;

        if (isContentActionable(this.props.mxEvent)) {
            if (this.context.room.canReact) {
                reactButton = (
                    <AccessibleButton
                        className="mx_MessageActionBar_maskButton mx_MessageActionBar_reactButton"
                        title={_t("React")}
                        onClick={this.onReactClick}
                    />
                );
            }
            if (this.context.room.canReply) {
                replyButton = (
                    <AccessibleButton
                        className="mx_MessageActionBar_maskButton mx_MessageActionBar_replyButton"
                        title={_t("Reply")}
                        onClick={this.onReplyClick}
                    />
                );
            }
        }
        if (canEditContent(this.props.mxEvent)) {
            editButton = (
                <AccessibleButton
                    className="mx_MessageActionBar_maskButton mx_MessageActionBar_editButton"
                    title={_t("Edit")}
                    onClick={this.onEditClick}
                />
            );
        }

        // aria-live=off to not have this read out automatically as navigating around timeline, gets repetitive.
        return (
            <div
                className="mx_MessageActionBar"
                role="toolbar"
                aria-label={_t("Message Actions")}
                aria-live="off"
            >
                {reactButton}
                {replyButton}
                {editButton}
                <AccessibleButton
                    className="mx_MessageActionBar_maskButton mx_MessageActionBar_optionsButton"
                    title={_t("Options")}
                    onClick={this.onOptionsClick}
                    aria-haspopup={true}
                />
            </div>
        );
    }
}
