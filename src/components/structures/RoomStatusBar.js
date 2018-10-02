/*
Copyright 2015, 2016 OpenMarket Ltd
Copyright 2017, 2018 New Vector Ltd

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
import Matrix from 'matrix-js-sdk';
import { _t, _td } from '../../languageHandler';
import sdk from '../../index';
import WhoIsTyping from '../../WhoIsTyping';
import MatrixClientPeg from '../../MatrixClientPeg';
import MemberAvatar from '../views/avatars/MemberAvatar';
import Resend from '../../Resend';
import * as cryptodevices from '../../cryptodevices';
import dis from '../../dispatcher';
import { messageForResourceLimitError } from '../../utils/ErrorUtils';

const STATUS_BAR_HIDDEN = 0;
const STATUS_BAR_EXPANDED = 1;
const STATUS_BAR_EXPANDED_LARGE = 2;

function getUnsentMessages(room) {
    if (!room) { return []; }
    return room.getPendingEvents().filter(function(ev) {
        return ev.status === Matrix.EventStatus.NOT_SENT;
    });
};

module.exports = React.createClass({
    displayName: 'RoomStatusBar',

    propTypes: {
        // the room this statusbar is representing.
        room: PropTypes.object.isRequired,

        // the number of messages which have arrived since we've been scrolled up
        numUnreadMessages: PropTypes.number,

        // this is true if we are fully scrolled-down, and are looking at
        // the end of the live timeline.
        atEndOfLiveTimeline: PropTypes.bool,

        // This is true when the user is alone in the room, but has also sent a message.
        // Used to suggest to the user to invite someone
        sentMessageAndIsAlone: PropTypes.bool,

        // true if there is an active call in this room (means we show
        // the 'Active Call' text in the status bar if there is nothing
        // more interesting)
        hasActiveCall: PropTypes.bool,

        // Number of names to display in typing indication. E.g. set to 3, will
        // result in "X, Y, Z and 100 others are typing."
        whoIsTypingLimit: PropTypes.number,

        // callback for when the user clicks on the 'resend all' button in the
        // 'unsent messages' bar
        onResendAllClick: PropTypes.func,

        // callback for when the user clicks on the 'cancel all' button in the
        // 'unsent messages' bar
        onCancelAllClick: PropTypes.func,

        // callback for when the user clicks on the 'invite others' button in the
        // 'you are alone' bar
        onInviteClick: PropTypes.func,

        // callback for when the user clicks on the 'stop warning me' button in the
        // 'you are alone' bar
        onStopWarningClick: PropTypes.func,

        // callback for when the user clicks on the 'scroll to bottom' button
        onScrollToBottomClick: PropTypes.func,

        // callback for when we do something that changes the size of the
        // status bar. This is used to trigger a re-layout in the parent
        // component.
        onResize: PropTypes.func,

        // callback for when the status bar can be hidden from view, as it is
        // not displaying anything
        onHidden: PropTypes.func,

        // callback for when the status bar is displaying something and should
        // be visible
        onVisible: PropTypes.func,
    },

    getDefaultProps: function() {
        return {
            whoIsTypingLimit: 3,
        };
    },

    getInitialState: function() {
        return {
            syncState: MatrixClientPeg.get().getSyncState(),
            syncStateData: MatrixClientPeg.get().getSyncStateData(),
            usersTyping: WhoIsTyping.usersTypingApartFromMe(this.props.room),
            unsentMessages: getUnsentMessages(this.props.room),
        };
    },

    componentWillMount: function() {
        MatrixClientPeg.get().on("sync", this.onSyncStateChange);
        MatrixClientPeg.get().on("RoomMember.typing", this.onRoomMemberTyping);
        MatrixClientPeg.get().on("Room.localEchoUpdated", this._onRoomLocalEchoUpdated);

        this._checkSize();
    },

    componentDidUpdate: function() {
        this._checkSize();
    },

    componentWillUnmount: function() {
        // we may have entirely lost our client as we're logging out before clicking login on the guest bar...
        const client = MatrixClientPeg.get();
        if (client) {
            client.removeListener("sync", this.onSyncStateChange);
            client.removeListener("RoomMember.typing", this.onRoomMemberTyping);
            client.removeListener("Room.localEchoUpdated", this._onRoomLocalEchoUpdated);
        }
    },

    onSyncStateChange: function(state, prevState, data) {
        if (state === "SYNCING" && prevState === "SYNCING") {
            return;
        }
        this.setState({
            syncState: state,
            syncStateData: data,
        });
    },

    onRoomMemberTyping: function(ev, member) {
        this.setState({
            usersTyping: WhoIsTyping.usersTypingApartFromMeAndIgnored(this.props.room),
        });
    },

    _onSendWithoutVerifyingClick: function() {
        cryptodevices.getUnknownDevicesForRoom(MatrixClientPeg.get(), this.props.room).then((devices) => {
            cryptodevices.markAllDevicesKnown(MatrixClientPeg.get(), devices);
            Resend.resendUnsentEvents(this.props.room);
        });
    },

    _onResendAllClick: function() {
        Resend.resendUnsentEvents(this.props.room);
        dis.dispatch({action: 'focus_composer'});
    },

    _onCancelAllClick: function() {
        Resend.cancelUnsentEvents(this.props.room);
        dis.dispatch({action: 'focus_composer'});
    },

    _onShowDevicesClick: function() {
        cryptodevices.showUnknownDeviceDialogForMessages(MatrixClientPeg.get(), this.props.room);
    },

    _onRoomLocalEchoUpdated: function(event, room, oldEventId, oldStatus) {
        if (room.roomId !== this.props.room.roomId) return;

        this.setState({
            unsentMessages: getUnsentMessages(this.props.room),
        });
    },

    // Check whether current size is greater than 0, if yes call props.onVisible
    _checkSize: function() {
        if (this._getSize()) {
            if (this.props.onVisible) this.props.onVisible();
        } else {
            if (this.props.onHidden) this.props.onHidden();
        }
    },

    // We don't need the actual height - just whether it is likely to have
    // changed - so we use '0' to indicate normal size, and other values to
    // indicate other sizes.
    _getSize: function() {
        if (this._shouldShowConnectionError() ||
            (this.state.usersTyping.length > 0) ||
            this.props.numUnreadMessages ||
            !this.props.atEndOfLiveTimeline ||
            this.props.hasActiveCall ||
            this.props.sentMessageAndIsAlone
        ) {
            return STATUS_BAR_EXPANDED;
        } else if (this.state.unsentMessages.length > 0) {
            return STATUS_BAR_EXPANDED_LARGE;
        }
        return STATUS_BAR_HIDDEN;
    },

    // return suitable content for the image on the left of the status bar.
    //
    // if wantPlaceholder is true, we include a "..." placeholder if
    // there is nothing better to put in.
    _getIndicator: function(wantPlaceholder) {
        if (this.props.numUnreadMessages) {
            return (
                <div className="mx_RoomStatusBar_scrollDownIndicator"
                        onClick={this.props.onScrollToBottomClick}>
                    <img src="img/newmessages.svg" width="24" height="24"
                        alt="" />
                </div>
            );
        }

            const AccessibleButton = sdk.getComponent("elements.AccessibleButton");
        if (!this.props.atEndOfLiveTimeline) {
            return (
                <AccessibleButton className="mx_RoomStatusBar_scrollDownIndicator"
                        onClick={this.props.onScrollToBottomClick}>
                    <img src="img/scrolldown.svg" width="24" height="24"
                        alt={_t("Scroll to bottom of page")}
                        title={_t("Scroll to bottom of page")} />
                </AccessibleButton>
            );
        }

        if (this.props.hasActiveCall) {
            const TintableSvg = sdk.getComponent("elements.TintableSvg");
            return (
                <TintableSvg src="img/sound-indicator.svg" width="23" height="20" />
            );
        }

        if (this._shouldShowConnectionError()) {
            return null;
        }

        if (wantPlaceholder) {
            return (
                <div className="mx_RoomStatusBar_typingIndicatorAvatars">
                    { this._renderTypingIndicatorAvatars(this.props.whoIsTypingLimit) }
                </div>
            );
        }

        return null;
    },

    _renderTypingIndicatorAvatars: function(limit) {
        let users = this.state.usersTyping;

        let othersCount = 0;
        if (users.length > limit) {
            othersCount = users.length - limit + 1;
            users = users.slice(0, limit - 1);
        }

        const avatars = users.map((u) => {
            return (
                <MemberAvatar
                    key={u.userId}
                    member={u}
                    width={24}
                    height={24}
                    resizeMethod="crop"
                />
            );
        });

        if (othersCount > 0) {
            avatars.push(
                <span className="mx_RoomStatusBar_typingIndicatorRemaining" key="others">
                    +{ othersCount }
                </span>,
            );
        }

        return avatars;
    },

    _shouldShowConnectionError: function() {
        // no conn bar trumps unread count since you can't get unread messages
        // without a connection! (technically may already have some but meh)
        // It also trumps the "some not sent" msg since you can't resend without
        // a connection!
        // There's one situation in which we don't show this 'no connection' bar, and that's
        // if it's a resource limit exceeded error: those are shown in the top bar.
        const errorIsMauError = Boolean(
            this.state.syncStateData &&
            this.state.syncStateData.error &&
            this.state.syncStateData.error.errcode === 'M_RESOURCE_LIMIT_EXCEEDED'
        );
        return this.state.syncState === "ERROR" && !errorIsMauError;
    },

    _getUnsentMessageContent: function() {
        const unsentMessages = this.state.unsentMessages;
        if (!unsentMessages.length) return null;

        let title;
        let content;

        const hasUDE = unsentMessages.some((m) => {
            return m.error && m.error.name === "UnknownDeviceError";
        });

        if (hasUDE) {
            title = _t("Message not sent due to unknown devices being present");
            content = _t(
                "<showDevicesText>Show devices</showDevicesText>, <sendAnywayText>send anyway</sendAnywayText> or <cancelText>cancel</cancelText>.",
                {},
                {
                    'showDevicesText': (sub) => <a className="mx_RoomStatusBar_resend_link" key="resend" onClick={this._onShowDevicesClick}>{ sub }</a>,
                    'sendAnywayText': (sub) => <a className="mx_RoomStatusBar_resend_link" key="sendAnyway" onClick={this._onSendWithoutVerifyingClick}>{ sub }</a>,
                    'cancelText': (sub) => <a className="mx_RoomStatusBar_resend_link" key="cancel" onClick={this._onCancelAllClick}>{ sub }</a>,
                },
            );
        } else {
            let consentError = null;
            let resourceLimitError = null;
            for (const m of unsentMessages) {
                if (m.error && m.error.errcode === 'M_CONSENT_NOT_GIVEN') {
                    consentError = m.error;
                    break;
                } else if (m.error && m.error.errcode === 'M_RESOURCE_LIMIT_EXCEEDED') {
                    resourceLimitError = m.error;
                    break;
                }
            }
            if (consentError) {
                title = _t(
                    "You can't send any messages until you review and agree to " +
                    "<consentLink>our terms and conditions</consentLink>.",
                    {},
                    {
                        'consentLink': (sub) =>
                            <a href={consentError.data && consentError.data.consent_uri} target="_blank">
                                { sub }
                            </a>,
                    },
                );
            } else if (resourceLimitError) {
                title = messageForResourceLimitError(
                    resourceLimitError.data.limit_type,
                    resourceLimitError.data.admin_contact, {
                    'monthly_active_user': _td(
                        "Your message wasn't sent because this homeserver has hit its Monthly Active User Limit. " +
                        "Please <a>contact your service administrator</a> to continue using the service.",
                    ),
                    '': _td(
                        "Your message wasn't sent because this homeserver has exceeded a resource limit. " +
                        "Please <a>contact your service administrator</a> to continue using the service.",
                    ),
                });
            } else if (
                unsentMessages.length === 1 &&
                unsentMessages[0].error &&
                unsentMessages[0].error.data &&
                unsentMessages[0].error.data.error
            ) {
                title = unsentMessages[0].error.data.error;
            } else {
                title = _t('%(count)s of your messages have not been sent.', { count: unsentMessages.length });
            }
            content = _t("%(count)s <resendText>Resend all</resendText> or <cancelText>cancel all</cancelText> now. " +
               "You can also select individual messages to resend or cancel.",
                { count: unsentMessages.length },
                {
                    'resendText': (sub) =>
                        <a className="mx_RoomStatusBar_resend_link" key="resend" onClick={this._onResendAllClick}>{ sub }</a>,
                    'cancelText': (sub) =>
                        <a className="mx_RoomStatusBar_resend_link" key="cancel" onClick={this._onCancelAllClick}>{ sub }</a>,
                },
            );
        }

        return <div className="mx_RoomStatusBar_connectionLostBar">
            <img src="img/warning.svg" width="24" height="23" title={_t("Warning")} alt="" />
            <div>
                <div className="mx_RoomStatusBar_connectionLostBar_title">
                    { title }
                </div>
                <div className="mx_RoomStatusBar_connectionLostBar_desc">
                    { content }
                </div>
            </div>
        </div>;
    },

    // return suitable content for the main (text) part of the status bar.
    _getContent: function() {
        const EmojiText = sdk.getComponent('elements.EmojiText');

        if (this._shouldShowConnectionError()) {
            return (
                <div className="mx_RoomStatusBar_connectionLostBar">
                    <img src="img/warning.svg" width="24" height="23" title="/!\ " alt="/!\ " />
                    <div>
                        <div className="mx_RoomStatusBar_connectionLostBar_title">
                            { _t('Connectivity to the server has been lost.') }
                        </div>
                        <div className="mx_RoomStatusBar_connectionLostBar_desc">
                            { _t('Sent messages will be stored until your connection has returned.') }
                        </div>
                    </div>
                </div>
            );
        }

        if (this.state.unsentMessages.length > 0) {
            return this._getUnsentMessageContent();
        }

        // unread count trumps who is typing since the unread count is only
        // set when you've scrolled up
        if (this.props.numUnreadMessages) {
            // MUST use var name "count" for pluralization to kick in
            const unreadMsgs = _t("%(count)s new messages", {count: this.props.numUnreadMessages});

            return (
                <div className="mx_RoomStatusBar_unreadMessagesBar"
                        onClick={this.props.onScrollToBottomClick}>
                    { unreadMsgs }
                </div>
            );
        }

        const typingString = WhoIsTyping.whoIsTypingString(
            this.state.usersTyping,
            this.props.whoIsTypingLimit,
        );
        if (typingString) {
            return (
                <div className="mx_RoomStatusBar_typingBar">
                    <EmojiText>{ typingString }</EmojiText>
                </div>
            );
        }

        if (this.props.hasActiveCall) {
            return (
                <div className="mx_RoomStatusBar_callBar">
                    <b>{ _t('Active call') }</b>
                </div>
            );
        }

        // If you're alone in the room, and have sent a message, suggest to invite someone
        if (this.props.sentMessageAndIsAlone) {
            return (
                <div className="mx_RoomStatusBar_isAlone">
                    { _t("There's no one else here! Would you like to <inviteText>invite others</inviteText> " +
                            "or <nowarnText>stop warning about the empty room</nowarnText>?",
                        {},
                        {
                            'inviteText': (sub) =>
                                <a className="mx_RoomStatusBar_resend_link" key="invite" onClick={this.props.onInviteClick}>{ sub }</a>,
                            'nowarnText': (sub) =>
                                <a className="mx_RoomStatusBar_resend_link" key="nowarn" onClick={this.props.onStopWarningClick}>{ sub }</a>,
                        },
                    ) }
                </div>
            );
        }

        return null;
    },

    render: function() {
        const content = this._getContent();
        const indicator = this._getIndicator(this.state.usersTyping.length > 0);

        return (
            <div className="mx_RoomStatusBar">
                <div className="mx_RoomStatusBar_indicator">
                    { indicator }
                </div>
                <div role="alert">
                    { content }
                </div>
            </div>
        );
    },
});
