/*
Copyright 2015, 2016 OpenMarket Ltd
Copyright 2018 New Vector Ltd

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

import MatrixClientPeg from '../../../MatrixClientPeg';
import dis from '../../../dispatcher';
import sdk from '../../../index';
import { _t } from '../../../languageHandler';
import Modal from '../../../Modal';
import Resend from '../../../Resend';
import SettingsStore from '../../../settings/SettingsStore';
import {makeEventPermalink} from '../../../matrix-to';
import { isUrlPermitted } from '../../../HtmlUtils';

module.exports = React.createClass({
    displayName: 'MessageContextMenu',

    propTypes: {
        /* the MatrixEvent associated with the context menu */
        mxEvent: PropTypes.object.isRequired,

        /* an optional EventTileOps implementation that can be used to unhide preview widgets */
        eventTileOps: PropTypes.object,

        /* an optional function to be called when the user clicks collapse thread, if not provided hide button */
        collapseReplyThread: PropTypes.func,

        /* callback called when the menu is dismissed */
        onFinished: PropTypes.func,
    },

    getInitialState: function() {
        return {
            canRedact: false,
            canPin: false,
        };
    },

    componentWillMount: function() {
        MatrixClientPeg.get().on('RoomMember.powerLevel', this._checkPermissions);
        this._checkPermissions();
    },

    componentWillUnmount: function() {
        const cli = MatrixClientPeg.get();
        if (cli) {
            cli.removeListener('RoomMember.powerLevel', this._checkPermissions);
        }
    },

    _checkPermissions: function() {
        const cli = MatrixClientPeg.get();
        const room = cli.getRoom(this.props.mxEvent.getRoomId());

        const canRedact = room.currentState.maySendRedactionForEvent(this.props.mxEvent, cli.credentials.userId);
        let canPin = room.currentState.mayClientSendStateEvent('m.room.pinned_events', cli);

        // HACK: Intentionally say we can't pin if the user doesn't want to use the functionality
        if (!SettingsStore.isFeatureEnabled("feature_pinning")) canPin = false;

        this.setState({canRedact, canPin});
    },

    _isPinned: function() {
        const room = MatrixClientPeg.get().getRoom(this.props.mxEvent.getRoomId());
        const pinnedEvent = room.currentState.getStateEvents('m.room.pinned_events', '');
        if (!pinnedEvent) return false;
        return pinnedEvent.getContent().pinned.includes(this.props.mxEvent.getId());
    },

    onResendClick: function() {
        Resend.resend(this.props.mxEvent);
        this.closeMenu();
    },

    onViewSourceClick: function() {
        const ViewSource = sdk.getComponent('structures.ViewSource');
        Modal.createTrackedDialog('View Event Source', '', ViewSource, {
            content: this.props.mxEvent.event,
        }, 'mx_Dialog_viewsource');
        this.closeMenu();
    },

    onViewClearSourceClick: function() {
        const ViewSource = sdk.getComponent('structures.ViewSource');
        Modal.createTrackedDialog('View Clear Event Source', '', ViewSource, {
            // FIXME: _clearEvent is private
            content: this.props.mxEvent._clearEvent,
        }, 'mx_Dialog_viewsource');
        this.closeMenu();
    },

    onRedactClick: function() {
        const ConfirmRedactDialog = sdk.getComponent("dialogs.ConfirmRedactDialog");
        Modal.createTrackedDialog('Confirm Redact Dialog', '', ConfirmRedactDialog, {
            onFinished: (proceed) => {
                if (!proceed) return;

                const cli = MatrixClientPeg.get();
                cli.redactEvent(this.props.mxEvent.getRoomId(), this.props.mxEvent.getId()).catch(function(e) {
                    const ErrorDialog = sdk.getComponent("dialogs.ErrorDialog");
                    // display error message stating you couldn't delete this.
                    const code = e.errcode || e.statusCode;
                    Modal.createTrackedDialog('You cannot delete this message', '', ErrorDialog, {
                        title: _t('Error'),
                        description: _t('You cannot delete this message. (%(code)s)', {code}),
                    });
                }).done();
            },
        }, 'mx_Dialog_confirmredact');
        this.closeMenu();
    },

    onCancelSendClick: function() {
        Resend.removeFromQueue(this.props.mxEvent);
        this.closeMenu();
    },

    onForwardClick: function() {
        dis.dispatch({
            action: 'forward_event',
            event: this.props.mxEvent,
        });
        this.closeMenu();
    },

    onPinClick: function() {
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
    },

    closeMenu: function() {
        if (this.props.onFinished) this.props.onFinished();
    },

    onUnhidePreviewClick: function() {
        if (this.props.eventTileOps) {
            this.props.eventTileOps.unhideWidget();
        }
        this.closeMenu();
    },

    onQuoteClick: function() {
        dis.dispatch({
            action: 'quote',
            event: this.props.mxEvent,
        });
        this.closeMenu();
    },

    onPermalinkClick: function(e: Event) {
        e.preventDefault();
        const ShareDialog = sdk.getComponent("dialogs.ShareDialog");
        Modal.createTrackedDialog('share room message dialog', '', ShareDialog, {
            target: this.props.mxEvent,
        });
        this.closeMenu();
    },

    onReplyClick: function() {
        dis.dispatch({
            action: 'reply_to_event',
            event: this.props.mxEvent,
        });
        this.closeMenu();
    },

    onCollapseReplyThreadClick: function() {
        this.props.collapseReplyThread();
        this.closeMenu();
    },

    render: function() {
        const eventStatus = this.props.mxEvent.status;
        let resendButton;
        let redactButton;
        let cancelButton;
        let forwardButton;
        let pinButton;
        let viewClearSourceButton;
        let unhidePreviewButton;
        let externalURLButton;
        let quoteButton;
        let replyButton;
        let collapseReplyThread;

        // status is SENT before remote-echo, null after
        const isSent = !eventStatus || eventStatus === EventStatus.SENT;

        if (eventStatus === EventStatus.NOT_SENT) {
            resendButton = (
                <div className="mx_MessageContextMenu_field" onClick={this.onResendClick}>
                    { _t('Resend') }
                </div>
            );
        }

        if (isSent && this.state.canRedact) {
            redactButton = (
                <div className="mx_MessageContextMenu_field" onClick={this.onRedactClick}>
                    { _t('Remove') }
                </div>
            );
        }

        if (eventStatus === EventStatus.QUEUED || eventStatus === EventStatus.NOT_SENT) {
            cancelButton = (
                <div className="mx_MessageContextMenu_field" onClick={this.onCancelSendClick}>
                    { _t('Cancel Sending') }
                </div>
            );
        }

        if (isSent && this.props.mxEvent.getType() === 'm.room.message') {
            const content = this.props.mxEvent.getContent();
            if (content.msgtype && content.msgtype !== 'm.bad.encrypted' && content.hasOwnProperty('body')) {
                forwardButton = (
                    <div className="mx_MessageContextMenu_field" onClick={this.onForwardClick}>
                        { _t('Forward Message') }
                    </div>
                );

                replyButton = (
                    <div className="mx_MessageContextMenu_field" onClick={this.onReplyClick}>
                        { _t('Reply') }
                    </div>
                );

                if (this.state.canPin) {
                    pinButton = (
                        <div className="mx_MessageContextMenu_field" onClick={this.onPinClick}>
                            { this._isPinned() ? _t('Unpin Message') : _t('Pin Message') }
                        </div>
                    );
                }
            }
        }

        const viewSourceButton = (
            <div className="mx_MessageContextMenu_field" onClick={this.onViewSourceClick}>
                { _t('View Source') }
            </div>
        );

        if (this.props.mxEvent.getType() !== this.props.mxEvent.getWireType()) {
            viewClearSourceButton = (
                <div className="mx_MessageContextMenu_field" onClick={this.onViewClearSourceClick}>
                    { _t('View Decrypted Source') }
                </div>
            );
        }

        if (this.props.eventTileOps) {
            if (this.props.eventTileOps.isWidgetHidden()) {
                unhidePreviewButton = (
                    <div className="mx_MessageContextMenu_field" onClick={this.onUnhidePreviewClick}>
                        { _t('Unhide Preview') }
                    </div>
                );
            }
        }

        // XXX: if we use room ID, we should also include a server where the event can be found (other than in the domain of the event ID)
        const permalinkButton = (
            <div className="mx_MessageContextMenu_field">
                <a href={makeEventPermalink(this.props.mxEvent.getRoomId(), this.props.mxEvent.getId())}
                  target="_blank" rel="noopener" onClick={this.onPermalinkClick}>{ _t('Share Message') }</a>
            </div>
        );

        if (this.props.eventTileOps && this.props.eventTileOps.getInnerText) {
            quoteButton = (
                <div className="mx_MessageContextMenu_field" onClick={this.onQuoteClick}>
                    { _t('Quote') }
                </div>
            );
        }

        // Bridges can provide a 'external_url' to link back to the source.
        if (
            typeof(this.props.mxEvent.event.content.external_url) === "string" &&
            isUrlPermitted(this.props.mxEvent.event.content.external_url)
        ) {
            externalURLButton = (
                <div className="mx_MessageContextMenu_field">
                    <a href={this.props.mxEvent.event.content.external_url}
                      rel="noopener" target="_blank" onClick={this.closeMenu}>{ _t('Source URL') }</a>
                </div>
          );
        }

        if (this.props.collapseReplyThread) {
            collapseReplyThread = (
                <div className="mx_MessageContextMenu_field" onClick={this.onCollapseReplyThreadClick}>
                    { _t('Collapse Reply Thread') }
                </div>
            );
        }

        return (
            <div>
                { resendButton }
                { redactButton }
                { cancelButton }
                { forwardButton }
                { pinButton }
                { viewSourceButton }
                { viewClearSourceButton }
                { unhidePreviewButton }
                { permalinkButton }
                { quoteButton }
                { replyButton }
                { externalURLButton }
                { collapseReplyThread }
            </div>
        );
    },
});
