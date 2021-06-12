/*
Copyright 2019 Michael Telatynski <7t3chguy@gmail.com>
Copyright 2015, 2016, 2018, 2019, 2021 The Matrix.org Foundation C.I.C.

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
import { EventStatus } from 'matrix-js-sdk/src/models/event';

import { MatrixClientPeg } from '../../../MatrixClientPeg';
import dis from '../../../dispatcher/dispatcher';
import * as sdk from '../../../index';
import { _t } from '../../../languageHandler';
import Modal from '../../../Modal';
import Resend from '../../../Resend';
import SettingsStore from '../../../settings/SettingsStore';
import { isUrlPermitted } from '../../../HtmlUtils';
import { isContentActionable } from '../../../utils/EventUtils';
import { MenuItem } from "../../structures/ContextMenu";
import { EventType } from "matrix-js-sdk/src/@types/event";
import { replaceableComponent } from "../../../utils/replaceableComponent";
import { ReadPinsEventId } from "../right_panel/PinnedMessagesCard";
import ForwardDialog from "../dialogs/ForwardDialog";

export function canCancel(eventStatus) {
    return eventStatus === EventStatus.QUEUED || eventStatus === EventStatus.NOT_SENT;
}

@replaceableComponent("views.context_menus.MessageContextMenu")
export default class MessageContextMenu extends React.Component {
    static propTypes = {
        /* the MatrixEvent associated with the context menu */
        mxEvent: PropTypes.object.isRequired,

        /* an optional EventTileOps implementation that can be used to unhide preview widgets */
        eventTileOps: PropTypes.object,

        /* an optional function to be called when the user clicks collapse thread, if not provided hide button */
        collapseReplyThread: PropTypes.func,

        /* callback called when the menu is dismissed */
        onFinished: PropTypes.func,

        /* if the menu is inside a dialog, we sometimes need to close that dialog after click (forwarding) */
        onCloseDialog: PropTypes.func,
    };

    state = {
        canRedact: false,
        canPin: false,
    };

    componentDidMount() {
        MatrixClientPeg.get().on('RoomMember.powerLevel', this._checkPermissions);
        this._checkPermissions();
    }

    componentWillUnmount() {
        const cli = MatrixClientPeg.get();
        if (cli) {
            cli.removeListener('RoomMember.powerLevel', this._checkPermissions);
        }
    }

    _checkPermissions = () => {
        const cli = MatrixClientPeg.get();
        const room = cli.getRoom(this.props.mxEvent.getRoomId());

        // We explicitly decline to show the redact option on ACL events as it has a potential
        // to obliterate the room - https://github.com/matrix-org/synapse/issues/4042
        // Similarly for encryption events, since redacting them "breaks everything"
        const canRedact = room.currentState.maySendRedactionForEvent(this.props.mxEvent, cli.credentials.userId)
            && this.props.mxEvent.getType() !== EventType.RoomServerAcl
            && this.props.mxEvent.getType() !== EventType.RoomEncryption;
        let canPin = room.currentState.mayClientSendStateEvent(EventType.RoomPinnedEvents, cli);

        // HACK: Intentionally say we can't pin if the user doesn't want to use the functionality
        if (!SettingsStore.getValue("feature_pinning")) canPin = false;

        this.setState({canRedact, canPin});
    };

    _isPinned() {
        const room = MatrixClientPeg.get().getRoom(this.props.mxEvent.getRoomId());
        const pinnedEvent = room.currentState.getStateEvents(EventType.RoomPinnedEvents, '');
        if (!pinnedEvent) return false;
        const content = pinnedEvent.getContent();
        return content.pinned && Array.isArray(content.pinned) && content.pinned.includes(this.props.mxEvent.getId());
    }

    onResendReactionsClick = () => {
        for (const reaction of this._getUnsentReactions()) {
            Resend.resend(reaction);
        }
        this.closeMenu();
    };

    onReportEventClick = () => {
        const ReportEventDialog = sdk.getComponent("dialogs.ReportEventDialog");
        Modal.createTrackedDialog('Report Event', '', ReportEventDialog, {
            mxEvent: this.props.mxEvent,
        }, 'mx_Dialog_reportEvent');
        this.closeMenu();
    };

    onViewSourceClick = () => {
        const ViewSource = sdk.getComponent('structures.ViewSource');
        Modal.createTrackedDialog('View Event Source', '', ViewSource, {
            mxEvent: this.props.mxEvent,
        }, 'mx_Dialog_viewsource');
        this.closeMenu();
    };

    onRedactClick = () => {
        const ConfirmRedactDialog = sdk.getComponent("dialogs.ConfirmRedactDialog");
        Modal.createTrackedDialog('Confirm Redact Dialog', '', ConfirmRedactDialog, {
            onFinished: async (proceed, reason) => {
                if (!proceed) return;

                const cli = MatrixClientPeg.get();
                try {
                    if (this.props.onCloseDialog) this.props.onCloseDialog();
                    await cli.redactEvent(
                        this.props.mxEvent.getRoomId(),
                        this.props.mxEvent.getId(),
                        undefined,
                        reason ? { reason } : {},
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
        this.closeMenu();
    };

    onForwardClick = () => {
        Modal.createTrackedDialog('Forward Message', '', ForwardDialog, {
            matrixClient: MatrixClientPeg.get(),
            event: this.props.mxEvent,
            permalinkCreator: this.props.permalinkCreator,
        });
        this.closeMenu();
    };

    onPinClick = () => {
        const cli = MatrixClientPeg.get();
        const room = cli.getRoom(this.props.mxEvent.getRoomId());
        const eventId = this.props.mxEvent.getId();

        const pinnedIds = room?.currentState?.getStateEvents(EventType.RoomPinnedEvents, "")?.pinned || [];
        if (pinnedIds.includes(eventId)) {
            pinnedIds.splice(pinnedIds.indexOf(eventId), 1);
        } else {
            pinnedIds.push(eventId);
            cli.setRoomAccountData(room.roomId, ReadPinsEventId, {
                event_ids: [
                    ...room.getAccountData(ReadPinsEventId)?.getContent()?.event_ids,
                    eventId,
                ],
            });
        }
        cli.sendStateEvent(this.props.mxEvent.getRoomId(), EventType.RoomPinnedEvents, { pinned: pinnedIds }, "");
        this.closeMenu();
    };

    closeMenu = () => {
        if (this.props.onFinished) this.props.onFinished();
    };

    onUnhidePreviewClick = () => {
        if (this.props.eventTileOps) {
            this.props.eventTileOps.unhideWidget();
        }
        this.closeMenu();
    };

    onQuoteClick = () => {
        dis.dispatch({
            action: 'quote',
            event: this.props.mxEvent,
        });
        this.closeMenu();
    };

    onPermalinkClick = (e: Event) => {
        e.preventDefault();
        const ShareDialog = sdk.getComponent("dialogs.ShareDialog");
        Modal.createTrackedDialog('share room message dialog', '', ShareDialog, {
            target: this.props.mxEvent,
            permalinkCreator: this.props.permalinkCreator,
        });
        this.closeMenu();
    };

    onCollapseReplyThreadClick = () => {
        this.props.collapseReplyThread();
        this.closeMenu();
    };

    _getReactions(filter) {
        const cli = MatrixClientPeg.get();
        const room = cli.getRoom(this.props.mxEvent.getRoomId());
        const eventId = this.props.mxEvent.getId();
        return room.getPendingEvents().filter(e => {
            const relation = e.getRelation();
            return relation &&
                relation.rel_type === "m.annotation" &&
                relation.event_id === eventId &&
                filter(e);
        });
    }

    _getPendingReactions() {
        return this._getReactions(e => canCancel(e.status));
    }

    _getUnsentReactions() {
        return this._getReactions(e => e.status === EventStatus.NOT_SENT);
    }

    render() {
        const cli = MatrixClientPeg.get();
        const me = cli.getUserId();
        const mxEvent = this.props.mxEvent;
        const eventStatus = mxEvent.status;
        const unsentReactionsCount = this._getUnsentReactions().length;
        let resendReactionsButton;
        let redactButton;
        let forwardButton;
        let pinButton;
        let unhidePreviewButton;
        let externalURLButton;
        let quoteButton;
        let collapseReplyThread;

        // status is SENT before remote-echo, null after
        const isSent = !eventStatus || eventStatus === EventStatus.SENT;
        if (!mxEvent.isRedacted()) {
            if (unsentReactionsCount !== 0) {
                resendReactionsButton = (
                    <MenuItem className="mx_MessageContextMenu_field" onClick={this.onResendReactionsClick}>
                        { _t('Resend %(unsentCount)s reaction(s)', {unsentCount: unsentReactionsCount}) }
                    </MenuItem>
                );
            }
        }

        if (isSent && this.state.canRedact) {
            redactButton = (
                <MenuItem className="mx_MessageContextMenu_field" onClick={this.onRedactClick}>
                    { _t('Remove') }
                </MenuItem>
            );
        }

        if (isContentActionable(mxEvent)) {
            forwardButton = (
                <MenuItem className="mx_MessageContextMenu_field" onClick={this.onForwardClick}>
                    { _t('Forward Message') }
                </MenuItem>
            );

            if (this.state.canPin) {
                pinButton = (
                    <MenuItem className="mx_MessageContextMenu_field" onClick={this.onPinClick}>
                        { this._isPinned() ? _t('Unpin Message') : _t('Pin Message') }
                    </MenuItem>
                );
            }
        }

        const viewSourceButton = (
            <MenuItem className="mx_MessageContextMenu_field" onClick={this.onViewSourceClick}>
                { _t('View Source') }
            </MenuItem>
        );

        if (this.props.eventTileOps) {
            if (this.props.eventTileOps.isWidgetHidden()) {
                unhidePreviewButton = (
                    <MenuItem className="mx_MessageContextMenu_field" onClick={this.onUnhidePreviewClick}>
                        { _t('Unhide Preview') }
                    </MenuItem>
                );
            }
        }

        let permalink;
        if (this.props.permalinkCreator) {
            permalink = this.props.permalinkCreator.forEvent(this.props.mxEvent.getId());
        }
        // XXX: if we use room ID, we should also include a server where the event can be found (other than in the domain of the event ID)
        const permalinkButton = (
            <MenuItem
                element="a"
                className="mx_MessageContextMenu_field"
                onClick={this.onPermalinkClick}
                href={permalink}
                target="_blank"
                rel="noreferrer noopener"
            >
                { mxEvent.isRedacted() || mxEvent.getType() !== 'm.room.message'
                    ? _t('Share Permalink') : _t('Share Message') }
            </MenuItem>
        );

        if (this.props.eventTileOps) { // this event is rendered using TextualBody
            quoteButton = (
                <MenuItem className="mx_MessageContextMenu_field" onClick={this.onQuoteClick}>
                    { _t('Quote') }
                </MenuItem>
            );
        }

        // Bridges can provide a 'external_url' to link back to the source.
        if (
            typeof(mxEvent.event.content.external_url) === "string" &&
            isUrlPermitted(mxEvent.event.content.external_url)
        ) {
            externalURLButton = (
                <MenuItem
                    element="a"
                    className="mx_MessageContextMenu_field"
                    target="_blank"
                    rel="noreferrer noopener"
                    onClick={this.closeMenu}
                    href={mxEvent.event.content.external_url}
                >
                    { _t('Source URL') }
                </MenuItem>
            );
        }

        if (this.props.collapseReplyThread) {
            collapseReplyThread = (
                <MenuItem className="mx_MessageContextMenu_field" onClick={this.onCollapseReplyThreadClick}>
                    { _t('Collapse Reply Thread') }
                </MenuItem>
            );
        }

        let reportEventButton;
        if (mxEvent.getSender() !== me) {
            reportEventButton = (
                <MenuItem className="mx_MessageContextMenu_field" onClick={this.onReportEventClick}>
                    { _t('Report Content') }
                </MenuItem>
            );
        }

        return (
            <div className="mx_MessageContextMenu">
                { resendReactionsButton }
                { redactButton }
                { forwardButton }
                { pinButton }
                { viewSourceButton }
                { unhidePreviewButton }
                { permalinkButton }
                { quoteButton }
                { externalURLButton }
                { collapseReplyThread }
                { reportEventButton }
            </div>
        );
    }
}
