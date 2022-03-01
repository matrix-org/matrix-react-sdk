/*
Copyright 2021 - 2022 The Matrix.org Foundation C.I.C.

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

import React, { createRef, KeyboardEvent } from 'react';
import { Thread, ThreadEvent } from 'matrix-js-sdk/src/models/thread';
import { RelationType } from 'matrix-js-sdk/src/@types/event';
import { Room } from 'matrix-js-sdk/src/models/room';
import { IEventRelation, MatrixEvent } from 'matrix-js-sdk/src/models/event';
import { TimelineWindow } from 'matrix-js-sdk/src/timeline-window';
import { Direction } from 'matrix-js-sdk/src/models/event-timeline';
import { IRelationsRequestOpts } from 'matrix-js-sdk/src/@types/requests';
import classNames from "classnames";

import BaseCard from "../views/right_panel/BaseCard";
import { RightPanelPhases } from "../../stores/right-panel/RightPanelStorePhases";
import { replaceableComponent } from "../../utils/replaceableComponent";
import ResizeNotifier from '../../utils/ResizeNotifier';
import MessageComposer from '../views/rooms/MessageComposer';
import { RoomPermalinkCreator } from '../../utils/permalinks/Permalinks';
import { Layout } from '../../settings/enums/Layout';
import TimelinePanel from './TimelinePanel';
import dis from "../../dispatcher/dispatcher";
import { ActionPayload } from '../../dispatcher/payloads';
import { Action } from '../../dispatcher/actions';
import { MatrixClientPeg } from '../../MatrixClientPeg';
import { E2EStatus } from '../../utils/ShieldUtils';
import EditorStateTransfer from '../../utils/EditorStateTransfer';
import RoomContext, { TimelineRenderingType } from '../../contexts/RoomContext';
import ContentMessages from '../../ContentMessages';
import UploadBar from './UploadBar';
import { _t } from '../../languageHandler';
import ThreadListContextMenu from '../views/context_menus/ThreadListContextMenu';
import RightPanelStore from '../../stores/right-panel/RightPanelStore';
import SettingsStore from "../../settings/SettingsStore";
import { ViewRoomPayload } from "../../dispatcher/payloads/ViewRoomPayload";
import FileDropTarget from "./FileDropTarget";
import { getKeyBindingsManager } from "../../KeyBindingsManager";
import { KeyBindingAction } from "../../accessibility/KeyboardShortcuts";
import Measured from '../views/elements/Measured';
import PosthogTrackers from "../../PosthogTrackers";
import { ButtonEvent } from "../views/elements/AccessibleButton";

interface IProps {
    room: Room;
    onClose: () => void;
    resizeNotifier: ResizeNotifier;
    mxEvent: MatrixEvent;
    permalinkCreator?: RoomPermalinkCreator;
    e2eStatus?: E2EStatus;
    initialEvent?: MatrixEvent;
    isInitialEventHighlighted?: boolean;
}

interface IState {
    thread?: Thread;
    lastThreadReply?: MatrixEvent;
    layout: Layout;
    editState?: EditorStateTransfer;
    replyToEvent?: MatrixEvent;
    narrow: boolean;
}

@replaceableComponent("structures.ThreadView")
export default class ThreadView extends React.Component<IProps, IState> {
    static contextType = RoomContext;
    public context!: React.ContextType<typeof RoomContext>;

    private dispatcherRef: string;
    private readonly layoutWatcherRef: string;
    private timelinePanel = createRef<TimelinePanel>();
    private card = createRef<HTMLDivElement>();

    constructor(props: IProps) {
        super(props);

        this.state = {
            layout: SettingsStore.getValue("layout"),
            narrow: false,
        };

        this.layoutWatcherRef = SettingsStore.watchSetting("layout", null, (...[,,, value]) =>
            this.setState({ layout: value as Layout }),
        );
    }

    public componentDidMount(): void {
        this.setupThread(this.props.mxEvent);
        this.dispatcherRef = dis.register(this.onAction);

        const room = MatrixClientPeg.get().getRoom(this.props.mxEvent.getRoomId());
        room.on(ThreadEvent.New, this.onNewThread);
    }

    public componentWillUnmount(): void {
        this.teardownThread();
        if (this.dispatcherRef) dis.unregister(this.dispatcherRef);
        const room = MatrixClientPeg.get().getRoom(this.props.mxEvent.getRoomId());
        room.removeListener(ThreadEvent.New, this.onNewThread);
        SettingsStore.unwatchSetting(this.layoutWatcherRef);
    }

    public componentDidUpdate(prevProps) {
        if (prevProps.mxEvent !== this.props.mxEvent) {
            this.teardownThread();
            this.setupThread(this.props.mxEvent);
        }

        if (prevProps.room !== this.props.room) {
            RightPanelStore.instance.setCard({ phase: RightPanelPhases.RoomSummary });
        }
    }

    private onAction = (payload: ActionPayload): void => {
        if (payload.phase == RightPanelPhases.ThreadView && payload.event) {
            this.teardownThread();
            this.setupThread(payload.event);
        }
        switch (payload.action) {
            case Action.EditEvent:
                // Quit early if it's not a thread context
                if (payload.timelineRenderingType !== TimelineRenderingType.Thread) return;
                // Quit early if that's not a thread event
                if (payload.event && !payload.event.getThread()) return;
                this.setState({
                    editState: payload.event ? new EditorStateTransfer(payload.event) : null,
                }, () => {
                    if (payload.event) {
                        this.timelinePanel.current?.scrollToEventIfNeeded(payload.event.getId());
                    }
                });
                break;
            case 'reply_to_event':
                if (payload.context === TimelineRenderingType.Thread) {
                    this.setState({
                        replyToEvent: payload.event,
                    });
                }
                break;
            default:
                break;
        }
    };

    private setupThread = (mxEv: MatrixEvent) => {
        let thread = this.props.room.threads?.get(mxEv.getId());
        if (!thread) {
            thread = this.props.room.createThread(mxEv);
        }
        thread.on(ThreadEvent.Update, this.updateLastThreadReply);
        this.updateThread(thread);
    };

    private teardownThread = () => {
        if (this.state.thread) {
            this.state.thread.removeListener(ThreadEvent.Update, this.updateLastThreadReply);
        }
    };

    private onNewThread = (thread: Thread) => {
        if (thread.id === this.props.mxEvent.getId()) {
            this.teardownThread();
            this.setupThread(this.props.mxEvent);
        }
    };

    private updateThread = (thread?: Thread) => {
        if (thread && this.state.thread !== thread) {
            this.setState({
                thread,
                lastThreadReply: thread.lastReply((ev: MatrixEvent) => {
                    return ev.isThreadRelation && !ev.status;
                }),
            }, async () => {
                thread.emit(ThreadEvent.ViewThread);
                if (!thread.initialEventsFetched) {
                    await thread.fetchInitialEvents();
                }
                this.timelinePanel.current?.refreshTimeline();
            });
        }
    };

    private updateLastThreadReply = () => {
        if (this.state.thread) {
            this.setState({
                lastThreadReply: this.state.thread.lastReply((ev: MatrixEvent) => {
                    return ev.isThreadRelation && !ev.status;
                }),
            });
        }
    };

    private onScroll = (): void => {
        if (this.props.initialEvent && this.props.isInitialEventHighlighted) {
            dis.dispatch<ViewRoomPayload>({
                action: Action.ViewRoom,
                room_id: this.props.room.roomId,
                event_id: this.props.initialEvent?.getId(),
                highlighted: false,
                replyingToEvent: this.state.replyToEvent,
                metricsTrigger: undefined, // room doesn't change
            });
        }
    };

    private onMeasurement = (narrow: boolean): void => {
        this.setState({ narrow });
    };

    private onKeyDown = (ev: KeyboardEvent) => {
        let handled = false;

        const action = getKeyBindingsManager().getRoomAction(ev);
        switch (action) {
            case KeyBindingAction.UploadFile: {
                dis.dispatch({
                    action: "upload_file",
                    context: TimelineRenderingType.Thread,
                }, true);
                handled = true;
                break;
            }
        }

        if (handled) {
            ev.stopPropagation();
            ev.preventDefault();
        }
    };

    private onPaginationRequest = async (
        timelineWindow: TimelineWindow | null,
        direction = Direction.Backward,
        limit = 20,
    ): Promise<boolean> => {
        if (!this.state.thread.hasServerSideSupport) {
            return false;
        }

        const timelineIndex = timelineWindow.getTimelineIndex(direction);

        const paginationKey = direction === Direction.Backward ? "from" : "to";
        const paginationToken = timelineIndex.timeline.getPaginationToken(direction);

        const opts: IRelationsRequestOpts = {
            limit,
            [paginationKey]: paginationToken,
            direction,
        };

        await this.state.thread.fetchEvents(opts);

        return timelineWindow.paginate(direction, limit);
    };

    private onFileDrop = (dataTransfer: DataTransfer) => {
        ContentMessages.sharedInstance().sendContentListToRoom(
            Array.from(dataTransfer.files),
            this.props.mxEvent.getRoomId(),
            this.threadRelation,
            MatrixClientPeg.get(),
            TimelineRenderingType.Thread,
        );
    };

    private get threadRelation(): IEventRelation {
        return {
            "rel_type": RelationType.Thread,
            "event_id": this.state.thread?.id,
            "m.in_reply_to": {
                "event_id": this.state.lastThreadReply?.getId() ?? this.state.thread?.id,
            },
        };
    }

    private renderThreadViewHeader = (): JSX.Element => {
        return <div className="mx_ThreadPanel__header">
            <span>{ _t("Thread") }</span>
            <ThreadListContextMenu
                mxEvent={this.props.mxEvent}
                permalinkCreator={this.props.permalinkCreator} />
        </div>;
    };

    public render(): JSX.Element {
        const highlightedEventId = this.props.isInitialEventHighlighted
            ? this.props.initialEvent?.getId()
            : null;

        const threadRelation = this.threadRelation;

        const messagePanelClassNames = classNames(
            "mx_RoomView_messagePanel",
            {
                "mx_GroupLayout": this.state.layout === Layout.Group,
            });

        return (
            <RoomContext.Provider value={{
                ...this.context,
                timelineRenderingType: TimelineRenderingType.Thread,
                threadId: this.state.thread?.id,
                liveTimeline: this.state?.thread?.timelineSet?.getLiveTimeline(),
                narrow: this.state.narrow,
            }}>
                <BaseCard
                    className="mx_ThreadView mx_ThreadPanel"
                    onClose={this.props.onClose}
                    withoutScrollContainer={true}
                    header={this.renderThreadViewHeader()}
                    ref={this.card}
                    onKeyDown={this.onKeyDown}
                    onBack={(ev: ButtonEvent) => {
                        PosthogTrackers.trackInteraction("WebThreadViewBackButton", ev);
                    }}
                >
                    <Measured
                        sensor={this.card.current}
                        onMeasurement={this.onMeasurement}
                    />
                    { this.state.thread && <div className="mx_ThreadView_timelinePanelWrapper">
                        <FileDropTarget parent={this.card.current} onFileDrop={this.onFileDrop} />
                        <TimelinePanel
                            ref={this.timelinePanel}
                            showReadReceipts={false} // Hide the read receipts
                            // until homeservers speak threads language
                            manageReadReceipts={true}
                            manageReadMarkers={true}
                            sendReadReceiptOnLoad={true}
                            timelineSet={this.state?.thread?.timelineSet}
                            showUrlPreview={true}
                            // ThreadView doesn't support IRC layout at this time
                            layout={this.state.layout === Layout.Bubble ? Layout.Bubble : Layout.Group}
                            hideThreadedMessages={false}
                            hidden={false}
                            showReactions={true}
                            className={messagePanelClassNames}
                            permalinkCreator={this.props.permalinkCreator}
                            membersLoaded={true}
                            editState={this.state.editState}
                            eventId={this.props.initialEvent?.getId()}
                            highlightedEventId={highlightedEventId}
                            onUserScroll={this.onScroll}
                            onPaginationRequest={this.onPaginationRequest}
                        />
                    </div> }

                    { ContentMessages.sharedInstance().getCurrentUploads(threadRelation).length > 0 && (
                        <UploadBar room={this.props.room} relation={threadRelation} />
                    ) }

                    { this.state?.thread?.timelineSet && (<MessageComposer
                        room={this.props.room}
                        resizeNotifier={this.props.resizeNotifier}
                        relation={threadRelation}
                        replyToEvent={this.state.replyToEvent}
                        permalinkCreator={this.props.permalinkCreator}
                        e2eStatus={this.props.e2eStatus}
                        compact={true}
                    />) }
                </BaseCard>
            </RoomContext.Provider>
        );
    }
}
