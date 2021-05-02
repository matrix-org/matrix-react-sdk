/*
Copyright 2015-2021 The Matrix.org Foundation C.I.C.
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

import React from 'react';
import classNames from "classnames";

import { EventType } from "matrix-js-sdk/src/@types/event";
import { EventStatus, MatrixEvent } from "matrix-js-sdk/src/models/event";
import { Relations } from "matrix-js-sdk/src/models/relations";
import { RoomMember } from "matrix-js-sdk/src/models/room-member";

import ReplyThread from "../elements/ReplyThread";
import { _t } from '../../../languageHandler';
import * as TextForEvent from "../../../TextForEvent";
import * as sdk from "../../../index";
import dis from '../../../dispatcher/dispatcher';
import SettingsStore from "../../../settings/SettingsStore";
import {Layout} from "../../../settings/Layout";
import {formatTime} from "../../../DateUtils";
import {MatrixClientPeg} from '../../../MatrixClientPeg';
import {ALL_RULE_TYPES} from "../../../mjolnir/BanList";
import MatrixClientContext from "../../../contexts/MatrixClientContext";
import {E2E_STATE} from "./E2EIcon";
import {toRem} from "../../../utils/units";
import {WidgetType} from "../../../widgets/WidgetType";
import RoomAvatar from "../avatars/RoomAvatar";
import {WIDGET_LAYOUT_EVENT_TYPE} from "../../../stores/widgets/WidgetLayoutStore";
import {objectHasDiff} from "../../../utils/objects";
import {replaceableComponent} from "../../../utils/replaceableComponent";
import Tooltip from "../elements/Tooltip";
import { EditorStateTransfer } from "../../../utils/EditorStateTransfer";
import { RoomPermalinkCreator } from '../../../utils/permalinks/Permalinks';
import {StaticNotificationState} from "../../../stores/notifications/StaticNotificationState";
import NotificationBadge from "./NotificationBadge";

const eventTileTypes = {
    [EventType.RoomMessage]: 'messages.MessageEvent',
    [EventType.Sticker]: 'messages.MessageEvent',
    [EventType.KeyVerificationCancel]: 'messages.MKeyVerificationConclusion',
    [EventType.KeyVerificationDone]: 'messages.MKeyVerificationConclusion',
    [EventType.CallInvite]: 'messages.TextualEvent',
    [EventType.CallAnswer]: 'messages.TextualEvent',
    [EventType.CallHangup]: 'messages.TextualEvent',
    [EventType.CallReject]: 'messages.TextualEvent',
};

const stateEventTileTypes = {
    [EventType.RoomEncryption]: 'messages.EncryptionEvent',
    [EventType.RoomCanonicalAlias]: 'messages.TextualEvent',
    [EventType.RoomCreate]: 'messages.RoomCreate',
    [EventType.RoomMember]: 'messages.TextualEvent',
    [EventType.RoomName]: 'messages.TextualEvent',
    [EventType.RoomAvatar]: 'messages.RoomAvatarEvent',
    [EventType.RoomThirdPartyInvite]: 'messages.TextualEvent',
    [EventType.RoomHistoryVisibility]: 'messages.TextualEvent',
    [EventType.RoomTopic]: 'messages.TextualEvent',
    [EventType.RoomPowerLevels]: 'messages.TextualEvent',
    [EventType.RoomPinnedEvents]: 'messages.TextualEvent',
    [EventType.RoomServerAcl]: 'messages.TextualEvent',
    // TODO: Enable support for m.widget event type (https://github.com/vector-im/element-web/issues/13111)
    'im.vector.modular.widgets': 'messages.TextualEvent',
    [WIDGET_LAYOUT_EVENT_TYPE]: 'messages.TextualEvent',
    [EventType.RoomTombstone]: 'messages.TextualEvent',
    [EventType.RoomJoinRules]: 'messages.TextualEvent',
    [EventType.RoomGuestAccess]: 'messages.TextualEvent',
    'm.room.related_groups': 'messages.TextualEvent', // legacy communities flair
};

const stateEventSingular = new Set([
    EventType.RoomEncryption,
    EventType.RoomCanonicalAlias,
    EventType.RoomCreate,
    EventType.RoomName,
    EventType.RoomAvatar,
    EventType.RoomHistoryVisibility,
    EventType.RoomTopic,
    EventType.RoomPowerLevels,
    EventType.RoomPinnedEvents,
    EventType.RoomServerAcl,
    WIDGET_LAYOUT_EVENT_TYPE,
    EventType.RoomTombstone,
    EventType.RoomJoinRules,
    EventType.RoomGuestAccess,
    'm.room.related_groups',
]);

// Add all the Mjolnir stuff to the renderer
for (const evType of ALL_RULE_TYPES) {
    stateEventTileTypes[evType] = 'messages.TextualEvent';
}

export function getHandlerTile(ev) {
    const type = ev.getType();

    // don't show verification requests we're not involved in,
    // not even when showing hidden events
    if (type === "m.room.message") {
        const content = ev.getContent();
        if (content && content.msgtype === "m.key.verification.request") {
            const client = MatrixClientPeg.get();
            const me = client && client.getUserId();
            if (ev.getSender() !== me && content.to !== me) {
                return undefined;
            } else {
                return "messages.MKeyVerificationRequest";
            }
        }
    }
    // these events are sent by both parties during verification, but we only want to render one
    // tile once the verification concludes, so filter out the one from the other party.
    if (type === "m.key.verification.done") {
        const client = MatrixClientPeg.get();
        const me = client && client.getUserId();
        if (ev.getSender() !== me) {
            return undefined;
        }
    }

    // sometimes MKeyVerificationConclusion declines to render.  Jankily decline to render and
    // fall back to showing hidden events, if we're viewing hidden events
    // XXX: This is extremely a hack. Possibly these components should have an interface for
    // declining to render?
    if (type === "m.key.verification.cancel" || type === "m.key.verification.done") {
        const MKeyVerificationConclusion = sdk.getComponent("messages.MKeyVerificationConclusion");
        if (!MKeyVerificationConclusion.prototype._shouldRender.call(null, ev, ev.request)) {
            return;
        }
    }

    // TODO: Enable support for m.widget event type (https://github.com/vector-im/element-web/issues/13111)
    if (type === "im.vector.modular.widgets") {
        let type = ev.getContent()['type'];
        if (!type) {
            // deleted/invalid widget - try the past widget type
            type = ev.getPrevContent()['type'];
        }

        if (WidgetType.JITSI.matches(type)) {
            return "messages.MJitsiWidgetEvent";
        }
    }

    if (ev.isState()) {
        if (stateEventSingular.has(type) && ev.getStateKey() !== "") return undefined;
        return stateEventTileTypes[type];
    }

    return eventTileTypes[type];
}

const MAX_READ_AVATARS = 5;

// Our component structure for EventTiles on the timeline is:
//
// .-EventTile------------------------------------------------.
// | MemberAvatar (SenderProfile)                   TimeStamp |
// |    .-{Message,Textual}Event---------------. Read Avatars |
// |    |   .-MFooBody-------------------.     |              |
// |    |   |  (only if MessageEvent)    |     |              |
// |    |   '----------------------------'     |              |
// |    '--------------------------------------'              |
// '----------------------------------------------------------'

interface IReadReceiptProps {
    userId: string;
    roomMember: RoomMember;
    ts: number;
}

interface IProps {
    // the MatrixEvent to show
    mxEvent: MatrixEvent;

    // true if mxEvent is redacted. This is a prop because using mxEvent.isRedacted()
    // might not be enough when deciding shouldComponentUpdate - prevProps.mxEvent
    // references the same this.props.mxEvent.
    isRedacted?: boolean;

    // true if this is a continuation of the previous event (which has the
    // effect of not showing another avatar/displayname
    continuation?: boolean;

    // true if this is the last event in the timeline (which has the effect
    // of always showing the timestamp)
    last?: boolean;

    // true if the event is the last event in a section (adds a css class for
    // targeting)
    lastInSection?: boolean;

    // True if the event is the last successful (sent) event.
    lastSuccessful?: boolean;

    // true if this is search context (which has the effect of greying out
    // the text
    contextual?: boolean;

    // a list of words to highlight, ordered by longest first
    highlights?: string[];

    // link URL for the highlights
    highlightLink?: string;

    // should show URL previews for this event
    showUrlPreview?: boolean;

    // is this the focused event
    isSelectedEvent?: boolean;

    // callback called when dynamic content in events are loaded
    onHeightChanged?: () => void;

    // a list of read-receipts we should show. Each object has a 'roomMember' and 'ts'.
    readReceipts?: IReadReceiptProps[];

    // opaque readreceipt info for each userId; used by ReadReceiptMarker
    // to manage its animations. Should be an empty object when the room
    // first loads
    readReceiptMap?: any;

    // A function which is used to check if the parent panel is being
    // unmounted, to avoid unnecessary work. Should return true if we
    // are being unmounted.
    checkUnmounting?: () => boolean;

    // the status of this event - ie, mxEvent.status. Denormalised to here so
    // that we can tell when it changes.
    eventSendStatus?: string;

    // the shape of the tile. by default, the layout is intended for the
    // normal room timeline.  alternative values are: "file_list", "file_grid"
    // and "notif".  This could be done by CSS, but it'd be horribly inefficient.
    // It could also be done by subclassing EventTile, but that'd be quite
    // boiilerplatey.  So just make the necessary render decisions conditional
    // for now.
    tileShape?: 'notif' | 'file_grid' | 'reply' | 'reply_preview';

    // show twelve hour timestamps
    isTwelveHour?: boolean;

    // helper function to access relations for this event
    getRelationsForEvent?: (eventId: string, relationType: string, eventType: string) => Relations;

    // whether to show reactions for this event
    showReactions?: boolean;

    // which layout to use
    layout: Layout;

    // whether or not to show flair at all
    enableFlair?: boolean;

    // whether or not to show read receipts
    showReadReceipts?: boolean;

    // Used while editing, to pass the event, and to preserve editor state
    // from one editor instance to another when remounting the editor
    // upon receiving the remote echo for an unsent event.
    editState?: EditorStateTransfer;

    // Event ID of the event replacing the content of this event, if any
    replacingEventId?: string;

    // Helper to build permalinks for the room
    permalinkCreator?: RoomPermalinkCreator;
}

interface IState {
    // Whether the action bar is focused.
    actionBarFocused: boolean;
    // Whether all read receipts are being displayed. If not, only display
    // a truncation of them.
    allReadAvatars: boolean;
    // Whether the event's sender has been verified.
    verified: string;
    // Whether onRequestKeysClick has been called since mounting.
    previouslyRequestedKeys: boolean;
    // The Relations model from the JS SDK for reactions to `mxEvent`
    reactions: Relations;
}

@replaceableComponent("views.rooms.EventTile")
export default class EventTile extends React.Component<IProps, IState> {
    private suppressReadReceiptAnimation: boolean;
    private isListeningForReceipts: boolean;
    private tile = React.createRef();
    private replyThread = React.createRef();

    static defaultProps = {
        // no-op function because onHeightChanged is optional yet some sub-components assume its existence
        onHeightChanged: function() {},
    };

    static contextType = MatrixClientContext;

    constructor(props, context) {
        super(props, context);

        this.state = {
            // Whether the action bar is focused.
            actionBarFocused: false,
            // Whether all read receipts are being displayed. If not, only display
            // a truncation of them.
            allReadAvatars: false,
            // Whether the event's sender has been verified.
            verified: null,
            // Whether onRequestKeysClick has been called since mounting.
            previouslyRequestedKeys: false,
            // The Relations model from the JS SDK for reactions to `mxEvent`
            reactions: this.getReactions(),
        };

        // don't do RR animations until we are mounted
        this.suppressReadReceiptAnimation = true;

        // Throughout the component we manage a read receipt listener to see if our tile still
        // qualifies for a "sent" or "sending" state (based on their relevant conditions). We
        // don't want to over-subscribe to the read receipt events being fired, so we use a flag
        // to determine if we've already subscribed and use a combination of other flags to find
        // out if we should even be subscribed at all.
        this.isListeningForReceipts = false;
    }

    /**
     * When true, the tile qualifies for some sort of special read receipt. This could be a 'sending'
     * or 'sent' receipt, for example.
     * @returns {boolean}
     */
    private get isEligibleForSpecialReceipt() {
        // First, if there are other read receipts then just short-circuit this.
        if (this.props.readReceipts && this.props.readReceipts.length > 0) return false;
        if (!this.props.mxEvent) return false;

        // Sanity check (should never happen, but we shouldn't explode if it does)
        const room = this.context.getRoom(this.props.mxEvent.getRoomId());
        if (!room) return false;

        // Quickly check to see if the event was sent by us. If it wasn't, it won't qualify for
        // special read receipts.
        const myUserId = MatrixClientPeg.get().getUserId();
        if (this.props.mxEvent.getSender() !== myUserId) return false;

        // Finally, determine if the type is relevant to the user. This notably excludes state
        // events and pretty much anything that can't be sent by the composer as a message. For
        // those we rely on local echo giving the impression of things changing, and expect them
        // to be quick.
        const simpleSendableEvents = [
            EventType.Sticker,
            EventType.RoomMessage,
            EventType.RoomMessageEncrypted,
        ];
        if (!simpleSendableEvents.includes(this.props.mxEvent.getType())) return false;

        // Default case
        return true;
    }

    private get shouldShowSentReceipt() {
        // If we're not even eligible, don't show the receipt.
        if (!this.isEligibleForSpecialReceipt) return false;

        // We only show the 'sent' receipt on the last successful event.
        if (!this.props.lastSuccessful) return false;

        // Check to make sure the sending state is appropriate. A null/undefined send status means
        // that the message is 'sent', so we're just double checking that it's explicitly not sent.
        if (this.props.eventSendStatus && this.props.eventSendStatus !== 'sent') return false;

        // If anyone has read the event besides us, we don't want to show a sent receipt.
        const receipts = this.props.readReceipts || [];
        const myUserId = MatrixClientPeg.get().getUserId();
        if (receipts.some(r => r.userId !== myUserId)) return false;

        // Finally, we should show a receipt.
        return true;
    }

    private get shouldShowSendingReceipt() {
        // If we're not even eligible, don't show the receipt.
        if (!this.isEligibleForSpecialReceipt) return false;

        // Check the event send status to see if we are pending. Null/undefined status means the
        // message was sent, so check for that and 'sent' explicitly.
        if (!this.props.eventSendStatus || this.props.eventSendStatus === 'sent') return false;

        // Default to showing - there's no other event properties/behaviours we care about at
        // this point.
        return true;
    }

    // TODO: [REACT-WARNING] Move into constructor
    // eslint-disable-next-line camelcase
    UNSAFE_componentWillMount() {
        this.verifyEvent(this.props.mxEvent);
    }

    componentDidMount() {
        this.suppressReadReceiptAnimation = false;
        const client = this.context;
        client.on("deviceVerificationChanged", this.onDeviceVerificationChanged);
        client.on("userTrustStatusChanged", this.onUserVerificationChanged);
        this.props.mxEvent.on("Event.decrypted", this.onDecrypted);
        if (this.props.showReactions) {
            this.props.mxEvent.on("Event.relationsCreated", this.onReactionsCreated);
        }

        if (this.shouldShowSentReceipt || this.shouldShowSendingReceipt) {
            client.on("Room.receipt", this.onRoomReceipt);
            this.isListeningForReceipts = true;
        }
    }

    // TODO: [REACT-WARNING] Replace with appropriate lifecycle event
    // eslint-disable-next-line camelcase
    UNSAFE_componentWillReceiveProps(nextProps) {
        // re-check the sender verification as outgoing events progress through
        // the send process.
        if (nextProps.eventSendStatus !== this.props.eventSendStatus) {
            this.verifyEvent(nextProps.mxEvent);
        }
    }

    shouldComponentUpdate(nextProps, nextState) {
        if (objectHasDiff(this.state, nextState)) {
            return true;
        }

        return !this.propsEqual(this.props, nextProps);
    }

    componentWillUnmount() {
        const client = this.context;
        client.removeListener("deviceVerificationChanged", this.onDeviceVerificationChanged);
        client.removeListener("userTrustStatusChanged", this.onUserVerificationChanged);
        client.removeListener("Room.receipt", this.onRoomReceipt);
        this.isListeningForReceipts = false;
        this.props.mxEvent.removeListener("Event.decrypted", this.onDecrypted);
        if (this.props.showReactions) {
            this.props.mxEvent.removeListener("Event.relationsCreated", this.onReactionsCreated);
        }
    }

    componentDidUpdate(prevProps, prevState, snapshot) {
        // If we're not listening for receipts and expect to be, register a listener.
        if (!this.isListeningForReceipts && (this.shouldShowSentReceipt || this.shouldShowSendingReceipt)) {
            this.context.on("Room.receipt", this.onRoomReceipt);
            this.isListeningForReceipts = true;
        }
    }

    private onRoomReceipt = (ev, room) => {
        // ignore events for other rooms
        const tileRoom = MatrixClientPeg.get().getRoom(this.props.mxEvent.getRoomId());
        if (room !== tileRoom) return;

        if (!this.shouldShowSentReceipt && !this.shouldShowSendingReceipt && !this.isListeningForReceipts) {
            return;
        }

        // We force update because we have no state or prop changes to queue up, instead relying on
        // the getters we use here to determine what needs rendering.
        this.forceUpdate(() => {
            // Per elsewhere in this file, we can remove the listener once we will have no further purpose for it.
            if (!this.shouldShowSentReceipt && !this.shouldShowSendingReceipt) {
                this.context.removeListener("Room.receipt", this.onRoomReceipt);
                this.isListeningForReceipts = false;
            }
        });
    };

    /** called when the event is decrypted after we show it.
     */
    private onDecrypted = () => {
        // we need to re-verify the sending device.
        // (we call onHeightChanged in verifyEvent to handle the case where decryption
        // has caused a change in size of the event tile)
        this.verifyEvent(this.props.mxEvent);
        this.forceUpdate();
    };

    private onDeviceVerificationChanged = (userId, device) => {
        if (userId === this.props.mxEvent.getSender()) {
            this.verifyEvent(this.props.mxEvent);
        }
    };

    private onUserVerificationChanged = (userId, _trustStatus) => {
        if (userId === this.props.mxEvent.getSender()) {
            this.verifyEvent(this.props.mxEvent);
        }
    };

    private async verifyEvent(mxEvent) {
        if (!mxEvent.isEncrypted()) {
            return;
        }

        const encryptionInfo = this.context.getEventEncryptionInfo(mxEvent);
        const senderId = mxEvent.getSender();
        const userTrust = this.context.checkUserTrust(senderId);

        if (encryptionInfo.mismatchedSender) {
            // something definitely wrong is going on here
            this.setState({
                verified: E2E_STATE.WARNING,
            }, this.props.onHeightChanged); // Decryption may have caused a change in size
            return;
        }

        if (!userTrust.isCrossSigningVerified()) {
            // user is not verified, so default to everything is normal
            this.setState({
                verified: E2E_STATE.NORMAL,
            }, this.props.onHeightChanged); // Decryption may have caused a change in size
            return;
        }

        const eventSenderTrust = encryptionInfo.sender && this.context.checkDeviceTrust(
            senderId, encryptionInfo.sender.deviceId,
        );
        if (!eventSenderTrust) {
            this.setState({
                verified: E2E_STATE.UNKNOWN,
            }, this.props.onHeightChanged); // Decryption may have caused a change in size
            return;
        }

        if (!eventSenderTrust.isVerified()) {
            this.setState({
                verified: E2E_STATE.WARNING,
            }, this.props.onHeightChanged); // Decryption may have caused a change in size
            return;
        }

        if (!encryptionInfo.authenticated) {
            this.setState({
                verified: E2E_STATE.UNAUTHENTICATED,
            }, this.props.onHeightChanged); // Decryption may have caused a change in size
            return;
        }

        this.setState({
            verified: E2E_STATE.VERIFIED,
        }, this.props.onHeightChanged); // Decryption may have caused a change in size
    }

    private propsEqual(objA, objB) {
        const keysA = Object.keys(objA);
        const keysB = Object.keys(objB);

        if (keysA.length !== keysB.length) {
            return false;
        }

        for (let i = 0; i < keysA.length; i++) {
            const key = keysA[i];

            if (!objB.hasOwnProperty(key)) {
                return false;
            }

            // need to deep-compare readReceipts
            if (key === 'readReceipts') {
                const rA = objA[key];
                const rB = objB[key];
                if (rA === rB) {
                    continue;
                }

                if (!rA || !rB) {
                    return false;
                }

                if (rA.length !== rB.length) {
                    return false;
                }
                for (let j = 0; j < rA.length; j++) {
                    if (rA[j].userId !== rB[j].userId) {
                        return false;
                    }
                    // one has a member set and the other doesn't?
                    if (rA[j].roomMember !== rB[j].roomMember) {
                        return false;
                    }
                }
            } else {
                if (objA[key] !== objB[key]) {
                    return false;
                }
            }
        }
        return true;
    }

    shouldHighlight() {
        const actions = this.context.getPushActionsForEvent(this.props.mxEvent.replacingEvent() || this.props.mxEvent);
        if (!actions || !actions.tweaks) { return false; }

        // don't show self-highlights from another of our clients
        if (this.props.mxEvent.getSender() === this.context.credentials.userId) {
            return false;
        }

        return actions.tweaks.highlight;
    }

    toggleAllReadAvatars = () => {
        this.setState({
            allReadAvatars: !this.state.allReadAvatars,
        });
    };

    getReadAvatars() {
        if (this.shouldShowSentReceipt || this.shouldShowSendingReceipt) {
            return <SentReceipt messageState={this.props.mxEvent.getAssociatedStatus()} />;
        }

        // return early if there are no read receipts
        if (!this.props.readReceipts || this.props.readReceipts.length === 0) {
            return (<span className="mx_EventTile_readAvatars" />);
        }

        const ReadReceiptMarker = sdk.getComponent('rooms.ReadReceiptMarker');
        const avatars = [];
        const receiptOffset = 15;
        let left = 0;

        const receipts = this.props.readReceipts || [];
        for (let i = 0; i < receipts.length; ++i) {
            const receipt = receipts[i];

            let hidden = true;
            if ((i < MAX_READ_AVATARS) || this.state.allReadAvatars) {
                hidden = false;
            }
            // TODO: we keep the extra read avatars in the dom to make animation simpler
            // we could optimise this to reduce the dom size.

            // If hidden, set offset equal to the offset of the final visible avatar or
            // else set it proportional to index
            left = (hidden ? MAX_READ_AVATARS - 1 : i) * -receiptOffset;

            const userId = receipt.userId;
            let readReceiptInfo;

            if (this.props.readReceiptMap) {
                readReceiptInfo = this.props.readReceiptMap[userId];
                if (!readReceiptInfo) {
                    readReceiptInfo = {};
                    this.props.readReceiptMap[userId] = readReceiptInfo;
                }
            }

            // add to the start so the most recent is on the end (ie. ends up rightmost)
            avatars.unshift(
                <ReadReceiptMarker key={userId} member={receipt.roomMember}
                    fallbackUserId={userId}
                    leftOffset={left} hidden={hidden}
                    readReceiptInfo={readReceiptInfo}
                    checkUnmounting={this.props.checkUnmounting}
                    suppressAnimation={this.suppressReadReceiptAnimation}
                    onClick={this.toggleAllReadAvatars}
                    timestamp={receipt.ts}
                    showTwelveHour={this.props.isTwelveHour}
                />,
            );
        }
        let remText;
        if (!this.state.allReadAvatars) {
            const remainder = receipts.length - MAX_READ_AVATARS;
            if (remainder > 0) {
                remText = <span className="mx_EventTile_readAvatarRemainder"
                    onClick={this.toggleAllReadAvatars}
                    style={{ right: "calc(" + toRem(-left) + " + " + receiptOffset + "px)" }}>{ remainder }+
                </span>;
            }
        }

        return <span className="mx_EventTile_readAvatars">
            { remText }
            { avatars }
        </span>;
    }

    onSenderProfileClick = event => {
        const mxEvent = this.props.mxEvent;
        dis.dispatch({
            action: 'insert_mention',
            user_id: mxEvent.getSender(),
        });
    };

    onRequestKeysClick = () => {
        this.setState({
            // Indicate in the UI that the keys have been requested (this is expected to
            // be reset if the component is mounted in the future).
            previouslyRequestedKeys: true,
        });

        // Cancel any outgoing key request for this event and resend it. If a response
        // is received for the request with the required keys, the event could be
        // decrypted successfully.
        this.context.cancelAndResendEventRoomKeyRequest(this.props.mxEvent);
    };

    onPermalinkClicked = e => {
        // This allows the permalink to be opened in a new tab/window or copied as
        // matrix.to, but also for it to enable routing within Element when clicked.
        e.preventDefault();
        dis.dispatch({
            action: 'view_room',
            event_id: this.props.mxEvent.getId(),
            highlighted: true,
            room_id: this.props.mxEvent.getRoomId(),
        });
    };

    private renderE2EPadlock() {
        const ev = this.props.mxEvent;

        // event could not be decrypted
        if (ev.getContent().msgtype === 'm.bad.encrypted') {
            return <E2ePadlockUndecryptable />;
        }

        // event is encrypted, display padlock corresponding to whether or not it is verified
        if (ev.isEncrypted()) {
            if (this.state.verified === E2E_STATE.NORMAL) {
                return; // no icon if we've not even cross-signed the user
            } else if (this.state.verified === E2E_STATE.VERIFIED) {
                return; // no icon for verified
            } else if (this.state.verified === E2E_STATE.UNAUTHENTICATED) {
                return (<E2ePadlockUnauthenticated />);
            } else if (this.state.verified === E2E_STATE.UNKNOWN) {
                return (<E2ePadlockUnknown />);
            } else {
                return (<E2ePadlockUnverified />);
            }
        }

        if (this.context.isRoomEncrypted(ev.getRoomId())) {
            // else if room is encrypted
            // and event is being encrypted or is not_sent (Unknown Devices/Network Error)
            if (ev.status === EventStatus.ENCRYPTING) {
                return;
            }
            if (ev.status === EventStatus.NOT_SENT) {
                return;
            }
            if (ev.isState()) {
                return; // we expect this to be unencrypted
            }
            // if the event is not encrypted, but it's an e2e room, show the open padlock
            return <E2ePadlockUnencrypted />;
        }

        // no padlock needed
        return null;
    }

    onActionBarFocusChange = focused => {
        this.setState({
            actionBarFocused: focused,
        });
    };

    getTile = () => this.tile.current;

    getReplyThread = () => this.replyThread.current;

    getReactions = () => {
        if (
            !this.props.showReactions ||
            !this.props.getRelationsForEvent
        ) {
            return null;
        }
        const eventId = this.props.mxEvent.getId();
        if (!eventId) {
            // XXX: Temporary diagnostic logging for https://github.com/vector-im/element-web/issues/11120
            console.error("EventTile attempted to get relations for an event without an ID");
            // Use event's special `toJSON` method to log key data.
            console.log(JSON.stringify(this.props.mxEvent, null, 4));
            console.trace("Stacktrace for https://github.com/vector-im/element-web/issues/11120");
        }
        return this.props.getRelationsForEvent(eventId, "m.annotation", "m.reaction");
    };

    private onReactionsCreated = (relationType, eventType) => {
        if (relationType !== "m.annotation" || eventType !== "m.reaction") {
            return;
        }
        this.props.mxEvent.removeListener("Event.relationsCreated", this.onReactionsCreated);
        this.setState({
            reactions: this.getReactions(),
        });
    };

    render() {
        const MessageTimestamp = sdk.getComponent('messages.MessageTimestamp');
        const SenderProfile = sdk.getComponent('messages.SenderProfile');
        const MemberAvatar = sdk.getComponent('avatars.MemberAvatar');

        //console.info("EventTile showUrlPreview for %s is %s", this.props.mxEvent.getId(), this.props.showUrlPreview);

        const content = this.props.mxEvent.getContent();
        const msgtype = content.msgtype;
        const eventType = this.props.mxEvent.getType();

        let tileHandler = getHandlerTile(this.props.mxEvent);

        // Info messages are basically information about commands processed on a room
        const isBubbleMessage = eventType.startsWith("m.key.verification") ||
            (eventType === EventType.RoomMessage && msgtype && msgtype.startsWith("m.key.verification")) ||
            (eventType === EventType.RoomCreate) ||
            (eventType === EventType.RoomEncryption) ||
            (tileHandler === "messages.MJitsiWidgetEvent");
        let isInfoMessage = (
            !isBubbleMessage && eventType !== EventType.RoomMessage &&
            eventType !== EventType.Sticker && eventType !== EventType.RoomCreate
        );

        // If we're showing hidden events in the timeline, we should use the
        // source tile when there's no regular tile for an event and also for
        // replace relations (which otherwise would display as a confusing
        // duplicate of the thing they are replacing).
        if (SettingsStore.getValue("showHiddenEventsInTimeline") && !haveTileForEvent(this.props.mxEvent)) {
            tileHandler = "messages.ViewSourceEvent";
            // Reuse info message avatar and sender profile styling
            isInfoMessage = true;
        }
        // This shouldn't happen: the caller should check we support this type
        // before trying to instantiate us
        if (!tileHandler) {
            const {mxEvent} = this.props;
            console.warn(`Event type not supported: type:${mxEvent.getType()} isState:${mxEvent.isState()}`);
            return <div className="mx_EventTile mx_EventTile_info mx_MNoticeBody">
                <div className="mx_EventTile_line">
                    { _t('This event could not be displayed') }
                </div>
            </div>;
        }
        const EventTileType = sdk.getComponent(tileHandler);

        const isSending = (['sending', 'queued', 'encrypting'].indexOf(this.props.eventSendStatus) !== -1);
        const isRedacted = isMessageEvent(this.props.mxEvent) && this.props.isRedacted;
        const isEncryptionFailure = this.props.mxEvent.isDecryptionFailure();

        const isEditing = !!this.props.editState;
        const classes = classNames({
            mx_EventTile_bubbleContainer: isBubbleMessage,
            mx_EventTile: true,
            mx_EventTile_isEditing: isEditing,
            mx_EventTile_info: isInfoMessage,
            mx_EventTile_12hr: this.props.isTwelveHour,
            // Note: we keep the `sending` state class for tests, not for our styles
            mx_EventTile_sending: !isEditing && isSending,
            mx_EventTile_highlight: this.props.tileShape === 'notif' ? false : this.shouldHighlight(),
            mx_EventTile_selected: this.props.isSelectedEvent,
            mx_EventTile_continuation: this.props.tileShape ? '' : this.props.continuation,
            mx_EventTile_last: this.props.last,
            mx_EventTile_lastInSection: this.props.lastInSection,
            mx_EventTile_contextual: this.props.contextual,
            mx_EventTile_actionBarFocused: this.state.actionBarFocused,
            mx_EventTile_verified: !isBubbleMessage && this.state.verified === E2E_STATE.VERIFIED,
            mx_EventTile_unverified: !isBubbleMessage && this.state.verified === E2E_STATE.WARNING,
            mx_EventTile_unknown: !isBubbleMessage && this.state.verified === E2E_STATE.UNKNOWN,
            mx_EventTile_bad: isEncryptionFailure,
            mx_EventTile_emote: msgtype === 'm.emote',
        });

        // If the tile is in the Sending state, don't speak the message.
        const ariaLive = (this.props.eventSendStatus !== null) ? 'off' : undefined;

        let permalink = "#";
        if (this.props.permalinkCreator) {
            permalink = this.props.permalinkCreator.forEvent(this.props.mxEvent.getId());
        }

        let avatar;
        let sender;
        let avatarSize;
        let needsSenderProfile;

        if (this.props.tileShape === "notif") {
            avatarSize = 24;
            needsSenderProfile = true;
        } else if (tileHandler === 'messages.RoomCreate' || isBubbleMessage) {
            avatarSize = 0;
            needsSenderProfile = false;
        } else if (isInfoMessage) {
            // a small avatar, with no sender profile, for
            // joins/parts/etc
            avatarSize = 14;
            needsSenderProfile = false;
        } else if (this.props.layout == Layout.IRC) {
            avatarSize = 14;
            needsSenderProfile = true;
        } else if (this.props.continuation && this.props.tileShape !== "file_grid") {
            // no avatar or sender profile for continuation messages
            avatarSize = 0;
            needsSenderProfile = false;
        } else {
            avatarSize = 30;
            needsSenderProfile = true;
        }

        if (this.props.mxEvent.sender && avatarSize) {
            let member;
            // set member to receiver (target) if it is a 3PID invite
            // so that the correct avatar is shown as the text is
            // `$target accepted the invitation for $email`
            if (this.props.mxEvent.getContent().third_party_invite) {
                member = this.props.mxEvent.target;
            } else {
                member = this.props.mxEvent.sender;
            }
            avatar = (
                <div className="mx_EventTile_avatar">
                    <MemberAvatar member={member}
                        width={avatarSize} height={avatarSize}
                        viewUserOnClick={true}
                    />
                </div>
            );
        }

        if (needsSenderProfile) {
            if (!this.props.tileShape || this.props.tileShape === 'reply' || this.props.tileShape === 'reply_preview') {
                sender = <SenderProfile onClick={this.onSenderProfileClick}
                    mxEvent={this.props.mxEvent}
                    enableFlair={this.props.enableFlair}
                />;
            } else {
                sender = <SenderProfile mxEvent={this.props.mxEvent} enableFlair={this.props.enableFlair} />;
            }
        }

        const MessageActionBar = sdk.getComponent('messages.MessageActionBar');
        const actionBar = !isEditing ? <MessageActionBar
            mxEvent={this.props.mxEvent}
            reactions={this.state.reactions}
            permalinkCreator={this.props.permalinkCreator}
            getTile={this.getTile}
            getReplyThread={this.getReplyThread}
            onFocusChange={this.onActionBarFocusChange}
        /> : undefined;

        const timestamp = this.props.mxEvent.getTs() ?
            <MessageTimestamp showTwelveHour={this.props.isTwelveHour} ts={this.props.mxEvent.getTs()} /> : null;

        const keyRequestHelpText =
            <div className="mx_EventTile_keyRequestInfo_tooltip_contents">
                <p>
                    { this.state.previouslyRequestedKeys ?
                        _t( 'Your key share request has been sent - please check your other sessions ' +
                            'for key share requests.') :
                        _t( 'Key share requests are sent to your other sessions automatically. If you ' +
                            'rejected or dismissed the key share request on your other sessions, click ' +
                            'here to request the keys for this session again.')
                    }
                </p>
                <p>
                    { _t( 'If your other sessions do not have the key for this message you will not ' +
                            'be able to decrypt them.')
                    }
                </p>
            </div>;
        const keyRequestInfoContent = this.state.previouslyRequestedKeys ?
            _t('Key request sent.') :
            _t(
                '<requestLink>Re-request encryption keys</requestLink> from your other sessions.',
                {},
                {'requestLink': (sub) => <a onClick={this.onRequestKeysClick}>{ sub }</a>},
            );

        const TooltipButton = sdk.getComponent('elements.TooltipButton');
        const keyRequestInfo = isEncryptionFailure && !isRedacted ?
            <div className="mx_EventTile_keyRequestInfo">
                <span className="mx_EventTile_keyRequestInfo_text">
                    { keyRequestInfoContent }
                </span>
                <TooltipButton helpText={keyRequestHelpText} />
            </div> : null;

        let reactionsRow;
        if (!isRedacted) {
            const ReactionsRow = sdk.getComponent('messages.ReactionsRow');
            reactionsRow = <ReactionsRow
                mxEvent={this.props.mxEvent}
                reactions={this.state.reactions}
            />;
        }

        const linkedTimestamp = <a
            href={permalink}
            onClick={this.onPermalinkClicked}
            aria-label={formatTime(new Date(this.props.mxEvent.getTs()), this.props.isTwelveHour)}
        >
            { timestamp }
        </a>;

        const useIRCLayout = this.props.layout == Layout.IRC;
        const groupTimestamp = !useIRCLayout ? linkedTimestamp : null;
        const ircTimestamp = useIRCLayout ? linkedTimestamp : null;
        const groupPadlock = !useIRCLayout && !isBubbleMessage && this.renderE2EPadlock();
        const ircPadlock = useIRCLayout && !isBubbleMessage && this.renderE2EPadlock();

        let msgOption;
        if (this.props.showReadReceipts) {
            const readAvatars = this.getReadAvatars();
            msgOption = (
                <div className="mx_EventTile_msgOption">
                    { readAvatars }
                </div>
            );
        }

        switch (this.props.tileShape) {
            case 'notif': {
                const room = this.context.getRoom(this.props.mxEvent.getRoomId());
                return (
                    <div className={classes} aria-live={ariaLive} aria-atomic="true">
                        <div className="mx_EventTile_roomName">
                            <RoomAvatar room={room} width={28} height={28} />
                            <a href={permalink} onClick={this.onPermalinkClicked}>
                                { room ? room.name : '' }
                            </a>
                        </div>
                        <div className="mx_EventTile_senderDetails">
                            { avatar }
                            <a href={permalink} onClick={this.onPermalinkClicked}>
                                { sender }
                                { timestamp }
                            </a>
                        </div>
                        <div className="mx_EventTile_line">
                            <EventTileType ref={this.tile}
                                mxEvent={this.props.mxEvent}
                                highlights={this.props.highlights}
                                highlightLink={this.props.highlightLink}
                                showUrlPreview={this.props.showUrlPreview}
                                onHeightChanged={this.props.onHeightChanged}
                            />
                        </div>
                    </div>
                );
            }
            case 'file_grid': {
                return (
                    <div className={classes} aria-live={ariaLive} aria-atomic="true">
                        <div className="mx_EventTile_line">
                            <EventTileType ref={this.tile}
                                mxEvent={this.props.mxEvent}
                                highlights={this.props.highlights}
                                highlightLink={this.props.highlightLink}
                                showUrlPreview={this.props.showUrlPreview}
                                tileShape={this.props.tileShape}
                                onHeightChanged={this.props.onHeightChanged}
                            />
                        </div>
                        <a
                            className="mx_EventTile_senderDetailsLink"
                            href={permalink}
                            onClick={this.onPermalinkClicked}
                        >
                            <div className="mx_EventTile_senderDetails">
                                { sender }
                                { timestamp }
                            </div>
                        </a>
                    </div>
                );
            }

            case 'reply':
            case 'reply_preview': {
                let thread;
                if (this.props.tileShape === 'reply_preview') {
                    thread = ReplyThread.makeThread(
                        this.props.mxEvent,
                        this.props.onHeightChanged,
                        this.props.permalinkCreator,
                        this.replyThread,
                    );
                }
                return (
                    <div className={classes} aria-live={ariaLive} aria-atomic="true">
                        { ircTimestamp }
                        { avatar }
                        { sender }
                        { ircPadlock }
                        <div className="mx_EventTile_reply">
                            { groupTimestamp }
                            { groupPadlock }
                            { thread }
                            <EventTileType ref={this.tile}
                                mxEvent={this.props.mxEvent}
                                highlights={this.props.highlights}
                                highlightLink={this.props.highlightLink}
                                onHeightChanged={this.props.onHeightChanged}
                                replacingEventId={this.props.replacingEventId}
                                showUrlPreview={false}
                            />
                        </div>
                    </div>
                );
            }
            default: {
                const thread = ReplyThread.makeThread(
                    this.props.mxEvent,
                    this.props.onHeightChanged,
                    this.props.permalinkCreator,
                    this.replyThread,
                    this.props.layout,
                );

                // tab-index=-1 to allow it to be focusable but do not add tab stop for it, primarily for screen readers
                return (
                    <div className={classes} tabIndex={-1} aria-live={ariaLive} aria-atomic="true">
                        { ircTimestamp }
                        { sender }
                        { ircPadlock }
                        <div className="mx_EventTile_line">
                            { groupTimestamp }
                            { groupPadlock }
                            { thread }
                            <EventTileType ref={this.tile}
                                mxEvent={this.props.mxEvent}
                                replacingEventId={this.props.replacingEventId}
                                editState={this.props.editState}
                                highlights={this.props.highlights}
                                highlightLink={this.props.highlightLink}
                                showUrlPreview={this.props.showUrlPreview}
                                permalinkCreator={this.props.permalinkCreator}
                                onHeightChanged={this.props.onHeightChanged}
                            />
                            { keyRequestInfo }
                            { reactionsRow }
                            { actionBar }
                        </div>
                        {msgOption}
                        {
                            // The avatar goes after the event tile as it's absolutely positioned to be over the
                            // event tile line, so needs to be later in the DOM so it appears on top (this avoids
                            // the need for further z-indexing chaos)
                        }
                        { avatar }
                    </div>
                );
            }
        }
    }
}

// XXX this'll eventually be dynamic based on the fields once we have extensible event types
const messageTypes = ['m.room.message', 'm.sticker'];
function isMessageEvent(ev) {
    return (messageTypes.includes(ev.getType()));
}

export function haveTileForEvent(e) {
    // Only messages have a tile (black-rectangle) if redacted
    if (e.isRedacted() && !isMessageEvent(e)) return false;

    // No tile for replacement events since they update the original tile
    if (e.isRelation("m.replace")) return false;

    const handler = getHandlerTile(e);
    if (handler === undefined) return false;
    if (handler === 'messages.TextualEvent') {
        return TextForEvent.textForEvent(e) !== '';
    } else if (handler === 'messages.RoomCreate') {
        return Boolean(e.getContent()['predecessor']);
    } else {
        return true;
    }
}

function E2ePadlockUndecryptable(props) {
    return (
        <E2ePadlock title={_t("This message cannot be decrypted")} icon="undecryptable" {...props} />
    );
}

function E2ePadlockUnverified(props) {
    return (
        <E2ePadlock title={_t("Encrypted by an unverified session")} icon="unverified" {...props} />
    );
}

function E2ePadlockUnencrypted(props) {
    return (
        <E2ePadlock title={_t("Unencrypted")} icon="unencrypted" {...props} />
    );
}

function E2ePadlockUnknown(props) {
    return (
        <E2ePadlock title={_t("Encrypted by a deleted session")} icon="unknown" {...props} />
    );
}

function E2ePadlockUnauthenticated(props) {
    return (
        <E2ePadlock
            title={_t("The authenticity of this encrypted message can't be guaranteed on this device.")}
            icon="unauthenticated"
            {...props}
        />
    );
}

interface IE2ePadlockProps {
    icon: string;
    title: string;
}

interface IE2ePadlockState {
    hover: boolean;
}

class E2ePadlock extends React.Component<IE2ePadlockProps, IE2ePadlockState> {
    constructor(props) {
        super(props);

        this.state = {
            hover: false,
        };
    }

    onHoverStart = () => {
        this.setState({hover: true});
    };

    onHoverEnd = () => {
        this.setState({hover: false});
    };

    render() {
        let tooltip = null;
        if (this.state.hover) {
            tooltip = <Tooltip className="mx_EventTile_e2eIcon_tooltip" label={this.props.title} />;
        }

        const classes = `mx_EventTile_e2eIcon mx_EventTile_e2eIcon_${this.props.icon}`;
        return (
            <div
                className={classes}
                onMouseEnter={this.onHoverStart}
                onMouseLeave={this.onHoverEnd}
            >{tooltip}</div>
        );
    }
}

interface ISentReceiptProps {
    messageState: string; // TODO: Types for message sending state
}

interface ISentReceiptState {
    hover: boolean;
}

class SentReceipt extends React.PureComponent<ISentReceiptProps, ISentReceiptState> {
    constructor(props) {
        super(props);

        this.state = {
            hover: false,
        };
    }

    onHoverStart = () => {
        this.setState({hover: true});
    };

    onHoverEnd = () => {
        this.setState({hover: false});
    };

    render() {
        const isSent = !this.props.messageState || this.props.messageState === 'sent';
        const isFailed = this.props.messageState === 'not_sent';
        const receiptClasses = classNames({
            'mx_EventTile_receiptSent': isSent,
            'mx_EventTile_receiptSending': !isSent && !isFailed,
        });

        let nonCssBadge = null;
        if (isFailed) {
            nonCssBadge = <NotificationBadge
                notification={StaticNotificationState.RED_EXCLAMATION}
            />;
        }

        let tooltip = null;
        if (this.state.hover) {
            let label = _t("Sending your message...");
            if (this.props.messageState === 'encrypting') {
                label = _t("Encrypting your message...");
            } else if (isSent) {
                label = _t("Your message was sent");
            } else if (isFailed) {
                label = _t("Failed to send");
            }
            // The yOffset is somewhat arbitrary - it just brings the tooltip down to be more associated
            // with the read receipt.
            tooltip = <Tooltip className="mx_EventTile_readAvatars_receiptTooltip" label={label} yOffset={20} />;
        }

        return <span className="mx_EventTile_readAvatars">
            <span className={receiptClasses} onMouseEnter={this.onHoverStart} onMouseLeave={this.onHoverEnd}>
                {nonCssBadge}
                {tooltip}
            </span>
        </span>;
    }
}
