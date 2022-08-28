/*
Copyright 2015 - 2022 The Matrix.org Foundation C.I.C.
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

import React, { createRef, forwardRef, MouseEvent, RefObject } from 'react';
import classNames from "classnames";
import { EventType, MsgType } from "matrix-js-sdk/src/@types/event";
import { EventStatus, MatrixEvent, MatrixEventEvent } from "matrix-js-sdk/src/models/event";
import { Relations } from "matrix-js-sdk/src/models/relations";
import { RoomMember } from "matrix-js-sdk/src/models/room-member";
import { Thread, ThreadEvent } from 'matrix-js-sdk/src/models/thread';
import { logger } from "matrix-js-sdk/src/logger";
import { NotificationCountType, Room, RoomEvent } from 'matrix-js-sdk/src/models/room';
import { CallErrorCode } from "matrix-js-sdk/src/webrtc/call";
import { CryptoEvent } from "matrix-js-sdk/src/crypto";
import { UserTrustLevel } from 'matrix-js-sdk/src/crypto/CrossSigning';

import { Icon as LinkIcon } from '../../../../res/img/element-icons/link.svg';
import { Icon as ViewInRoomIcon } from '../../../../res/img/element-icons/view-in-room.svg';
import ReplyChain from "../elements/ReplyChain";
import { _t } from '../../../languageHandler';
import dis from '../../../dispatcher/dispatcher';
import { Layout } from "../../../settings/enums/Layout";
import { formatTime } from "../../../DateUtils";
import { MatrixClientPeg } from '../../../MatrixClientPeg';
import MatrixClientContext from "../../../contexts/MatrixClientContext";
import { E2EState } from "./E2EIcon";
import RoomAvatar from "../avatars/RoomAvatar";
import MessageContextMenu from "../context_menus/MessageContextMenu";
import { aboveRightOf } from '../../structures/ContextMenu';
import { objectHasDiff } from "../../../utils/objects";
import Tooltip, { Alignment } from "../elements/Tooltip";
import EditorStateTransfer from "../../../utils/EditorStateTransfer";
import { RoomPermalinkCreator } from '../../../utils/permalinks/Permalinks';
import { StaticNotificationState } from "../../../stores/notifications/StaticNotificationState";
import NotificationBadge from "./NotificationBadge";
import CallEventGrouper from "../../structures/CallEventGrouper";
import { ComposerInsertPayload } from "../../../dispatcher/payloads/ComposerInsertPayload";
import { Action } from '../../../dispatcher/actions';
import PlatformPeg from '../../../PlatformPeg';
import MemberAvatar from '../avatars/MemberAvatar';
import SenderProfile from '../messages/SenderProfile';
import MessageTimestamp from '../messages/MessageTimestamp';
import TooltipButton from '../elements/TooltipButton';
import { IReadReceiptInfo } from "./ReadReceiptMarker";
import MessageActionBar from "../messages/MessageActionBar";
import ReactionsRow from '../messages/ReactionsRow';
import { getEventDisplayInfo } from '../../../utils/EventRenderingUtils';
import SettingsStore from "../../../settings/SettingsStore";
import { MessagePreviewStore } from '../../../stores/room-list/MessagePreviewStore';
import RoomContext, { TimelineRenderingType } from "../../../contexts/RoomContext";
import { MediaEventHelper } from "../../../utils/MediaEventHelper";
import Toolbar from '../../../accessibility/Toolbar';
import { RovingAccessibleTooltipButton } from '../../../accessibility/roving/RovingAccessibleTooltipButton';
import { ThreadNotificationState } from '../../../stores/notifications/ThreadNotificationState';
import { RoomNotificationStateStore } from '../../../stores/notifications/RoomNotificationStateStore';
import { NotificationStateEvents } from '../../../stores/notifications/NotificationState';
import { NotificationColor } from '../../../stores/notifications/NotificationColor';
import AccessibleButton, { ButtonEvent } from '../elements/AccessibleButton';
import { copyPlaintext, getSelectedText } from '../../../utils/strings';
import { DecryptionFailureTracker } from '../../../DecryptionFailureTracker';
import RedactedBody from '../messages/RedactedBody';
import { ViewRoomPayload } from "../../../dispatcher/payloads/ViewRoomPayload";
import { shouldDisplayReply } from '../../../utils/Reply';
import PosthogTrackers from "../../../PosthogTrackers";
import TileErrorBoundary from '../messages/TileErrorBoundary';
import { haveRendererForEvent, isMessageEvent, renderTile } from "../../../events/EventTileFactory";
import ThreadSummary, { ThreadMessagePreview } from "./ThreadSummary";
import { ReadReceiptGroup } from './ReadReceiptGroup';
import { useTooltip } from "../../../utils/useTooltip";
import { ShowThreadPayload } from "../../../dispatcher/payloads/ShowThreadPayload";
import { isLocalRoom } from '../../../utils/localRoom/isLocalRoom';

export type GetRelationsForEvent = (eventId: string, relationType: string, eventType: string) => Relations;

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

export interface IReadReceiptProps {
    userId: string;
    roomMember: RoomMember | null;
    ts: number;
}

export interface IEventTileOps {
    isWidgetHidden(): boolean;
    unhideWidget(): void;
}

export interface IEventTileType extends React.Component {
    getEventTileOps?(): IEventTileOps;
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
    readReceiptMap?: { [userId: string]: IReadReceiptInfo };

    // A function which is used to check if the parent panel is being
    // unmounted, to avoid unnecessary work. Should return true if we
    // are being unmounted.
    checkUnmounting?: () => boolean;

    // the status of this event - ie, mxEvent.status. Denormalised to here so
    // that we can tell when it changes.
    eventSendStatus?: string;

    forExport?: boolean;

    // show twelve hour timestamps
    isTwelveHour?: boolean;

    // helper function to access relations for this event
    getRelationsForEvent?: GetRelationsForEvent;

    // whether to show reactions for this event
    showReactions?: boolean;

    // which layout to use
    layout?: Layout;

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

    // CallEventGrouper for this event
    callEventGrouper?: CallEventGrouper;

    // Symbol of the root node
    as?: string;

    // whether or not to always show timestamps
    alwaysShowTimestamps?: boolean;

    // whether or not to display the sender
    hideSender?: boolean;

    // whether or not to display thread info
    showThreadInfo?: boolean;

    // if specified and `true`, the message is being
    // hidden for moderation from other users but is
    // displayed to the current user either because they're
    // the author or they are a moderator
    isSeeingThroughMessageHiddenForModeration?: boolean;
}

interface IState {
    // Whether the action bar is focused.
    actionBarFocused: boolean;
    // Whether the event's sender has been verified.
    verified: string;
    // Whether onRequestKeysClick has been called since mounting.
    previouslyRequestedKeys: boolean;
    // The Relations model from the JS SDK for reactions to `mxEvent`
    reactions: Relations;

    hover: boolean;

    // Position of the context menu
    contextMenu?: {
        position: Pick<DOMRect, "top" | "left" | "bottom">;
        link?: string;
    };

    isQuoteExpanded?: boolean;

    thread: Thread;
    threadNotification?: NotificationCountType;
}

// MUST be rendered within a RoomContext with a set timelineRenderingType
export class UnwrappedEventTile extends React.Component<IProps, IState> {
    private suppressReadReceiptAnimation: boolean;
    private isListeningForReceipts: boolean;
    private tile = React.createRef<IEventTileType>();
    private replyChain = React.createRef<ReplyChain>();
    private threadState: ThreadNotificationState;

    public readonly ref = createRef<HTMLElement>();

    static defaultProps = {
        // no-op function because onHeightChanged is optional yet some sub-components assume its existence
        onHeightChanged: function() {},
        forExport: false,
        layout: Layout.Group,
    };

    static contextType = RoomContext;
    public context!: React.ContextType<typeof RoomContext>;

    constructor(props: IProps, context: React.ContextType<typeof MatrixClientContext>) {
        super(props, context);

        const thread = this.thread;

        this.state = {
            // Whether the action bar is focused.
            actionBarFocused: false,
            // Whether the event's sender has been verified.
            verified: null,
            // Whether onRequestKeysClick has been called since mounting.
            previouslyRequestedKeys: false,
            // The Relations model from the JS SDK for reactions to `mxEvent`
            reactions: this.getReactions(),
            // Context menu position
            contextMenu: null,

            hover: false,

            thread,
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
    private get isEligibleForSpecialReceipt(): boolean {
        // First, if there are other read receipts then just short-circuit this.
        if (this.props.readReceipts && this.props.readReceipts.length > 0) return false;
        if (!this.props.mxEvent) return false;

        // Sanity check (should never happen, but we shouldn't explode if it does)
        const room = MatrixClientPeg.get().getRoom(this.props.mxEvent.getRoomId());
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
        if (!simpleSendableEvents.includes(this.props.mxEvent.getType() as EventType)) return false;

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
        if (this.props.eventSendStatus && this.props.eventSendStatus !== EventStatus.SENT) return false;

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
        if (!this.props.eventSendStatus || this.props.eventSendStatus === EventStatus.SENT) return false;

        // Default to showing - there's no other event properties/behaviours we care about at
        // this point.
        return true;
    }

    // TODO: [REACT-WARNING] Move into constructor
    // eslint-disable-next-line
    UNSAFE_componentWillMount() {
        this.verifyEvent(this.props.mxEvent);
    }

    componentDidMount() {
        this.suppressReadReceiptAnimation = false;
        const client = MatrixClientPeg.get();
        if (!this.props.forExport) {
            client.on(CryptoEvent.DeviceVerificationChanged, this.onDeviceVerificationChanged);
            client.on(CryptoEvent.UserTrustStatusChanged, this.onUserVerificationChanged);
            this.props.mxEvent.on(MatrixEventEvent.Decrypted, this.onDecrypted);
            DecryptionFailureTracker.instance.addVisibleEvent(this.props.mxEvent);
            if (this.props.showReactions) {
                this.props.mxEvent.on(MatrixEventEvent.RelationsCreated, this.onReactionsCreated);
            }

            if (this.shouldShowSentReceipt || this.shouldShowSendingReceipt) {
                client.on(RoomEvent.Receipt, this.onRoomReceipt);
                this.isListeningForReceipts = true;
            }
        }

        if (SettingsStore.getValue("feature_thread")) {
            this.props.mxEvent.on(ThreadEvent.Update, this.updateThread);

            if (this.thread) {
                this.setupNotificationListener(this.thread);
            }
        }

        client.decryptEventIfNeeded(this.props.mxEvent);

        const room = client.getRoom(this.props.mxEvent.getRoomId());
        room?.on(ThreadEvent.New, this.onNewThread);
    }

    private setupNotificationListener(thread: Thread): void {
        const notifications = RoomNotificationStateStore.instance.getThreadsRoomState(thread.room);

        this.threadState = notifications.getThreadRoomState(thread);

        this.threadState.on(NotificationStateEvents.Update, this.onThreadStateUpdate);
        this.onThreadStateUpdate();
    }

    private onThreadStateUpdate = (): void => {
        let threadNotification = null;
        switch (this.threadState?.color) {
            case NotificationColor.Grey:
                threadNotification = NotificationCountType.Total;
                break;
            case NotificationColor.Red:
                threadNotification = NotificationCountType.Highlight;
                break;
        }

        this.setState({
            threadNotification,
        });
    };

    private updateThread = (thread: Thread) => {
        if (thread !== this.state.thread) {
            if (this.threadState) {
                this.threadState.off(NotificationStateEvents.Update, this.onThreadStateUpdate);
            }

            this.setupNotificationListener(thread);
        }

        this.setState({ thread });
    };

    // TODO: [REACT-WARNING] Replace with appropriate lifecycle event
    // eslint-disable-next-line
    UNSAFE_componentWillReceiveProps(nextProps: IProps) {
        // re-check the sender verification as outgoing events progress through
        // the send process.
        if (nextProps.eventSendStatus !== this.props.eventSendStatus) {
            this.verifyEvent(nextProps.mxEvent);
        }
    }

    shouldComponentUpdate(nextProps: IProps, nextState: IState): boolean {
        if (objectHasDiff(this.state, nextState)) {
            return true;
        }

        return !this.propsEqual(this.props, nextProps);
    }

    componentWillUnmount() {
        const client = MatrixClientPeg.get();
        client.removeListener(CryptoEvent.DeviceVerificationChanged, this.onDeviceVerificationChanged);
        client.removeListener(CryptoEvent.UserTrustStatusChanged, this.onUserVerificationChanged);
        client.removeListener(RoomEvent.Receipt, this.onRoomReceipt);
        this.isListeningForReceipts = false;
        this.props.mxEvent.removeListener(MatrixEventEvent.Decrypted, this.onDecrypted);
        if (this.props.showReactions) {
            this.props.mxEvent.removeListener(MatrixEventEvent.RelationsCreated, this.onReactionsCreated);
        }
        if (SettingsStore.getValue("feature_thread")) {
            this.props.mxEvent.off(ThreadEvent.Update, this.updateThread);
        }

        const room = MatrixClientPeg.get().getRoom(this.props.mxEvent.getRoomId());
        room?.off(ThreadEvent.New, this.onNewThread);
        if (this.threadState) {
            this.threadState.off(NotificationStateEvents.Update, this.onThreadStateUpdate);
        }
    }

    componentDidUpdate(prevProps: IProps, prevState: IState, snapshot) {
        // If we're not listening for receipts and expect to be, register a listener.
        if (!this.isListeningForReceipts && (this.shouldShowSentReceipt || this.shouldShowSendingReceipt)) {
            MatrixClientPeg.get().on(RoomEvent.Receipt, this.onRoomReceipt);
            this.isListeningForReceipts = true;
        }
    }

    private onNewThread = (thread: Thread) => {
        if (thread.id === this.props.mxEvent.getId()) {
            this.updateThread(thread);
            const room = MatrixClientPeg.get().getRoom(this.props.mxEvent.getRoomId());
            room.off(ThreadEvent.New, this.onNewThread);
        }
    };

    private get thread(): Thread | null {
        if (!SettingsStore.getValue("feature_thread")) {
            return null;
        }

        let thread = this.props.mxEvent.getThread();
        /**
         * Accessing the threads value through the room due to a race condition
         * that will be solved when there are proper backend support for threads
         * We currently have no reliable way to discover than an event is a thread
         * when we are at the sync stage
         */
        if (!thread) {
            const room = MatrixClientPeg.get().getRoom(this.props.mxEvent.getRoomId());
            thread = room?.findThreadForEvent(this.props.mxEvent);
        }
        return thread ?? null;
    }

    private renderThreadPanelSummary(): JSX.Element | null {
        if (!this.state.thread) {
            return null;
        }

        return <div className="mx_ThreadPanel_replies">
            <span className="mx_ThreadPanel_replies_amount">
                { this.state.thread.length }
            </span>
            <ThreadMessagePreview thread={this.state.thread} />
        </div>;
    }

    private renderThreadInfo(): React.ReactNode {
        if (this.state.thread?.id === this.props.mxEvent.getId()) {
            return <ThreadSummary mxEvent={this.props.mxEvent} thread={this.state.thread} />;
        }

        if (this.context.timelineRenderingType === TimelineRenderingType.Search && this.props.mxEvent.threadRootId) {
            if (this.props.highlightLink) {
                return (
                    <a className="mx_ThreadSummary_icon" href={this.props.highlightLink}>
                        { _t("From a thread") }
                    </a>
                );
            }

            return (
                <p className="mx_ThreadSummary_icon">{ _t("From a thread") }</p>
            );
        }
    }

    private viewInRoom = (evt: ButtonEvent): void => {
        evt.preventDefault();
        evt.stopPropagation();
        dis.dispatch<ViewRoomPayload>({
            action: Action.ViewRoom,
            event_id: this.props.mxEvent.getId(),
            highlighted: true,
            room_id: this.props.mxEvent.getRoomId(),
            metricsTrigger: undefined, // room doesn't change
        });
    };

    private copyLinkToThread = async (evt: ButtonEvent): Promise<void> => {
        evt.preventDefault();
        evt.stopPropagation();
        const { permalinkCreator, mxEvent } = this.props;
        const matrixToUrl = permalinkCreator.forEvent(mxEvent.getId());
        await copyPlaintext(matrixToUrl);
    };

    private onRoomReceipt = (ev: MatrixEvent, room: Room): void => {
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
                MatrixClientPeg.get().removeListener(RoomEvent.Receipt, this.onRoomReceipt);
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

    private onDeviceVerificationChanged = (userId: string, device: string): void => {
        if (userId === this.props.mxEvent.getSender()) {
            this.verifyEvent(this.props.mxEvent);
        }
    };

    private onUserVerificationChanged = (userId: string, _trustStatus: UserTrustLevel): void => {
        if (userId === this.props.mxEvent.getSender()) {
            this.verifyEvent(this.props.mxEvent);
        }
    };

    private async verifyEvent(mxEvent: MatrixEvent): Promise<void> {
        if (!mxEvent.isEncrypted() || mxEvent.isRedacted()) {
            return;
        }

        const encryptionInfo = MatrixClientPeg.get().getEventEncryptionInfo(mxEvent);
        const senderId = mxEvent.getSender();
        const userTrust = MatrixClientPeg.get().checkUserTrust(senderId);

        if (encryptionInfo.mismatchedSender) {
            // something definitely wrong is going on here
            this.setState({
                verified: E2EState.Warning,
            }, this.props.onHeightChanged); // Decryption may have caused a change in size
            return;
        }

        if (!userTrust.isCrossSigningVerified()) {
            // user is not verified, so default to everything is normal
            this.setState({
                verified: E2EState.Normal,
            }, this.props.onHeightChanged); // Decryption may have caused a change in size
            return;
        }

        const eventSenderTrust = encryptionInfo.sender && MatrixClientPeg.get().checkDeviceTrust(
            senderId, encryptionInfo.sender.deviceId,
        );
        if (!eventSenderTrust) {
            this.setState({
                verified: E2EState.Unknown,
            }, this.props.onHeightChanged); // Decryption may have caused a change in size
            return;
        }

        if (!eventSenderTrust.isVerified()) {
            this.setState({
                verified: E2EState.Warning,
            }, this.props.onHeightChanged); // Decryption may have caused a change in size
            return;
        }

        if (!encryptionInfo.authenticated) {
            this.setState({
                verified: E2EState.Unauthenticated,
            }, this.props.onHeightChanged); // Decryption may have caused a change in size
            return;
        }

        this.setState({
            verified: E2EState.Verified,
        }, this.props.onHeightChanged); // Decryption may have caused a change in size
    }

    private propsEqual(objA: IProps, objB: IProps): boolean {
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

    private shouldHighlight(): boolean {
        if (this.props.forExport) return false;
        if (this.context.timelineRenderingType === TimelineRenderingType.Notification) return false;
        if (this.context.timelineRenderingType === TimelineRenderingType.ThreadsList) return false;

        const actions = MatrixClientPeg.get().getPushActionsForEvent(
            this.props.mxEvent.replacingEvent() || this.props.mxEvent,
        );
        if (!actions || !actions.tweaks) { return false; }

        // don't show self-highlights from another of our clients
        if (this.props.mxEvent.getSender() === MatrixClientPeg.get().credentials.userId) {
            return false;
        }

        return actions.tweaks.highlight;
    }

    private onSenderProfileClick = () => {
        dis.dispatch<ComposerInsertPayload>({
            action: Action.ComposerInsert,
            userId: this.props.mxEvent.getSender(),
            timelineRenderingType: this.context.timelineRenderingType,
        });
    };

    private onRequestKeysClick = () => {
        this.setState({
            // Indicate in the UI that the keys have been requested (this is expected to
            // be reset if the component is mounted in the future).
            previouslyRequestedKeys: true,
        });

        // Cancel any outgoing key request for this event and resend it. If a response
        // is received for the request with the required keys, the event could be
        // decrypted successfully.
        MatrixClientPeg.get().cancelAndResendEventRoomKeyRequest(this.props.mxEvent);
    };

    private onPermalinkClicked = e => {
        // This allows the permalink to be opened in a new tab/window or copied as
        // matrix.to, but also for it to enable routing within Element when clicked.
        e.preventDefault();
        dis.dispatch<ViewRoomPayload>({
            action: Action.ViewRoom,
            event_id: this.props.mxEvent.getId(),
            highlighted: true,
            room_id: this.props.mxEvent.getRoomId(),
            metricsTrigger: this.context.timelineRenderingType === TimelineRenderingType.Search
                ? "MessageSearch"
                : undefined,
        });
    };

    private renderE2EPadlock() {
        const ev = this.props.mxEvent;

        // no icon for local rooms
        if (isLocalRoom(ev.getRoomId())) return;

        // event could not be decrypted
        if (ev.getContent().msgtype === 'm.bad.encrypted') {
            return <E2ePadlockUndecryptable />;
        }

        // event is encrypted and not redacted, display padlock corresponding to whether or not it is verified
        if (ev.isEncrypted() && !ev.isRedacted()) {
            if (this.state.verified === E2EState.Normal) {
                return; // no icon if we've not even cross-signed the user
            } else if (this.state.verified === E2EState.Verified) {
                return; // no icon for verified
            } else if (this.state.verified === E2EState.Unauthenticated) {
                return (<E2ePadlockUnauthenticated />);
            } else if (this.state.verified === E2EState.Unknown) {
                return (<E2ePadlockUnknown />);
            } else {
                return (<E2ePadlockUnverified />);
            }
        }

        if (MatrixClientPeg.get().isRoomEncrypted(ev.getRoomId())) {
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
            if (ev.isRedacted()) {
                return; // we expect this to be unencrypted
            }
            // if the event is not encrypted, but it's an e2e room, show the open padlock
            return <E2ePadlockUnencrypted />;
        }

        // no padlock needed
        return null;
    }

    private onActionBarFocusChange = (actionBarFocused: boolean) => {
        this.setState({ actionBarFocused });
    };

    private getTile: () => IEventTileType = () => this.tile.current;

    private getReplyChain = (): ReplyChain => this.replyChain.current;

    private getReactions = () => {
        if (
            !this.props.showReactions ||
            !this.props.getRelationsForEvent
        ) {
            return null;
        }
        const eventId = this.props.mxEvent.getId();
        return this.props.getRelationsForEvent(eventId, "m.annotation", "m.reaction");
    };

    private onReactionsCreated = (relationType: string, eventType: string): void => {
        if (relationType !== "m.annotation" || eventType !== "m.reaction") {
            return;
        }
        this.setState({
            reactions: this.getReactions(),
        });
    };

    private onContextMenu = (ev: React.MouseEvent): void => {
        this.showContextMenu(ev);
    };

    private onTimestampContextMenu = (ev: React.MouseEvent): void => {
        this.showContextMenu(ev, this.props.permalinkCreator?.forEvent(this.props.mxEvent.getId()));
    };

    private showContextMenu(ev: React.MouseEvent, permalink?: string): void {
        const clickTarget = ev.target as HTMLElement;

        // Try to find an anchor element
        const anchorElement = (clickTarget instanceof HTMLAnchorElement) ? clickTarget : clickTarget.closest("a");

        // There is no way to copy non-PNG images into clipboard, so we can't
        // have our own handling for copying images, so we leave it to the
        // Electron layer (webcontents-handler.ts)
        if (clickTarget instanceof HTMLImageElement) return;

        // Return if we're in a browser and click either an a tag or we have
        // selected text, as in those cases we want to use the native browser
        // menu
        if (!PlatformPeg.get().allowOverridingNativeContextMenus() && (getSelectedText() || anchorElement)) return;

        // We don't want to show the menu when editing a message
        if (this.props.editState) return;

        ev.preventDefault();
        ev.stopPropagation();
        this.setState({
            contextMenu: {
                position: {
                    left: ev.clientX,
                    top: ev.clientY,
                    bottom: ev.clientY,
                },
                link: anchorElement?.href || permalink,
            },
            actionBarFocused: true,
        });
    }

    private onCloseMenu = (): void => {
        this.setState({
            contextMenu: null,
            actionBarFocused: false,
        });
    };

    private setQuoteExpanded = (expanded: boolean) => {
        this.setState({
            isQuoteExpanded: expanded,
        });
    };

    /**
     * In some cases we can't use shouldHideEvent() since whether or not we hide
     * an event depends on other things that the event itself
     * @returns {boolean} true if event should be hidden
     */
    private shouldHideEvent(): boolean {
        // If the call was replaced we don't render anything since we render the other call
        if (this.props.callEventGrouper?.hangupReason === CallErrorCode.Replaced) return true;

        return false;
    }

    private renderContextMenu(): React.ReactFragment {
        if (!this.state.contextMenu) return null;

        const tile = this.getTile();
        const replyChain = this.getReplyChain();
        const eventTileOps = tile?.getEventTileOps ? tile.getEventTileOps() : undefined;
        const collapseReplyChain = replyChain?.canCollapse() ? replyChain.collapse : undefined;

        return (
            <MessageContextMenu
                {...aboveRightOf(this.state.contextMenu.position)}
                mxEvent={this.props.mxEvent}
                permalinkCreator={this.props.permalinkCreator}
                eventTileOps={eventTileOps}
                collapseReplyChain={collapseReplyChain}
                onFinished={this.onCloseMenu}
                rightClick={true}
                reactions={this.state.reactions}
                link={this.state.contextMenu.link}
            />
        );
    }

    public render() {
        const msgtype = this.props.mxEvent.getContent().msgtype;
        const eventType = this.props.mxEvent.getType() as EventType;
        const {
            hasRenderer,
            isBubbleMessage,
            isInfoMessage,
            isLeftAlignedBubbleMessage,
            noBubbleEvent,
            isSeeingThroughMessageHiddenForModeration,
        } = getEventDisplayInfo(this.props.mxEvent, this.context.showHiddenEvents, this.shouldHideEvent());
        const { isQuoteExpanded } = this.state;
        // This shouldn't happen: the caller should check we support this type
        // before trying to instantiate us
        if (!hasRenderer) {
            const { mxEvent } = this.props;
            logger.warn(`Event type not supported: type:${eventType} isState:${mxEvent.isState()}`);
            return <div className="mx_EventTile mx_EventTile_info mx_MNoticeBody">
                <div className="mx_EventTile_line">
                    { _t('This event could not be displayed') }
                </div>
            </div>;
        }

        const isProbablyMedia = MediaEventHelper.isEligible(this.props.mxEvent);

        const lineClasses = classNames("mx_EventTile_line", {
            mx_EventTile_mediaLine: isProbablyMedia,
            mx_EventTile_image: (
                this.props.mxEvent.getType() === EventType.RoomMessage &&
                this.props.mxEvent.getContent().msgtype === MsgType.Image
            ),
            mx_EventTile_sticker: this.props.mxEvent.getType() === EventType.Sticker,
            mx_EventTile_emote: (
                this.props.mxEvent.getType() === EventType.RoomMessage &&
                this.props.mxEvent.getContent().msgtype === MsgType.Emote
            ),
        });

        const isSending = (['sending', 'queued', 'encrypting'].indexOf(this.props.eventSendStatus) !== -1);
        const isRedacted = isMessageEvent(this.props.mxEvent) && this.props.isRedacted;
        const isEncryptionFailure = this.props.mxEvent.isDecryptionFailure();

        let isContinuation = this.props.continuation;
        if (this.context.timelineRenderingType !== TimelineRenderingType.Room &&
            this.context.timelineRenderingType !== TimelineRenderingType.Search &&
            this.context.timelineRenderingType !== TimelineRenderingType.Thread &&
            this.props.layout !== Layout.Bubble
        ) {
            isContinuation = false;
        }

        const isEditing = !!this.props.editState;
        const classes = classNames({
            mx_EventTile_bubbleContainer: isBubbleMessage,
            mx_EventTile_leftAlignedBubble: isLeftAlignedBubbleMessage,
            mx_EventTile: true,
            mx_EventTile_isEditing: isEditing,
            mx_EventTile_info: isInfoMessage,
            mx_EventTile_12hr: this.props.isTwelveHour,
            // Note: we keep the `sending` state class for tests, not for our styles
            mx_EventTile_sending: !isEditing && isSending,
            mx_EventTile_highlight: this.shouldHighlight(),
            mx_EventTile_selected: this.props.isSelectedEvent || this.state.contextMenu,
            mx_EventTile_continuation: isContinuation || eventType === EventType.CallInvite,
            mx_EventTile_last: this.props.last,
            mx_EventTile_lastInSection: this.props.lastInSection,
            mx_EventTile_contextual: this.props.contextual,
            mx_EventTile_actionBarFocused: this.state.actionBarFocused,
            mx_EventTile_verified: !isBubbleMessage && this.state.verified === E2EState.Verified,
            mx_EventTile_unverified: !isBubbleMessage && this.state.verified === E2EState.Warning,
            mx_EventTile_unknown: !isBubbleMessage && this.state.verified === E2EState.Unknown,
            mx_EventTile_bad: isEncryptionFailure,
            mx_EventTile_emote: msgtype === MsgType.Emote,
            mx_EventTile_noSender: this.props.hideSender,
            mx_EventTile_clamp: this.context.timelineRenderingType === TimelineRenderingType.ThreadsList,
            mx_EventTile_noBubble: noBubbleEvent,
        });

        // If the tile is in the Sending state, don't speak the message.
        const ariaLive = (this.props.eventSendStatus !== null) ? 'off' : undefined;

        let permalink = "#";
        if (this.props.permalinkCreator) {
            permalink = this.props.permalinkCreator.forEvent(this.props.mxEvent.getId());
        }

        // we can't use local echoes as scroll tokens, because their event IDs change.
        // Local echos have a send "status".
        const scrollToken = this.props.mxEvent.status
            ? undefined
            : this.props.mxEvent.getId();

        let avatar: JSX.Element;
        let sender: JSX.Element;
        let avatarSize: number;
        let needsSenderProfile: boolean;

        if (this.context.timelineRenderingType === TimelineRenderingType.Notification) {
            avatarSize = 24;
            needsSenderProfile = true;
        } else if (isInfoMessage) {
            // a small avatar, with no sender profile, for
            // joins/parts/etc
            avatarSize = 14;
            needsSenderProfile = false;
        } else if (this.context.timelineRenderingType === TimelineRenderingType.ThreadsList ||
            (this.context.timelineRenderingType === TimelineRenderingType.Thread && !this.props.continuation)
        ) {
            avatarSize = 32;
            needsSenderProfile = true;
        } else if (eventType === EventType.RoomCreate || isBubbleMessage) {
            avatarSize = 0;
            needsSenderProfile = false;
        } else if (this.props.layout == Layout.IRC) {
            avatarSize = 14;
            needsSenderProfile = true;
        } else if (
            (this.props.continuation && this.context.timelineRenderingType !== TimelineRenderingType.File) ||
            eventType === EventType.CallInvite
        ) {
            // no avatar or sender profile for continuation messages and call tiles
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
                    <MemberAvatar
                        member={member}
                        width={avatarSize}
                        height={avatarSize}
                        viewUserOnClick={true}
                        forceHistorical={this.props.mxEvent.getType() === EventType.RoomMember}
                    />
                </div>
            );
        }

        if (needsSenderProfile && this.props.hideSender !== true) {
            if (this.context.timelineRenderingType === TimelineRenderingType.Room ||
                this.context.timelineRenderingType === TimelineRenderingType.Search ||
                this.context.timelineRenderingType === TimelineRenderingType.Pinned ||
                this.context.timelineRenderingType === TimelineRenderingType.Thread
            ) {
                sender = <SenderProfile
                    onClick={this.onSenderProfileClick}
                    mxEvent={this.props.mxEvent}
                />;
            } else {
                sender = <SenderProfile
                    mxEvent={this.props.mxEvent}
                />;
            }
        }

        const showMessageActionBar = !isEditing && !this.props.forExport;
        const actionBar = showMessageActionBar ? <MessageActionBar
            mxEvent={this.props.mxEvent}
            reactions={this.state.reactions}
            permalinkCreator={this.props.permalinkCreator}
            getTile={this.getTile}
            getReplyChain={this.getReplyChain}
            onFocusChange={this.onActionBarFocusChange}
            isQuoteExpanded={isQuoteExpanded}
            toggleThreadExpanded={() => this.setQuoteExpanded(!isQuoteExpanded)}
            getRelationsForEvent={this.props.getRelationsForEvent}
        /> : undefined;

        const showTimestamp = this.props.mxEvent.getTs()
            && (this.props.alwaysShowTimestamps
            || this.props.last
            || this.state.hover
            || this.state.actionBarFocused
            || Boolean(this.state.contextMenu));

        // Thread panel shows the timestamp of the last reply in that thread
        let ts = this.context.timelineRenderingType !== TimelineRenderingType.ThreadsList
            ? this.props.mxEvent.getTs()
            : this.state.thread?.replyToEvent?.getTs();
        if (typeof ts !== "number") {
            // Fall back to something we can use
            ts = this.props.mxEvent.getTs();
        }

        const messageTimestamp = <MessageTimestamp
            showRelative={this.context.timelineRenderingType === TimelineRenderingType.ThreadsList}
            showTwelveHour={this.props.isTwelveHour}
            ts={ts}
        />;

        const timestamp = showTimestamp && ts ? messageTimestamp : null;

        const keyRequestHelpText =
            <div className="mx_EventTile_keyRequestInfo_tooltip_contents">
                <p>
                    { this.state.previouslyRequestedKeys ?
                        _t('Your key share request has been sent - please check your other sessions ' +
                           'for key share requests.') :
                        _t('Key share requests are sent to your other sessions automatically. If you ' +
                           'rejected or dismissed the key share request on your other sessions, click ' +
                           'here to request the keys for this session again.')
                    }
                </p>
                <p>
                    { _t('If your other sessions do not have the key for this message you will not ' +
                         'be able to decrypt them.')
                    }
                </p>
            </div>;
        const keyRequestInfoContent = this.state.previouslyRequestedKeys ?
            _t('Key request sent.') :
            _t(
                '<requestLink>Re-request encryption keys</requestLink> from your other sessions.',
                {},
                {
                    'requestLink': (sub) =>
                        <AccessibleButton
                            className="mx_EventTile_rerequestKeysCta"
                            kind='link_inline'
                            tabIndex={0}
                            onClick={this.onRequestKeysClick}
                        >
                            { sub }
                        </AccessibleButton>,
                },
            );

        const keyRequestInfo = isEncryptionFailure && !isRedacted ?
            <div className="mx_EventTile_keyRequestInfo">
                <span className="mx_EventTile_keyRequestInfo_text">
                    { keyRequestInfoContent }
                </span>
                <TooltipButton helpText={keyRequestHelpText} />
            </div> : null;

        let reactionsRow;
        if (!isRedacted) {
            reactionsRow = <ReactionsRow
                mxEvent={this.props.mxEvent}
                reactions={this.state.reactions}
                key="mx_EventTile_reactionsRow"
            />;
        }

        const linkedTimestamp = <a
            href={permalink}
            onClick={this.onPermalinkClicked}
            aria-label={formatTime(new Date(this.props.mxEvent.getTs()), this.props.isTwelveHour)}
            onContextMenu={this.onTimestampContextMenu}
        >
            { timestamp }
        </a>;

        const useIRCLayout = this.props.layout === Layout.IRC;
        const groupTimestamp = !useIRCLayout ? linkedTimestamp : null;
        const ircTimestamp = useIRCLayout ? linkedTimestamp : null;
        const bubbleTimestamp = this.props.layout === Layout.Bubble ? messageTimestamp : null;
        const groupPadlock = !useIRCLayout && !isBubbleMessage && this.renderE2EPadlock();
        const ircPadlock = useIRCLayout && !isBubbleMessage && this.renderE2EPadlock();

        let msgOption;
        if (this.props.showReadReceipts) {
            if (this.shouldShowSentReceipt || this.shouldShowSendingReceipt) {
                msgOption = <SentReceipt messageState={this.props.mxEvent.getAssociatedStatus()} />;
            } else {
                msgOption = <ReadReceiptGroup
                    readReceipts={this.props.readReceipts ?? []}
                    readReceiptMap={this.props.readReceiptMap ?? {}}
                    checkUnmounting={this.props.checkUnmounting}
                    suppressAnimation={this.suppressReadReceiptAnimation}
                    isTwelveHour={this.props.isTwelveHour}
                />;
            }
        }

        let replyChain;
        if (
            haveRendererForEvent(this.props.mxEvent, this.context.showHiddenEvents) &&
            shouldDisplayReply(this.props.mxEvent)
        ) {
            replyChain = <ReplyChain
                parentEv={this.props.mxEvent}
                onHeightChanged={this.props.onHeightChanged}
                ref={this.replyChain}
                forExport={this.props.forExport}
                permalinkCreator={this.props.permalinkCreator}
                layout={this.props.layout}
                alwaysShowTimestamps={this.props.alwaysShowTimestamps || this.state.hover}
                isQuoteExpanded={isQuoteExpanded}
                setQuoteExpanded={this.setQuoteExpanded}
                getRelationsForEvent={this.props.getRelationsForEvent}
            />;
        }

        // Use `getSender()` because searched events might not have a proper `sender`.
        const isOwnEvent = this.props.mxEvent?.getSender() === MatrixClientPeg.get().getUserId();

        switch (this.context.timelineRenderingType) {
            case TimelineRenderingType.Notification: {
                const room = MatrixClientPeg.get().getRoom(this.props.mxEvent.getRoomId());
                return React.createElement(this.props.as || "li", {
                    "className": classes,
                    "aria-live": ariaLive,
                    "aria-atomic": true,
                    "data-scroll-tokens": scrollToken,
                }, [
                    <div className="mx_EventTile_roomName" key="mx_EventTile_roomName">
                        <RoomAvatar room={room} width={28} height={28} />
                        <a href={permalink} onClick={this.onPermalinkClicked}>
                            { room ? room.name : '' }
                        </a>
                    </div>,
                    <div className="mx_EventTile_senderDetails" key="mx_EventTile_senderDetails">
                        { avatar }
                        <a
                            href={permalink}
                            onClick={this.onPermalinkClicked}
                            onContextMenu={this.onTimestampContextMenu}
                        >
                            { sender }
                            { timestamp }
                        </a>
                    </div>,
                    <div className={lineClasses} key="mx_EventTile_line" onContextMenu={this.onContextMenu}>
                        { this.renderContextMenu() }
                        { renderTile(TimelineRenderingType.Notification, {
                            ...this.props,

                            // overrides
                            ref: this.tile,
                            isSeeingThroughMessageHiddenForModeration,

                            // appease TS
                            highlights: this.props.highlights,
                            highlightLink: this.props.highlightLink,
                            onHeightChanged: this.props.onHeightChanged,
                            permalinkCreator: this.props.permalinkCreator,
                        }, this.context.showHiddenEvents) }
                    </div>,
                ]);
            }
            case TimelineRenderingType.Thread: {
                const room = MatrixClientPeg.get().getRoom(this.props.mxEvent.getRoomId());
                return React.createElement(this.props.as || "li", {
                    "ref": this.ref,
                    "className": classes,
                    "aria-live": ariaLive,
                    "aria-atomic": true,
                    "data-scroll-tokens": scrollToken,
                    "data-has-reply": !!replyChain,
                    "data-layout": this.props.layout,
                    "data-self": isOwnEvent,
                    "data-event-id": this.props.mxEvent.getId(),
                    "onMouseEnter": () => this.setState({ hover: true }),
                    "onMouseLeave": () => this.setState({ hover: false }),
                }, [
                    <div className="mx_EventTile_roomName" key="mx_EventTile_roomName">
                        <RoomAvatar room={room} width={28} height={28} />
                        <a href={permalink} onClick={this.onPermalinkClicked}>
                            { room ? room.name : '' }
                        </a>
                    </div>,
                    <div className="mx_EventTile_senderDetails" key="mx_EventTile_senderDetails">
                        { avatar }
                        { sender }
                    </div>,
                    <div className={lineClasses} key="mx_EventTile_line" onContextMenu={this.onContextMenu}>
                        { this.renderContextMenu() }
                        { replyChain }
                        { renderTile(TimelineRenderingType.Thread, {
                            ...this.props,

                            // overrides
                            ref: this.tile,
                            isSeeingThroughMessageHiddenForModeration,

                            // appease TS
                            highlights: this.props.highlights,
                            highlightLink: this.props.highlightLink,
                            onHeightChanged: this.props.onHeightChanged,
                            permalinkCreator: this.props.permalinkCreator,
                        }, this.context.showHiddenEvents) }
                        { actionBar }
                        <a href={permalink} onClick={this.onPermalinkClicked}>
                            { timestamp }
                        </a>
                    </div>,
                    reactionsRow,
                ]);
            }
            case TimelineRenderingType.ThreadsList: {
                // tab-index=-1 to allow it to be focusable but do not add tab stop for it, primarily for screen readers
                return (
                    React.createElement(this.props.as || "li", {
                        "ref": this.ref,
                        "className": classes,
                        "tabIndex": -1,
                        "aria-live": ariaLive,
                        "aria-atomic": "true",
                        "data-scroll-tokens": scrollToken,
                        "data-layout": this.props.layout,
                        "data-shape": this.context.timelineRenderingType,
                        "data-self": isOwnEvent,
                        "data-has-reply": !!replyChain,
                        "data-notification": this.state.threadNotification,
                        "onMouseEnter": () => this.setState({ hover: true }),
                        "onMouseLeave": () => this.setState({ hover: false }),
                        "onClick": (ev: MouseEvent) => {
                            dis.dispatch<ShowThreadPayload>({
                                action: Action.ShowThread,
                                rootEvent: this.props.mxEvent,
                                push: true,
                            });
                            const target = ev.currentTarget as HTMLElement;
                            const index = Array.from(target.parentElement.children).indexOf(target);
                            PosthogTrackers.trackInteraction("WebThreadsPanelThreadItem", ev, index);
                        },
                    }, <>
                        { sender }
                        { avatar }
                        { timestamp }
                        <div
                            className={lineClasses}
                            key="mx_EventTile_line"
                        >
                            <div className="mx_EventTile_body">
                                { this.props.mxEvent.isRedacted()
                                    ? <RedactedBody mxEvent={this.props.mxEvent} />
                                    : MessagePreviewStore.instance.generatePreviewForEvent(this.props.mxEvent)
                                }
                            </div>
                            { this.renderThreadPanelSummary() }
                        </div>
                        <Toolbar className="mx_MessageActionBar" aria-label={_t("Message Actions")} aria-live="off">
                            <RovingAccessibleTooltipButton
                                className="mx_MessageActionBar_iconButton"
                                onClick={this.viewInRoom}
                                title={_t("View in room")}
                                key="view_in_room"
                            >
                                <ViewInRoomIcon />
                            </RovingAccessibleTooltipButton>
                            <RovingAccessibleTooltipButton
                                className="mx_MessageActionBar_iconButton"
                                onClick={this.copyLinkToThread}
                                title={_t("Copy link to thread")}
                                key="copy_link_to_thread"
                            >
                                <LinkIcon />
                            </RovingAccessibleTooltipButton>
                        </Toolbar>
                        { msgOption }
                    </>)
                );
            }
            case TimelineRenderingType.File: {
                return React.createElement(this.props.as || "li", {
                    "className": classes,
                    "aria-live": ariaLive,
                    "aria-atomic": true,
                    "data-scroll-tokens": scrollToken,
                }, [
                    <div className={lineClasses} key="mx_EventTile_line" onContextMenu={this.onContextMenu}>
                        { this.renderContextMenu() }
                        { renderTile(TimelineRenderingType.File, {
                            ...this.props,

                            // overrides
                            ref: this.tile,
                            isSeeingThroughMessageHiddenForModeration,

                            // appease TS
                            highlights: this.props.highlights,
                            highlightLink: this.props.highlightLink,
                            onHeightChanged: this.props.onHeightChanged,
                            permalinkCreator: this.props.permalinkCreator,
                        }, this.context.showHiddenEvents) }
                    </div>,
                    <a
                        className="mx_EventTile_senderDetailsLink"
                        key="mx_EventTile_senderDetailsLink"
                        href={permalink}
                        onClick={this.onPermalinkClicked}
                    >
                        <div
                            className="mx_EventTile_senderDetails"
                            onContextMenu={this.onTimestampContextMenu}
                        >
                            { sender }
                            { timestamp }
                        </div>
                    </a>,
                ]);
            }

            default: { // Pinned, Room, Search
                // tab-index=-1 to allow it to be focusable but do not add tab stop for it, primarily for screen readers
                return (
                    React.createElement(this.props.as || "li", {
                        "ref": this.ref,
                        "className": classes,
                        "tabIndex": -1,
                        "aria-live": ariaLive,
                        "aria-atomic": "true",
                        "data-scroll-tokens": scrollToken,
                        "data-layout": this.props.layout,
                        "data-self": isOwnEvent,
                        "data-event-id": this.props.mxEvent.getId(),
                        "data-has-reply": !!replyChain,
                        "onMouseEnter": () => this.setState({ hover: true }),
                        "onMouseLeave": () => this.setState({ hover: false }),
                    }, <>
                        { ircTimestamp }
                        { sender }
                        { ircPadlock }
                        { avatar }
                        <div className={lineClasses} key="mx_EventTile_line" onContextMenu={this.onContextMenu}>
                            { this.renderContextMenu() }
                            { groupTimestamp }
                            { groupPadlock }
                            { replyChain }
                            { renderTile(this.context.timelineRenderingType, {
                                ...this.props,

                                // overrides
                                ref: this.tile,
                                isSeeingThroughMessageHiddenForModeration,
                                timestamp: bubbleTimestamp,

                                // appease TS
                                highlights: this.props.highlights,
                                highlightLink: this.props.highlightLink,
                                onHeightChanged: this.props.onHeightChanged,
                                permalinkCreator: this.props.permalinkCreator,
                            }, this.context.showHiddenEvents) }
                            { keyRequestInfo }
                            { actionBar }
                            { this.props.layout === Layout.IRC && <>
                                { reactionsRow }
                                { this.renderThreadInfo() }
                            </> }
                        </div>
                        { this.props.layout !== Layout.IRC && <>
                            { reactionsRow }
                            { this.renderThreadInfo() }
                        </> }
                        { msgOption }
                    </>)
                );
            }
        }
    }
}

// Wrap all event tiles with the tile error boundary so that any throws even during construction are captured
const SafeEventTile = forwardRef((props: IProps, ref: RefObject<UnwrappedEventTile>) => {
    return <TileErrorBoundary mxEvent={props.mxEvent} layout={props.layout}>
        <UnwrappedEventTile ref={ref} {...props} />
    </TileErrorBoundary>;
});
export default SafeEventTile;

function E2ePadlockUndecryptable(props) {
    return (
        <E2ePadlock title={_t("This message cannot be decrypted")} icon={E2ePadlockIcon.Warning} {...props} />
    );
}

function E2ePadlockUnverified(props) {
    return (
        <E2ePadlock title={_t("Encrypted by an unverified session")} icon={E2ePadlockIcon.Warning} {...props} />
    );
}

function E2ePadlockUnencrypted(props) {
    return (
        <E2ePadlock title={_t("Unencrypted")} icon={E2ePadlockIcon.Warning} {...props} />
    );
}

function E2ePadlockUnknown(props) {
    return (
        <E2ePadlock title={_t("Encrypted by a deleted session")} icon={E2ePadlockIcon.Normal} {...props} />
    );
}

function E2ePadlockUnauthenticated(props) {
    return (
        <E2ePadlock
            title={_t("The authenticity of this encrypted message can't be guaranteed on this device.")}
            icon={E2ePadlockIcon.Normal}
            {...props}
        />
    );
}

enum E2ePadlockIcon {
    Normal = "normal",
    Warning = "warning",
}

interface IE2ePadlockProps {
    icon: E2ePadlockIcon;
    title: string;
}

interface IE2ePadlockState {
    hover: boolean;
}

class E2ePadlock extends React.Component<IE2ePadlockProps, IE2ePadlockState> {
    constructor(props: IE2ePadlockProps) {
        super(props);

        this.state = {
            hover: false,
        };
    }

    private onHoverStart = (): void => {
        this.setState({ hover: true });
    };

    private onHoverEnd = (): void => {
        this.setState({ hover: false });
    };

    public render(): JSX.Element {
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
            >{ tooltip }</div>
        );
    }
}

interface ISentReceiptProps {
    messageState: string; // TODO: Types for message sending state
}

function SentReceipt({ messageState }: ISentReceiptProps) {
    const isSent = !messageState || messageState === 'sent';
    const isFailed = messageState === 'not_sent';
    const receiptClasses = classNames({
        'mx_EventTile_receiptSent': isSent,
        'mx_EventTile_receiptSending': !isSent && !isFailed,
    });

    let nonCssBadge = null;
    if (isFailed) {
        nonCssBadge = (
            <NotificationBadge notification={StaticNotificationState.RED_EXCLAMATION} />
        );
    }

    let label = _t("Sending your message...");
    if (messageState === 'encrypting') {
        label = _t("Encrypting your message...");
    } else if (isSent) {
        label = _t("Your message was sent");
    } else if (isFailed) {
        label = _t("Failed to send");
    }
    const [{ showTooltip, hideTooltip }, tooltip] = useTooltip({
        label: label,
        alignment: Alignment.TopRight,
    });

    return (
        <div className="mx_EventTile_msgOption">
            <div className="mx_ReadReceiptGroup">
                <div
                    className="mx_ReadReceiptGroup_button"
                    onMouseOver={showTooltip}
                    onMouseLeave={hideTooltip}
                    onFocus={showTooltip}
                    onBlur={hideTooltip}>
                    <span className="mx_ReadReceiptGroup_container">
                        <span className={receiptClasses}>
                            { nonCssBadge }
                        </span>
                    </span>
                </div>
                { tooltip }
            </div>
        </div>
    );
}
