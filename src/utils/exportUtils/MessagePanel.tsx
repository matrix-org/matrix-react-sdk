/*
Copyright 2016 - 2022 The Matrix.org Foundation C.I.C.

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

import React, { createRef, KeyboardEvent, ReactNode, TransitionEvent } from 'react';
import ReactDOM from 'react-dom';
import classNames from 'classnames';
import { Room } from 'matrix-js-sdk/src/models/room';
import { EventType } from 'matrix-js-sdk/src/@types/event';
import { MatrixEvent } from 'matrix-js-sdk/src/models/event';
import { Relations } from "matrix-js-sdk/src/models/relations";
import { logger } from 'matrix-js-sdk/src/logger';
import { RoomStateEvent } from "matrix-js-sdk/src/models/room-state";
import { M_BEACON_INFO } from 'matrix-js-sdk/src/@types/beacon';
import { isSupportedReceiptType } from "matrix-js-sdk/src/utils";

import shouldHideEvent from '../../shouldHideEvent';
import { wantsDateSeparator } from '../../DateUtils';
import { MatrixClientPeg } from '../../MatrixClientPeg';
import SettingsStore from '../../settings/SettingsStore';
import RoomContext, { TimelineRenderingType } from "../../contexts/RoomContext";
import { Layout } from "../../settings/enums/Layout";
import { _t } from "../../languageHandler";
import EventTile, { UnwrappedEventTile, IReadReceiptProps } from "../views/rooms/EventTile";
import { hasText } from "../../TextForEvent";
import IRCTimelineProfileResizer from "../views/elements/IRCTimelineProfileResizer";
import DMRoomMap from "../../utils/DMRoomMap";
import NewRoomIntro from "../views/rooms/NewRoomIntro";
import HistoryTile from "../views/rooms/HistoryTile";
import defaultDispatcher from '../../dispatcher/dispatcher';
import CallEventGrouper from "./CallEventGrouper";
import WhoIsTypingTile from '../views/rooms/WhoIsTypingTile';
import ScrollPanel, { IScrollState } from "./ScrollPanel";
import GenericEventListSummary from '../views/elements/GenericEventListSummary';
import EventListSummary from '../views/elements/EventListSummary';
import DateSeparator from '../views/messages/DateSeparator';
import ErrorBoundary from '../views/elements/ErrorBoundary';
import ResizeNotifier from "../../utils/ResizeNotifier";
import Spinner from "../views/elements/Spinner";
import { RoomPermalinkCreator } from "../../utils/permalinks/Permalinks";
import EditorStateTransfer from "../../utils/EditorStateTransfer";
import { Action } from '../../dispatcher/actions';
import { getEventDisplayInfo } from "../../utils/EventRenderingUtils";
import { IReadReceiptInfo } from "../views/rooms/ReadReceiptMarker";
import { haveRendererForEvent } from "../../events/EventTileFactory";
import { editorRoomKey } from "../../Editing";
import { hasThreadSummary } from "../../utils/EventUtils";

const CONTINUATION_MAX_INTERVAL = 5 * 60 * 1000; // 5 minutes
const continuedTypes = [EventType.Sticker, EventType.RoomMessage];
const groupedStateEvents = [
    EventType.RoomMember,
    EventType.RoomThirdPartyInvite,
    EventType.RoomServerAcl,
    EventType.RoomPinnedEvents,
];

// check if there is a previous event and it has the same sender as this event
// and the types are the same/is in continuedTypes and the time between them is <= CONTINUATION_MAX_INTERVAL
export function shouldFormContinuation(
    prevEvent: MatrixEvent,
    mxEvent: MatrixEvent,
    showHiddenEvents: boolean,
    threadsEnabled: boolean,
    timelineRenderingType?: TimelineRenderingType,
): boolean {
    if (timelineRenderingType === TimelineRenderingType.ThreadsList) return false;
    // sanity check inputs
    if (!prevEvent?.sender || !mxEvent.sender) return false;
    // check if within the max continuation period
    if (mxEvent.getTs() - prevEvent.getTs() > CONTINUATION_MAX_INTERVAL) return false;

    // As we summarise redactions, do not continue a redacted event onto a non-redacted one and vice-versa
    if (mxEvent.isRedacted() !== prevEvent.isRedacted()) return false;

    // Some events should appear as continuations from previous events of different types.
    if (mxEvent.getType() !== prevEvent.getType() &&
        (!continuedTypes.includes(mxEvent.getType() as EventType) ||
            !continuedTypes.includes(prevEvent.getType() as EventType))) return false;

    // Check if the sender is the same and hasn't changed their displayname/avatar between these events
    if (mxEvent.sender.userId !== prevEvent.sender.userId ||
        mxEvent.sender.name !== prevEvent.sender.name ||
        mxEvent.sender.getMxcAvatarUrl() !== prevEvent.sender.getMxcAvatarUrl()) return false;

    // Thread summaries in the main timeline should break up a continuation on both sides
    if (threadsEnabled &&
        (hasThreadSummary(mxEvent) || hasThreadSummary(prevEvent)) &&
        timelineRenderingType !== TimelineRenderingType.Thread
    ) {
        return false;
    }

    // if we don't have tile for previous event then it was shown by showHiddenEvents and has no SenderProfile
    if (!haveRendererForEvent(prevEvent, showHiddenEvents)) return false;

    return true;
}

interface IProps {
    // the list of MatrixEvents to display
    events: MatrixEvent[];

    // true to give the component a 'display: none' style.
    hidden?: boolean;

    // true to show a spinner at the top of the timeline to indicate
    // back-pagination in progress
    backPaginating?: boolean;

    // true to show a spinner at the end of the timeline to indicate
    // forward-pagination in progress
    forwardPaginating?: boolean;

    // ID of an event to highlight. If undefined, no event will be highlighted.
    highlightedEventId?: string;

    // The room these events are all in together, if any.
    // (The notification panel won't have a room here, for example.)
    room?: Room;

    // Should we show URL Previews
    showUrlPreview?: boolean;

    // event after which we should show a read marker
    readMarkerEventId?: string;

    // whether the read marker should be visible
    readMarkerVisible?: boolean;

    // the userid of our user. This is used to suppress the read marker
    // for pending messages.
    ourUserId?: string;

    // whether the timeline can visually go back any further
    canBackPaginate?: boolean;

    // whether to show read receipts
    showReadReceipts?: boolean;

    // true if updates to the event list should cause the scroll panel to
    // scroll down when we are at the bottom of the window. See ScrollPanel
    // for more details.
    stickyBottom?: boolean;

    // className for the panel
    className: string;

    // show twelve hour timestamps
    isTwelveHour?: boolean;

    // show timestamps always
    alwaysShowTimestamps?: boolean;

    // whether to show reactions for an event
    showReactions?: boolean;

    // which layout to use
    layout?: Layout;

    resizeNotifier: ResizeNotifier;
    permalinkCreator?: RoomPermalinkCreator;
    editState?: EditorStateTransfer;

    // callback which is called when the panel is scrolled.
    onScroll?(event: Event): void;

    // callback which is called when more content is needed.
    onFillRequest?(backwards: boolean): Promise<boolean>;

    // helper function to access relations for an event
    onUnfillRequest?(backwards: boolean, scrollToken: string): void;

    getRelationsForEvent?(eventId: string, relationType: string, eventType: string): Relations;

    hideThreadedMessages?: boolean;
    disableGrouping?: boolean;

    callEventGroupers: Map<string, CallEventGrouper>;
}

interface IState {
    ghostReadMarkers: string[];
    showTypingNotifications: boolean;
    hideSender: boolean;
}

interface IReadReceiptForUser {
    lastShownEventId: string;
    receipt: IReadReceiptProps;
}

/* (almost) stateless UI component which builds the event tiles in the room timeline.
 */
export default class MessagePanel extends React.Component<IProps, IState> {
    static contextType = RoomContext;
    public context!: React.ContextType<typeof RoomContext>;

    static defaultProps = {
        disableGrouping: false,
    };

    // opaque readreceipt info for each userId; used by ReadReceiptMarker
    // to manage its animations
    private readonly readReceiptMap: { [userId: string]: IReadReceiptInfo } = {};

    // Track read receipts by event ID. For each _shown_ event ID, we store
    // the list of read receipts to display:
    //   [
    //       {
    //           userId: string,
    //           member: RoomMember,
    //           ts: number,
    //       },
    //   ]
    // This is recomputed on each render. It's only stored on the component
    // for ease of passing the data around since it's computed in one pass
    // over all events.
    private readReceiptsByEvent: Record<string, IReadReceiptProps[]> = {};

    // Track read receipts by user ID. For each user ID we've ever shown a
    // a read receipt for, we store an object:
    //   {
    //       lastShownEventId: string,
    //       receipt: {
    //           userId: string,
    //           member: RoomMember,
    //           ts: number,
    //       },
    //   }
    // so that we can always keep receipts displayed by reverting back to
    // the last shown event for that user ID when needed. This may feel like
    // it duplicates the receipt storage in the room, but at this layer, we
    // are tracking _shown_ event IDs, which the JS SDK knows nothing about.
    // This is recomputed on each render, using the data from the previous
    // render as our fallback for any user IDs we can't match a receipt to a
    // displayed event in the current render cycle.
    private readReceiptsByUserId: Record<string, IReadReceiptForUser> = {};

    private readonly _showHiddenEvents: boolean;
    private readonly threadsEnabled: boolean;
    private isMounted = false;

    private readMarkerNode = createRef<HTMLLIElement>();
    private whoIsTyping = createRef<WhoIsTypingTile>();
    private scrollPanel = createRef<ScrollPanel>();

    private readonly showTypingNotificationsWatcherRef: string;
    private eventTiles: Record<string, UnwrappedEventTile> = {};

    // A map to allow groupers to maintain consistent keys even if their first event is uprooted due to back-pagination.
    public grouperKeyMap = new WeakMap<MatrixEvent, string>();

    constructor(props, context) {
        super(props, context);

        this.state = {
            // previous positions the read marker has been in, so we can
            // display 'ghost' read markers that are animating away
            ghostReadMarkers: [],
            showTypingNotifications: SettingsStore.getValue("showTypingNotifications"),
            hideSender: this.shouldHideSender(),
        };

        // Cache these settings on mount since Settings is expensive to query,
        // and we check this in a hot code path. This is also cached in our
        // RoomContext, however we still need a fallback for roomless MessagePanels.
        this._showHiddenEvents = SettingsStore.getValue("showHiddenEventsInTimeline");
        this.threadsEnabled = SettingsStore.getValue("feature_thread");

        this.showTypingNotificationsWatcherRef =
            SettingsStore.watchSetting("showTypingNotifications", null, this.onShowTypingNotificationsChange);
    }

    componentDidMount() {
        this.calculateRoomMembersCount();
        this.props.room?.currentState.on(RoomStateEvent.Update, this.calculateRoomMembersCount);
        this.isMounted = true;
    }

    componentWillUnmount() {
        this.isMounted = false;
        this.props.room?.currentState.off(RoomStateEvent.Update, this.calculateRoomMembersCount);
        SettingsStore.unwatchSetting(this.showTypingNotificationsWatcherRef);
    }

    componentDidUpdate(prevProps, prevState) {
        if (prevProps.layout !== this.props.layout) {
            this.calculateRoomMembersCount();
        }

        if (prevProps.readMarkerVisible && this.props.readMarkerEventId !== prevProps.readMarkerEventId) {
            const ghostReadMarkers = this.state.ghostReadMarkers;
            ghostReadMarkers.push(prevProps.readMarkerEventId);
            this.setState({
                ghostReadMarkers,
            });
        }

        const pendingEditItem = this.pendingEditItem;
        if (!this.props.editState && this.props.room && pendingEditItem) {
            const event = this.props.room.findEventById(pendingEditItem);
            defaultDispatcher.dispatch({
                action: Action.EditEvent,
                event: !event?.isRedacted() ? event : null,
                timelineRenderingType: this.context.timelineRenderingType,
            });
        }
    }

    private shouldHideSender(): boolean {
        return this.props.room?.getInvitedAndJoinedMemberCount() <= 2 && this.props.layout === Layout.Bubble;
    }

    private calculateRoomMembersCount = (): void => {
        this.setState({
            hideSender: this.shouldHideSender(),
        });
    };

    private onShowTypingNotificationsChange = (): void => {
        this.setState({
            showTypingNotifications: SettingsStore.getValue("showTypingNotifications"),
        });
    };

    /* get the DOM node representing the given event */
    public getNodeForEventId(eventId: string): HTMLElement {
        if (!this.eventTiles) {
            return undefined;
        }

        return this.eventTiles[eventId]?.ref?.current;
    }

    public getTileForEventId(eventId: string): UnwrappedEventTile {
        if (!this.eventTiles) {
            return undefined;
        }
        return this.eventTiles[eventId];
    }

    /* return true if the content is fully scrolled down right now; else false.
     */
    public isAtBottom(): boolean {
        return this.scrollPanel.current?.isAtBottom();
    }

    /* get the current scroll state. See ScrollPanel.getScrollState for
     * details.
     *
     * returns null if we are not mounted.
     */
    public getScrollState(): IScrollState {
        return this.scrollPanel.current?.getScrollState() ?? null;
    }

    // returns one of:
    //
    //  null: there is no read marker
    //  -1: read marker is above the window
    //   0: read marker is within the window
    //  +1: read marker is below the window
    public getReadMarkerPosition(): number {
        const readMarker = this.readMarkerNode.current;
        const messageWrapper = this.scrollPanel.current;

        if (!readMarker || !messageWrapper) {
            return null;
        }

        const wrapperRect = (ReactDOM.findDOMNode(messageWrapper) as HTMLElement).getBoundingClientRect();
        const readMarkerRect = readMarker.getBoundingClientRect();

        // the read-marker pretends to have zero height when it is actually
        // two pixels high; +2 here to account for that.
        if (readMarkerRect.bottom + 2 < wrapperRect.top) {
            return -1;
        } else if (readMarkerRect.top < wrapperRect.bottom) {
            return 0;
        } else {
            return 1;
        }
    }

    /* jump to the top of the content.
     */
    public scrollToTop(): void {
        if (this.scrollPanel.current) {
            this.scrollPanel.current.scrollToTop();
        }
    }

    /* jump to the bottom of the content.
     */
    public scrollToBottom(): void {
        if (this.scrollPanel.current) {
            this.scrollPanel.current.scrollToBottom();
        }
    }

    /**
     * Page up/down.
     *
     * @param {number} mult: -1 to page up, +1 to page down
     */
    public scrollRelative(mult: number): void {
        if (this.scrollPanel.current) {
            this.scrollPanel.current.scrollRelative(mult);
        }
    }

    /**
     * Scroll up/down in response to a scroll key
     *
     * @param {KeyboardEvent} ev: the keyboard event to handle
     */
    public handleScrollKey(ev: KeyboardEvent): void {
        if (this.scrollPanel.current) {
            this.scrollPanel.current.handleScrollKey(ev);
        }
    }

    /* jump to the given event id.
     *
     * offsetBase gives the reference point for the pixelOffset. 0 means the
     * top of the container, 1 means the bottom, and fractional values mean
     * somewhere in the middle. If omitted, it defaults to 0.
     *
     * pixelOffset gives the number of pixels *above* the offsetBase that the
     * node (specifically, the bottom of it) will be positioned. If omitted, it
     * defaults to 0.
     */
    public scrollToEvent(eventId: string, pixelOffset: number, offsetBase: number): void {
        if (this.scrollPanel.current) {
            this.scrollPanel.current.scrollToToken(eventId, pixelOffset, offsetBase);
        }
    }

    public scrollToEventIfNeeded(eventId: string): void {
        const node = this.getNodeForEventId(eventId);
        if (node) {
            node.scrollIntoView({
                block: "nearest",
                behavior: "instant",
            });
        }
    }

    private isUnmounting = (): boolean => {
        return !this.isMounted;
    };

    public get showHiddenEvents(): boolean {
        return this.context?.showHiddenEvents ?? this._showHiddenEvents;
    }

    // TODO: Implement granular (per-room) hide options
    public shouldShowEvent(mxEv: MatrixEvent, forceHideEvents = false): boolean {
        if (this.props.hideThreadedMessages && this.threadsEnabled && this.props.room) {
            const { shouldLiveInRoom } = this.props.room.eventShouldLiveIn(mxEv, this.props.events);
            if (!shouldLiveInRoom) {
                return false;
            }
        }

        if (MatrixClientPeg.get().isUserIgnored(mxEv.getSender())) {
            return false; // ignored = no show (only happens if the ignore happens after an event was received)
        }

        if (this.showHiddenEvents && !forceHideEvents) {
            return true;
        }

        if (!haveRendererForEvent(mxEv, this.showHiddenEvents)) {
            return false; // no tile = no show
        }

        // Always show highlighted event
        if (this.props.highlightedEventId === mxEv.getId()) return true;

        return !shouldHideEvent(mxEv, this.context);
    }

    public readMarkerForEvent(eventId: string, isLastEvent: boolean): ReactNode {
        const visible = !isLastEvent && this.props.readMarkerVisible;

        if (this.props.readMarkerEventId === eventId) {
            let hr;
            // if the read marker comes at the end of the timeline (except
            // for local echoes, which are excluded from RMs, because they
            // don't have useful event ids), we don't want to show it, but
            // we still want to create the <li/> for it so that the
            // algorithms which depend on its position on the screen aren't
            // confused.
            if (visible) {
                hr = <hr className="mx_RoomView_myReadMarker"
                    style={{ opacity: 1, width: '99%' }}
                />;
            }

            return (
                <li key={"readMarker_"+eventId}
                    ref={this.readMarkerNode}
                    className="mx_RoomView_myReadMarker_container"
                    data-scroll-tokens={eventId}
                >
                    { hr }
                </li>
            );
        } else if (this.state.ghostReadMarkers.includes(eventId)) {
            // We render 'ghost' read markers in the DOM while they
            // transition away. This allows the actual read marker
            // to be in the right place straight away without having
            // to wait for the transition to finish.
            // There are probably much simpler ways to do this transition,
            // possibly using react-transition-group which handles keeping
            // elements in the DOM whilst they transition out, although our
            // case is a little more complex because only some of the items
            // transition (ie. the read markers do but the event tiles do not)
            // and TransitionGroup requires that all its children are Transitions.
            const hr = <hr className="mx_RoomView_myReadMarker"
                ref={this.collectGhostReadMarker}
                onTransitionEnd={this.onGhostTransitionEnd}
                data-eventid={eventId}
            />;

            // give it a key which depends on the event id. That will ensure that
            // we get a new DOM node (restarting the animation) when the ghost
            // moves to a different event.
            return (
                <li
                    key={"_readuptoghost_"+eventId}
                    className="mx_RoomView_myReadMarker_container"
                >
                    { hr }
                </li>
            );
        }

        return null;
    }

    private collectGhostReadMarker = (node: HTMLElement): void => {
        if (node) {
            // now the element has appeared, change the style which will trigger the CSS transition
            requestAnimationFrame(() => {
                node.style.width = '10%';
                node.style.opacity = '0';
            });
        }
    };

    private onGhostTransitionEnd = (ev: TransitionEvent): void => {
        // we can now clean up the ghost element
        const finishedEventId = (ev.target as HTMLElement).dataset.eventid;
        this.setState({
            ghostReadMarkers: this.state.ghostReadMarkers.filter(eid => eid !== finishedEventId),
        });
    };

    private getNextEventInfo(arr: MatrixEvent[], i: number): { nextEvent: MatrixEvent, nextTile: MatrixEvent } {
        const nextEvent = i < arr.length - 1
            ? arr[i + 1]
            : null;

        // The next event with tile is used to to determine the 'last successful' flag
        // when rendering the tile. The shouldShowEvent function is pretty quick at what
        // it does, so this should have no significant cost even when a room is used for
        // not-chat purposes.
        const nextTile = arr.slice(i + 1).find(e => this.shouldShowEvent(e));

        return { nextEvent, nextTile };
    }

    private get pendingEditItem(): string | undefined {
        if (!this.props.room) {
            return undefined;
        }

        try {
            return localStorage.getItem(editorRoomKey(this.props.room.roomId, this.context.timelineRenderingType));
        } catch (err) {
            logger.error(err);
            return undefined;
        }
    }

    private getEventTiles(): ReactNode[] {
        let i;

        // first figure out which is the last event in the list which we're
        // actually going to show; this allows us to behave slightly
        // differently for the last event in the list. (eg show timestamp)
        //
        // we also need to figure out which is the last event we show which isn't
        // a local echo, to manage the read-marker.
        let lastShownEvent;

        let lastShownNonLocalEchoIndex = -1;
        for (i = this.props.events.length-1; i >= 0; i--) {
            const mxEv = this.props.events[i];
            if (!this.shouldShowEvent(mxEv)) {
                continue;
            }

            if (lastShownEvent === undefined) {
                lastShownEvent = mxEv;
            }

            if (mxEv.status) {
                // this is a local echo
                continue;
            }

            lastShownNonLocalEchoIndex = i;
            break;
        }

        const ret = [];

        let prevEvent = null; // the last event we showed

        // Note: the EventTile might still render a "sent/sending receipt" independent of
        // this information. When not providing read receipt information, the tile is likely
        // to assume that sent receipts are to be shown more often.
        this.readReceiptsByEvent = {};
        if (this.props.showReadReceipts) {
            this.readReceiptsByEvent = this.getReadReceiptsByShownEvent();
        }

        let grouper: BaseGrouper = null;

        for (i = 0; i < this.props.events.length; i++) {
            const mxEv = this.props.events[i];
            const eventId = mxEv.getId();
            const last = (mxEv === lastShownEvent);
            const { nextEvent, nextTile } = this.getNextEventInfo(this.props.events, i);

            if (grouper) {
                if (grouper.shouldGroup(mxEv)) {
                    grouper.add(mxEv);
                    continue;
                } else {
                    // not part of group, so get the group tiles, close the
                    // group, and continue like a normal event
                    ret.push(...grouper.getTiles());
                    prevEvent = grouper.getNewPrevEvent();
                    grouper = null;
                }
            }

            for (const Grouper of groupers) {
                if (Grouper.canStartGroup(this, mxEv) && !this.props.disableGrouping) {
                    grouper = new Grouper(this, mxEv, prevEvent, lastShownEvent, nextEvent, nextTile);
                    break; // break on first grouper
                }
            }

            if (!grouper) {
                if (this.shouldShowEvent(mxEv)) {
                    // make sure we unpack the array returned by getTilesForEvent,
                    // otherwise React will auto-generate keys, and we will end up
                    // replacing all the DOM elements every time we paginate.
                    ret.push(...this.getTilesForEvent(prevEvent, mxEv, last, false, nextEvent, nextTile));
                    prevEvent = mxEv;
                }

                const readMarker = this.readMarkerForEvent(eventId, i >= lastShownNonLocalEchoIndex);
                if (readMarker) ret.push(readMarker);
            }
        }

        if (grouper) {
            ret.push(...grouper.getTiles());
        }

        return ret;
    }

    public getTilesForEvent(
        prevEvent: MatrixEvent,
        mxEv: MatrixEvent,
        last = false,
        isGrouped = false,
        nextEvent?: MatrixEvent,
        nextEventWithTile?: MatrixEvent,
    ): ReactNode[] {
        const ret = [];

        const isEditing = this.props.editState?.getEvent().getId() === mxEv.getId();
        // local echoes have a fake date, which could even be yesterday. Treat them as 'today' for the date separators.
        let ts1 = mxEv.getTs();
        let eventDate = mxEv.getDate();
        if (mxEv.status) {
            eventDate = new Date();
            ts1 = eventDate.getTime();
        }

        // do we need a date separator since the last event?
        const wantsDateSeparator = this.wantsDateSeparator(prevEvent, eventDate);
        if (wantsDateSeparator && !isGrouped && this.props.room) {
            const dateSeparator = (
                <li key={ts1}>
                    <DateSeparator key={ts1} roomId={this.props.room.roomId} ts={ts1} />
                </li>
            );
            ret.push(dateSeparator);
        }

        let lastInSection = true;
        if (nextEventWithTile) {
            const nextEv = nextEventWithTile;
            const willWantDateSeparator = this.wantsDateSeparator(mxEv, nextEv.getDate() || new Date());
            lastInSection = willWantDateSeparator ||
                mxEv.getSender() !== nextEv.getSender() ||
                getEventDisplayInfo(nextEv, this.showHiddenEvents).isInfoMessage ||
                !shouldFormContinuation(
                    mxEv, nextEv, this.showHiddenEvents, this.threadsEnabled, this.context.timelineRenderingType,
                );
        }

        // is this a continuation of the previous message?
        const continuation = !wantsDateSeparator &&
            shouldFormContinuation(
                prevEvent, mxEv, this.showHiddenEvents, this.threadsEnabled, this.context.timelineRenderingType,
            );

        const eventId = mxEv.getId();
        const highlight = (eventId === this.props.highlightedEventId);

        const readReceipts = this.readReceiptsByEvent[eventId];

        let isLastSuccessful = false;
        const isSentState = s => !s || s === 'sent';
        const isSent = isSentState(mxEv.getAssociatedStatus());
        const hasNextEvent = nextEvent && this.shouldShowEvent(nextEvent);
        if (!hasNextEvent && isSent) {
            isLastSuccessful = true;
        } else if (hasNextEvent && isSent && !isSentState(nextEvent.getAssociatedStatus())) {
            isLastSuccessful = true;
        }

        // This is a bit nuanced, but if our next event is hidden but a future event is not
        // hidden then we're not the last successful.
        if (
            nextEventWithTile &&
            nextEventWithTile !== nextEvent &&
            isSentState(nextEventWithTile.getAssociatedStatus())
        ) {
            isLastSuccessful = false;
        }

        // We only want to consider "last successful" if the event is sent by us, otherwise of course
        // it's successful: we received it.
        isLastSuccessful = isLastSuccessful && mxEv.getSender() === MatrixClientPeg.get().getUserId();

        const callEventGrouper = this.props.callEventGroupers.get(mxEv.getContent().call_id);
        // use txnId as key if available so that we don't remount during sending
        ret.push(
            <EventTile
                key={mxEv.getTxnId() || eventId}
                as="li"
                ref={this.collectEventTile.bind(this, eventId)}
                alwaysShowTimestamps={this.props.alwaysShowTimestamps}
                mxEvent={mxEv}
                continuation={continuation}
                isRedacted={mxEv.isRedacted()}
                replacingEventId={mxEv.replacingEventId()}
                editState={isEditing && this.props.editState}
                onHeightChanged={this.onHeightChanged}
                readReceipts={readReceipts}
                readReceiptMap={this.readReceiptMap}
                showUrlPreview={this.props.showUrlPreview}
                checkUnmounting={this.isUnmounting}
                eventSendStatus={mxEv.getAssociatedStatus()}
                isTwelveHour={this.props.isTwelveHour}
                permalinkCreator={this.props.permalinkCreator}
                last={last}
                lastInSection={lastInSection}
                lastSuccessful={isLastSuccessful}
                isSelectedEvent={highlight}
                getRelationsForEvent={this.props.getRelationsForEvent}
                showReactions={this.props.showReactions}
                layout={this.props.layout}
                showReadReceipts={this.props.showReadReceipts}
                callEventGrouper={callEventGrouper}
                hideSender={this.state.hideSender}
            />,
        );

        return ret;
    }

    public wantsDateSeparator(prevEvent: MatrixEvent, nextEventDate: Date): boolean {
        if (this.context.timelineRenderingType === TimelineRenderingType.ThreadsList) {
            return false;
        }
        if (prevEvent == null) {
            // first event in the panel: depends if we could back-paginate from
            // here.
            return !this.props.canBackPaginate;
        }
        return wantsDateSeparator(prevEvent.getDate(), nextEventDate);
    }

    // Get a list of read receipts that should be shown next to this event
    // Receipts are objects which have a 'userId', 'roomMember' and 'ts'.
    private getReadReceiptsForEvent(event: MatrixEvent): IReadReceiptProps[] {
        const myUserId = MatrixClientPeg.get().credentials.userId;

        // get list of read receipts, sorted most recent first
        const { room } = this.props;
        if (!room) {
            return null;
        }
        const receipts: IReadReceiptProps[] = [];
        room.getReceiptsForEvent(event).forEach((r) => {
            if (
                !r.userId ||
                !isSupportedReceiptType(r.type) ||
                r.userId === myUserId
            ) {
                return; // ignore non-read receipts and receipts from self.
            }
            if (MatrixClientPeg.get().isUserIgnored(r.userId)) {
                return; // ignore ignored users
            }
            const member = room.getMember(r.userId);
            receipts.push({
                userId: r.userId,
                roomMember: member,
                ts: r.data ? r.data.ts : 0,
            });
        });
        return receipts;
    }

    // Get an object that maps from event ID to a list of read receipts that
    // should be shown next to that event. If a hidden event has read receipts,
    // they are folded into the receipts of the last shown event.
    private getReadReceiptsByShownEvent(): Record<string, IReadReceiptProps[]> {
        const receiptsByEvent = {};
        const receiptsByUserId = {};

        let lastShownEventId;
        for (const event of this.props.events) {
            if (this.shouldShowEvent(event)) {
                lastShownEventId = event.getId();
            }
            if (!lastShownEventId) {
                continue;
            }

            const existingReceipts = receiptsByEvent[lastShownEventId] || [];
            const newReceipts = this.getReadReceiptsForEvent(event);
            receiptsByEvent[lastShownEventId] = existingReceipts.concat(newReceipts);

            // Record these receipts along with their last shown event ID for
            // each associated user ID.
            for (const receipt of newReceipts) {
                receiptsByUserId[receipt.userId] = {
                    lastShownEventId,
                    receipt,
                };
            }
        }

        // It's possible in some cases (for example, when a read receipt
        // advances before we have paginated in the new event that it's marking
        // received) that we can temporarily not have a matching event for
        // someone which had one in the last. By looking through our previous
        // mapping of receipts by user ID, we can cover recover any receipts
        // that would have been lost by using the same event ID from last time.
        for (const userId in this.readReceiptsByUserId) {
            if (receiptsByUserId[userId]) {
                continue;
            }
            const { lastShownEventId, receipt } = this.readReceiptsByUserId[userId];
            const existingReceipts = receiptsByEvent[lastShownEventId] || [];
            receiptsByEvent[lastShownEventId] = existingReceipts.concat(receipt);
            receiptsByUserId[userId] = { lastShownEventId, receipt };
        }
        this.readReceiptsByUserId = receiptsByUserId;

        // After grouping receipts by shown events, do another pass to sort each
        // receipt list.
        for (const eventId in receiptsByEvent) {
            receiptsByEvent[eventId].sort((r1, r2) => {
                return r2.ts - r1.ts;
            });
        }

        return receiptsByEvent;
    }

    private collectEventTile = (eventId: string, node: UnwrappedEventTile): void => {
        this.eventTiles[eventId] = node;
    };

    // once dynamic content in the events load, make the scrollPanel check the
    // scroll offsets.
    public onHeightChanged = (): void => {
        const scrollPanel = this.scrollPanel.current;
        if (scrollPanel) {
            scrollPanel.checkScroll();
        }
    };

    private onTypingShown = (): void => {
        const scrollPanel = this.scrollPanel.current;
        // this will make the timeline grow, so checkScroll
        scrollPanel.checkScroll();
        if (scrollPanel && scrollPanel.getScrollState().stuckAtBottom) {
            scrollPanel.preventShrinking();
        }
    };

    private onTypingHidden = (): void => {
        const scrollPanel = this.scrollPanel.current;
        if (scrollPanel) {
            // as hiding the typing notifications doesn't
            // update the scrollPanel, we tell it to apply
            // the shrinking prevention once the typing notifs are hidden
            scrollPanel.updatePreventShrinking();
            // order is important here as checkScroll will scroll down to
            // reveal added padding to balance the notifs disappearing.
            scrollPanel.checkScroll();
        }
    };

    public updateTimelineMinHeight(): void {
        const scrollPanel = this.scrollPanel.current;

        if (scrollPanel) {
            const isAtBottom = scrollPanel.isAtBottom();
            const whoIsTyping = this.whoIsTyping.current;
            const isTypingVisible = whoIsTyping && whoIsTyping.isVisible();
            // when messages get added to the timeline,
            // but somebody else is still typing,
            // update the min-height, so once the last
            // person stops typing, no jumping occurs
            if (isAtBottom && isTypingVisible) {
                scrollPanel.preventShrinking();
            }
        }
    }

    public onTimelineReset(): void {
        const scrollPanel = this.scrollPanel.current;
        if (scrollPanel) {
            scrollPanel.clearPreventShrinking();
        }
    }

    render() {
        let topSpinner;
        let bottomSpinner;
        if (this.props.backPaginating) {
            topSpinner = <li key="_topSpinner"><Spinner /></li>;
        }
        if (this.props.forwardPaginating) {
            bottomSpinner = <li key="_bottomSpinner"><Spinner /></li>;
        }

        const style = this.props.hidden ? { display: 'none' } : {};

        let whoIsTyping;
        if (this.props.room &&
            this.state.showTypingNotifications &&
            this.context.timelineRenderingType === TimelineRenderingType.Room
        ) {
            whoIsTyping = (<WhoIsTypingTile
                room={this.props.room}
                onShown={this.onTypingShown}
                onHidden={this.onTypingHidden}
                ref={this.whoIsTyping} />
            );
        }

        let ircResizer = null;
        if (this.props.layout == Layout.IRC) {
            ircResizer = <IRCTimelineProfileResizer
                minWidth={20}
                maxWidth={600}
                roomId={this.props.room ? this.props.room.roomId : null}
            />;
        }

        const classes = classNames(this.props.className, {
            "mx_MessagePanel_narrow": this.context.narrow,
        });

        return (
            <ErrorBoundary>
                <ScrollPanel
                    ref={this.scrollPanel}
                    className={classes}
                    onScroll={this.props.onScroll}
                    onFillRequest={this.props.onFillRequest}
                    onUnfillRequest={this.props.onUnfillRequest}
                    style={style}
                    stickyBottom={this.props.stickyBottom}
                    resizeNotifier={this.props.resizeNotifier}
                    fixedChildren={ircResizer}
                >
                    { topSpinner }
                    { this.getEventTiles() }
                    { whoIsTyping }
                    { bottomSpinner }
                </ScrollPanel>
            </ErrorBoundary>
        );
    }
}

abstract class BaseGrouper {
    static canStartGroup = (panel: MessagePanel, ev: MatrixEvent): boolean => true;

    public events: MatrixEvent[] = [];
    // events that we include in the group but then eject out and place above the group.
    public ejectedEvents: MatrixEvent[] = [];
    public readMarker: ReactNode;

    constructor(
        public readonly panel: MessagePanel,
        public readonly event: MatrixEvent,
        public readonly prevEvent: MatrixEvent,
        public readonly lastShownEvent: MatrixEvent,
        public readonly nextEvent?: MatrixEvent,
        public readonly nextEventTile?: MatrixEvent,
    ) {
        this.readMarker = panel.readMarkerForEvent(event.getId(), event === lastShownEvent);
    }

    public abstract shouldGroup(ev: MatrixEvent): boolean;
    public abstract add(ev: MatrixEvent): void;
    public abstract getTiles(): ReactNode[];
    public abstract getNewPrevEvent(): MatrixEvent;
}

/* Grouper classes determine when events can be grouped together in a summary.
 * Groupers should have the following methods:
 * - canStartGroup (static): determines if a new group should be started with the
 *   given event
 * - shouldGroup: determines if the given event should be added to an existing group
 * - add: adds an event to an existing group (should only be called if shouldGroup
 *   return true)
 * - getTiles: returns the tiles that represent the group
 * - getNewPrevEvent: returns the event that should be used as the new prevEvent
 *   when determining things such as whether a date separator is necessary
 */

// Wrap initial room creation events into a GenericEventListSummary
// Grouping only events sent by the same user that sent the `m.room.create` and only until
// the first non-state event, beacon_info event or membership event which is not regarding the sender of the `m.room.create` event
class CreationGrouper extends BaseGrouper {
    static canStartGroup = function(panel: MessagePanel, ev: MatrixEvent): boolean {
        return ev.getType() === EventType.RoomCreate;
    };

    public shouldGroup(ev: MatrixEvent): boolean {
        const panel = this.panel;
        const createEvent = this.event;
        if (!panel.shouldShowEvent(ev)) {
            return true;
        }
        if (panel.wantsDateSeparator(this.event, ev.getDate())) {
            return false;
        }
        if (ev.getType() === EventType.RoomMember
            && (ev.getStateKey() !== createEvent.getSender() || ev.getContent()["membership"] !== "join")) {
            return false;
        }
        // beacons are not part of room creation configuration
        // should be shown in timeline
        if (M_BEACON_INFO.matches(ev.getType())) {
            return false;
        }
        if (ev.isState() && ev.getSender() === createEvent.getSender()) {
            return true;
        }

        return false;
    }

    public add(ev: MatrixEvent): void {
        const panel = this.panel;
        this.readMarker = this.readMarker || panel.readMarkerForEvent(
            ev.getId(),
            ev === this.lastShownEvent,
        );
        if (!panel.shouldShowEvent(ev)) {
            return;
        }
        if (ev.getType() === EventType.RoomEncryption) {
            this.ejectedEvents.push(ev);
        } else {
            this.events.push(ev);
        }
    }

    public getTiles(): ReactNode[] {
        // If we don't have any events to group, don't even try to group them. The logic
        // below assumes that we have a group of events to deal with, but we might not if
        // the events we were supposed to group were redacted.
        if (!this.events || !this.events.length) return [];

        const panel = this.panel;
        const ret: ReactNode[] = [];
        const isGrouped = true;
        const createEvent = this.event;
        const lastShownEvent = this.lastShownEvent;

        if (panel.wantsDateSeparator(this.prevEvent, createEvent.getDate())) {
            const ts = createEvent.getTs();
            ret.push(
                <li key={ts+'~'}><DateSeparator roomId={createEvent.getRoomId()} ts={ts} /></li>,
            );
        }

        // If this m.room.create event should be shown (room upgrade) then show it before the summary
        if (panel.shouldShowEvent(createEvent)) {
            // pass in the createEvent as prevEvent as well so no extra DateSeparator is rendered
            ret.push(...panel.getTilesForEvent(createEvent, createEvent));
        }

        for (const ejected of this.ejectedEvents) {
            ret.push(...panel.getTilesForEvent(
                createEvent, ejected, createEvent === lastShownEvent, isGrouped,
            ));
        }

        const eventTiles = this.events.map((e) => {
            // In order to prevent DateSeparators from appearing in the expanded form
            // of GenericEventListSummary, render each member event as if the previous
            // one was itself. This way, the timestamp of the previous event === the
            // timestamp of the current event, and no DateSeparator is inserted.
            return panel.getTilesForEvent(e, e, e === lastShownEvent, isGrouped);
        }).reduce((a, b) => a.concat(b), []);
        // Get sender profile from the latest event in the summary as the m.room.create doesn't contain one
        const ev = this.events[this.events.length - 1];

        let summaryText: string;
        const roomId = ev.getRoomId();
        const creator = ev.sender ? ev.sender.name : ev.getSender();
        if (DMRoomMap.shared().getUserIdForRoomId(roomId)) {
            summaryText = _t("%(creator)s created this DM.", { creator });
        } else {
            summaryText = _t("%(creator)s created and configured the room.", { creator });
        }

        ret.push(<NewRoomIntro key="newroomintro" />);

        ret.push(
            <GenericEventListSummary
                key="roomcreationsummary"
                events={this.events}
                onToggle={panel.onHeightChanged} // Update scroll state
                summaryMembers={[ev.sender]}
                summaryText={summaryText}
                layout={this.panel.props.layout}
            >
                { eventTiles }
            </GenericEventListSummary>,
        );

        if (this.readMarker) {
            ret.push(this.readMarker);
        }

        return ret;
    }

    public getNewPrevEvent(): MatrixEvent {
        return this.event;
    }
}

// Wrap consecutive grouped events in a ListSummary
class MainGrouper extends BaseGrouper {
    static canStartGroup = function(panel: MessagePanel, ev: MatrixEvent): boolean {
        if (!panel.shouldShowEvent(ev)) return false;

        if (ev.isState() && groupedStateEvents.includes(ev.getType() as EventType)) {
            return true;
        }

        if (ev.isRedacted()) {
            return true;
        }

        if (panel.showHiddenEvents && !panel.shouldShowEvent(ev, true)) {
            return true;
        }

        return false;
    };

    constructor(
        public readonly panel: MessagePanel,
        public readonly event: MatrixEvent,
        public readonly prevEvent: MatrixEvent,
        public readonly lastShownEvent: MatrixEvent,
        nextEvent: MatrixEvent,
        nextEventTile: MatrixEvent,
    ) {
        super(panel, event, prevEvent, lastShownEvent, nextEvent, nextEventTile);
        this.events = [event];
    }

    public shouldGroup(ev: MatrixEvent): boolean {
        if (!this.panel.shouldShowEvent(ev)) {
            // absorb hidden events so that they do not break up streams of messages & redaction events being grouped
            return true;
        }
        if (this.panel.wantsDateSeparator(this.events[0], ev.getDate())) {
            return false;
        }
        if (ev.isState() && groupedStateEvents.includes(ev.getType() as EventType)) {
            return true;
        }
        if (ev.isRedacted()) {
            return true;
        }
        if (this.panel.showHiddenEvents && !this.panel.shouldShowEvent(ev, true)) {
            return true;
        }
        return false;
    }

    public add(ev: MatrixEvent): void {
        if (ev.getType() === EventType.RoomMember) {
            // We can ignore any events that don't actually have a message to display
            if (!hasText(ev, this.panel.showHiddenEvents)) return;
        }
        this.readMarker = this.readMarker || this.panel.readMarkerForEvent(ev.getId(), ev === this.lastShownEvent);
        if (!this.panel.showHiddenEvents && !this.panel.shouldShowEvent(ev)) {
            // absorb hidden events to not split the summary
            return;
        }
        this.events.push(ev);
    }

    private generateKey(): string {
        return "eventlistsummary-" + this.events[0].getId();
    }

    public getTiles(): ReactNode[] {
        // If we don't have any events to group, don't even try to group them. The logic
        // below assumes that we have a group of events to deal with, but we might not if
        // the events we were supposed to group were redacted.
        if (!this.events?.length) return [];

        const isGrouped = true;
        const panel = this.panel;
        const lastShownEvent = this.lastShownEvent;
        const ret: ReactNode[] = [];

        if (panel.wantsDateSeparator(this.prevEvent, this.events[0].getDate())) {
            const ts = this.events[0].getTs();
            ret.push(
                <li key={ts+'~'}><DateSeparator roomId={this.events[0].getRoomId()} ts={ts} /></li>,
            );
        }

        // Ensure that the key of the EventListSummary does not change with new events in either direction.
        // This will prevent it from being re-created unnecessarily, and instead will allow new props to be provided.
        // In turn, the shouldComponentUpdate method on ELS can be used to prevent unnecessary renderings.
        const keyEvent = this.events.find(e => this.panel.grouperKeyMap.get(e));
        const key = keyEvent ? this.panel.grouperKeyMap.get(keyEvent) : this.generateKey();
        if (!keyEvent) {
            // Populate the weak map with the key.
            // Note that we only set the key on the specific event it refers to, since this group might get
            // split up in the future by other intervening events. If we were to set the key on all events
            // currently in the group, we would risk later giving the same key to multiple groups.
            this.panel.grouperKeyMap.set(this.events[0], key);
        }

        let highlightInSummary = false;
        let eventTiles = this.events.map((e, i) => {
            if (e.getId() === panel.props.highlightedEventId) {
                highlightInSummary = true;
            }
            return panel.getTilesForEvent(
                i === 0 ? this.prevEvent : this.events[i - 1],
                e,
                e === lastShownEvent,
                isGrouped,
                this.nextEvent,
                this.nextEventTile,
            );
        }).reduce((a, b) => a.concat(b), []);

        if (eventTiles.length === 0) {
            eventTiles = null;
        }

        // If a membership event is the start of visible history, tell the user
        // why they can't see earlier messages
        if (!this.panel.props.canBackPaginate && !this.prevEvent) {
            ret.push(<HistoryTile key="historytile" />);
        }

        ret.push(
            <EventListSummary
                key={key}
                data-testid={key}
                events={this.events}
                onToggle={panel.onHeightChanged} // Update scroll state
                startExpanded={highlightInSummary}
                layout={this.panel.props.layout}
            >
                { eventTiles }
            </EventListSummary>,
        );

        if (this.readMarker) {
            ret.push(this.readMarker);
        }

        return ret;
    }

    public getNewPrevEvent(): MatrixEvent {
        return this.events[this.events.length - 1];
    }
}

// all the grouper classes that we use, ordered by priority
const groupers = [CreationGrouper, MainGrouper];
