/*
Copyright 2015, 2016 OpenMarket Ltd
Copyright 2018 New Vector Ltd
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

import React from 'react';
import PropTypes from 'prop-types';
import {EventStatus} from 'matrix-js-sdk';

import {MatrixClientPeg} from '../../../MatrixClientPeg';
import dis from '../../../dispatcher/dispatcher';
import * as sdk from '../../../index';
import {_t} from '../../../languageHandler';
import Modal from '../../../Modal';
import Resend from '../../../Resend';
import SettingsStore from '../../../settings/SettingsStore';
import {isUrlPermitted} from '../../../HtmlUtils';
import {isContentActionable} from '../../../utils/EventUtils';
import {EventType} from "matrix-js-sdk/src/@types/event";
import IconizedContextMenu, {IconizedContextMenuOption, IconizedContextMenuOptionList} from "./IconizedContextMenu";

function canCancel(eventStatus) {
    return eventStatus === EventStatus.QUEUED || eventStatus === EventStatus.NOT_SENT;
}

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
        const canRedact = room.currentState.maySendRedactionForEvent(this.props.mxEvent, cli.credentials.userId)
            && this.props.mxEvent.getType() !== EventType.RoomServerAcl;
        let canPin = room.currentState.mayClientSendStateEvent('m.room.pinned_events', cli);

        // HACK: Intentionally say we can't pin if the user doesn't want to use the functionality
        if (!SettingsStore.getValue("feature_pinning")) canPin = false;

        this.setState({canRedact, canPin});
    };

    _isPinned() {
        const room = MatrixClientPeg.get().getRoom(this.props.mxEvent.getRoomId());
        const pinnedEvent = room.currentState.getStateEvents('m.room.pinned_events', '');
        if (!pinnedEvent) return false;
        const content = pinnedEvent.getContent();
        return content.pinned && Array.isArray(content.pinned) && content.pinned.includes(this.props.mxEvent.getId());
    }

    onResendClick = () => {
        Resend.resend(this.props.mxEvent);
        this.closeMenu();
    };

    onResendEditClick = () => {
        Resend.resend(this.props.mxEvent.replacingEvent());
        this.closeMenu();
    };

    onResendRedactionClick = () => {
        Resend.resend(this.props.mxEvent.localRedactionEvent());
        this.closeMenu();
    };

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
        const ev = this.props.mxEvent.replacingEvent() || this.props.mxEvent;
        const ViewSource = sdk.getComponent('structures.ViewSource');
        Modal.createTrackedDialog('View Event Source', '', ViewSource, {
            roomId: ev.getRoomId(),
            eventId: ev.getId(),
            content: ev.event,
        }, 'mx_Dialog_viewsource');
        this.closeMenu();
    };

    onViewClearSourceClick = () => {
        const ev = this.props.mxEvent.replacingEvent() || this.props.mxEvent;
        const ViewSource = sdk.getComponent('structures.ViewSource');
        Modal.createTrackedDialog('View Clear Event Source', '', ViewSource, {
            roomId: ev.getRoomId(),
            eventId: ev.getId(),
            // FIXME: _clearEvent is private
            content: ev._clearEvent,
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

    onCancelSendClick = () => {
        const mxEvent = this.props.mxEvent;
        const editEvent = mxEvent.replacingEvent();
        const redactEvent = mxEvent.localRedactionEvent();
        const pendingReactions = this._getPendingReactions();

        if (editEvent && canCancel(editEvent.status)) {
            Resend.removeFromQueue(editEvent);
        }
        if (redactEvent && canCancel(redactEvent.status)) {
            Resend.removeFromQueue(redactEvent);
        }
        if (pendingReactions.length) {
            for (const reaction of pendingReactions) {
                Resend.removeFromQueue(reaction);
            }
        }
        if (canCancel(mxEvent.status)) {
            Resend.removeFromQueue(this.props.mxEvent);
        }
        this.closeMenu();
    };

    onForwardClick = () => {
        dis.dispatch({
            action: 'forward_event',
            event: this.props.mxEvent,
        });
        this.closeMenu();
    };

    onPinClick = () => {
        MatrixClientPeg.get().getStateEvent(this.props.mxEvent.getRoomId(), 'm.room.pinned_events', '')
            .catch((e) => {
                // Intercept the Event Not Found error and fall through the promise chain with no event.
                if (e.errcode === "M_NOT_FOUND") return null;
                throw e;
            })
            .then((event) => {
                const eventIds = (event ? event.pinned : []) || [];
                if (!eventIds.includes(this.props.mxEvent.getId())) {
                    // Not pinned - add
                    eventIds.push(this.props.mxEvent.getId());
                } else {
                    // Pinned - remove
                    eventIds.splice(eventIds.indexOf(this.props.mxEvent.getId()), 1);
                }

                const cli = MatrixClientPeg.get();
                cli.sendStateEvent(this.props.mxEvent.getRoomId(), 'm.room.pinned_events', {pinned: eventIds}, '');
            });
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
        const editStatus = mxEvent.replacingEvent() && mxEvent.replacingEvent().status;
        const redactStatus = mxEvent.localRedactionEvent() && mxEvent.localRedactionEvent().status;
        const unsentReactionsCount = this._getUnsentReactions().length;
        const pendingReactionsCount = this._getPendingReactions().length;
        const allowCancel = canCancel(mxEvent.status) ||
            canCancel(editStatus) ||
            canCancel(redactStatus) ||
            pendingReactionsCount !== 0;
        let resendButton;
        let resendEditButton;
        let resendReactionsButton;
        let resendRedactionButton;
        let redactButton;
        let cancelButton;
        let forwardButton;
        let pinButton;
        let viewClearSourceButton;
        let unhidePreviewButton;
        let externalURLButton;
        let quoteButton;
        let collapseReplyThread;
        const optionLists = [];

        // status is SENT before remote-echo, null after
        const isSent = !eventStatus || eventStatus === EventStatus.SENT;
        if (!mxEvent.isRedacted()) {
            if (eventStatus === EventStatus.NOT_SENT) {
                resendButton = (
                    <IconizedContextMenuOption
                        iconClassName="mx_MessageContextMenu_iconResend"
                        label={_t("Resend")}
                        onClick={this.onResendClick}
                    />
                );
            }

            if (editStatus === EventStatus.NOT_SENT) {
                resendEditButton = (
                    <IconizedContextMenuOption
                        iconClassName="mx_MessageContextMenu_iconResend"
                        label={_t("Resend edit")}
                        onClick={this.onResendEditClick}
                    />
                );
            }

            if (unsentReactionsCount !== 0) {
                resendReactionsButton = (
                    <IconizedContextMenuOption
                        iconClassName="mx_MessageContextMenu_iconResend"
                        label={ _t('Resend %(unsentCount)s reaction(s)', {unsentCount: unsentReactionsCount}) }
                        onClick={this.onResendReactionsClick}
                    />
                );
            }
        }

        if (redactStatus === EventStatus.NOT_SENT) {
            resendRedactionButton = (
                <IconizedContextMenuOption
                    iconClassName="mx_MessageContextMenu_iconResend"
                    label={_t("Resend removal")}
                    onClick={this.onResendRedactionClick}
                />
            );
        }

        if (isSent && this.state.canRedact) {
            redactButton = (
                <IconizedContextMenuOption
                    iconClassName="mx_MessageContextMenu_iconRedact"
                    label={_t("Remove")}
                    onClick={this.onRedactClick}
                />
            );
        }

        if (allowCancel) {
            cancelButton = (
                <IconizedContextMenuOption
                    iconClassName="mx_MessageContextMenu_iconCancel"
                    label={_t("Cancel Sending")}
                    onClick={this.onCancelSendClick}
                />
            );
        }

        if (isContentActionable(mxEvent)) {
            forwardButton = (
                <IconizedContextMenuOption
                    iconClassName="mx_MessageContextMenu_iconForward"
                    label={_t("Forward Message")}
                    onClick={this.onForwardClick}
                />
            );

            if (this.state.canPin) {
                pinButton = (
                    <IconizedContextMenuOption
                        iconClassName="mx_MessageContextMenu_iconPin"
                        label={ this._isPinned() ? _t('Unpin Message') : _t('Pin Message') }
                        onClick={this.onPinClick}
                    />
                );
            }
        }

        const viewSourceButton = (
            <IconizedContextMenuOption
                iconClassName="mx_MessageContextMenu_iconSource"
                label={_t("View Source")}
                onClick={this.onViewSourceClick}
            />
        );

        if (mxEvent.getType() !== mxEvent.getWireType()) {
            viewClearSourceButton = (
                <IconizedContextMenuOption
                    iconClassName="mx_MessageContextMenu_iconSource"
                    label={_t("View Decrypted Source")}
                    onClick={this.onViewClearSourceClick}
                />
            );
        }

        if (this.props.eventTileOps) {
            if (this.props.eventTileOps.isWidgetHidden()) {
                unhidePreviewButton = (
                    <IconizedContextMenuOption
                        iconClassName="mx_MessageContextMenu_iconUnhidePreview"
                        label={_t("Unhide Preview")}
                        onClick={this.onUnhidePreviewClick}
                    />
                );
            }
        }

        let permalink;
        if (this.props.permalinkCreator) {
            permalink = this.props.permalinkCreator.forEvent(this.props.mxEvent.getId());
        }
        // XXX: if we use room ID, we should also include a server where the event can be found (other than in the domain of the event ID)
        const permalinkButton = (
            <IconizedContextMenuOption
                iconClassName="mx_MessageContextMenu_iconPermalink"
                onClick={this.onPermalinkClick}
                label= { mxEvent.isRedacted() || mxEvent.getType() !== 'm.room.message'
                    ? _t('Share Permalink') : _t('Share Message') }
                element="a"
                href={permalink}
                target="_blank"
                rel="noreferrer noopener"
            />
        );

        if (this.props.eventTileOps) { // this event is rendered using TextualBody
            quoteButton = (
                <IconizedContextMenuOption
                    iconClassName="mx_MessageContextMenu_iconQuote"
                    label={_t("Quote")}
                    onClick={this.onQuoteClick}
                />
            );
        }

        // Bridges can provide a 'external_url' to link back to the source.
        if (
            typeof (mxEvent.event.content.external_url) === "string" &&
            isUrlPermitted(mxEvent.event.content.external_url)
        ) {
            externalURLButton = (
                <IconizedContextMenuOption
                    iconClassName="mx_MessageContextMenu_iconLink"
                    onClick={this.closeMenu}
                    label={_t('Source URL')}
                    element="a"
                    target="_blank"
                    rel="noreferrer noopener"
                    href={mxEvent.event.content.external_url}
                />
            );
        }

        if (this.props.collapseReplyThread) {
            collapseReplyThread = (
                <IconizedContextMenuOption
                    iconClassName="mx_MessageContextMenu_iconCollapse"
                    label={_t("Collapse Reply Thread")}
                    onClick={this.onCollapseReplyThreadClick}
                />
            );
        }

        let reportEventButton;
        if (mxEvent.getSender() !== me) {
            reportEventButton = (
                <IconizedContextMenuOption
                    iconClassName="mx_MessageContextMenu_iconReport"
                    label={_t("Report Content")}
                    onClick={this.onReportEventClick}
                />
            );
        }

        if (viewSourceButton || viewClearSourceButton) {
            optionLists.push((
                <IconizedContextMenuOptionList key={'group1'}>
                    {viewSourceButton}
                    {viewClearSourceButton}
                </IconizedContextMenuOptionList>
            ));
        }

        if (resendButton || resendEditButton || resendReactionsButton || resendRedactionButton) {
            optionLists.push((
                <IconizedContextMenuOptionList key={'group2'}>
                    {resendButton}
                    {resendEditButton}
                    {resendReactionsButton}
                    {resendRedactionButton}
                </IconizedContextMenuOptionList>
            ));
        }

        if (redactButton || cancelButton) {
            optionLists.push((
                <IconizedContextMenuOptionList red key={'group3'}>
                    {redactButton}
                    {cancelButton}
                </IconizedContextMenuOptionList>
            ));
        }

        if (externalURLButton || permalinkButton) {
            optionLists.push((
                <IconizedContextMenuOptionList key={'group4'}>
                    {externalURLButton}
                    {permalinkButton}
                </IconizedContextMenuOptionList>
            ));
        }

        if (pinButton || unhidePreviewButton || reportEventButton) {
            optionLists.push((
                <IconizedContextMenuOptionList key={'group5'}>
                    {pinButton}
                    {unhidePreviewButton}
                    {reportEventButton}
                </IconizedContextMenuOptionList>
            ));
        }

        if (forwardButton || quoteButton || collapseReplyThread) {
            optionLists.push((
                <IconizedContextMenuOptionList key={'group6'}>
                    {forwardButton}
                    {collapseReplyThread}
                    {quoteButton}
                </IconizedContextMenuOptionList>
            ));
        }

        return (
            <IconizedContextMenu
                {...this.props}
                className="mx_MessageContextMenu"
                compact={true}
            >
                {optionLists}
            </IconizedContextMenu>
        );
    }
}
