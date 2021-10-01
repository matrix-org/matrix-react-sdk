/*
Copyright 2021 The Matrix.org Foundation C.I.C.

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
import { MatrixEvent, Room } from 'matrix-js-sdk/src';
import { Thread, ThreadEvent } from 'matrix-js-sdk/src/models/thread';

import BaseCard from "../views/right_panel/BaseCard";
import { RightPanelPhases } from "../../stores/RightPanelStorePhases";
import { replaceableComponent } from "../../utils/replaceableComponent";

import ResizeNotifier from '../../utils/ResizeNotifier';
import { TileShape } from '../views/rooms/EventTile';
import MessageComposer from '../views/rooms/MessageComposer';
import { RoomPermalinkCreator } from '../../utils/permalinks/Permalinks';
import { Layout } from '../../settings/Layout';
import TimelinePanel from './TimelinePanel';
import dis from "../../dispatcher/dispatcher";
import { ActionPayload } from '../../dispatcher/payloads';
import { SetRightPanelPhasePayload } from '../../dispatcher/payloads/SetRightPanelPhasePayload';
import { Action } from '../../dispatcher/actions';
import { MatrixClientPeg } from '../../MatrixClientPeg';
import { E2EStatus } from '../../utils/ShieldUtils';
import EditorStateTransfer from '../../utils/EditorStateTransfer';
import MatrixClientContext from '../../contexts/MatrixClientContext';
import MatrixRenderingContext from '../../contexts/MatrixRenderingContext';

interface IProps {
    room: Room;
    onClose: () => void;
    resizeNotifier: ResizeNotifier;
    mxEvent: MatrixEvent;
    permalinkCreator?: RoomPermalinkCreator;
    e2eStatus?: E2EStatus;
}

interface IState {
    replyToEvent?: MatrixEvent;
    thread?: Thread;
    editState?: EditorStateTransfer;

}

@replaceableComponent("structures.ThreadView")
export default class ThreadView extends React.Component<IProps, IState> {
    static contextType = MatrixClientContext;

    private dispatcherRef: string;
    private timelinePanelRef: React.RefObject<TimelinePanel> = React.createRef();

    constructor(props: IProps) {
        super(props);
        this.state = {};
    }

    public componentDidMount(): void {
        this.setupThread(this.props.mxEvent);
        this.dispatcherRef = dis.register(this.onAction);
    }

    public componentWillUnmount(): void {
        this.teardownThread();
        dis.unregister(this.dispatcherRef);
    }

    public componentDidUpdate(prevProps) {
        if (prevProps.mxEvent !== this.props.mxEvent) {
            this.teardownThread();
            this.setupThread(this.props.mxEvent);
        }

        if (prevProps.room !== this.props.room) {
            dis.dispatch<SetRightPanelPhasePayload>({
                action: Action.SetRightPanelPhase,
                phase: RightPanelPhases.RoomSummary,
            });
        }
    }

    private onAction = (payload: ActionPayload): void => {
        if (payload.phase == RightPanelPhases.ThreadView && payload.event) {
            if (payload.event !== this.props.mxEvent) {
                this.teardownThread();
                this.setupThread(payload.event);
            }
        }
        switch (payload.action) {
            case Action.EditEvent: {
                if (!payload.thread) return;
                const editState = payload.event ? new EditorStateTransfer(payload.event) : null;
                this.setState({ editState }, () => {
                    if (payload.event) {
                        this.timelinePanelRef.current?.scrollToEventIfNeeded(payload.event.getId());
                    }
                });
                break;
            }
            default:
                break;
        }
    };

    private setupThread = (mxEv: MatrixEvent) => {
        let thread = mxEv.getThread();
        if (!thread) {
            const client = MatrixClientPeg.get();
            thread = new Thread([mxEv], this.props.room, client);
            mxEv.setThread(thread);
        }
        thread.on(ThreadEvent.Update, this.updateThread);
        thread.once(ThreadEvent.Ready, this.updateThread);
        this.updateThread(thread);
    };

    private teardownThread = () => {
        if (this.state.thread) {
            this.state.thread.removeListener(ThreadEvent.Update, this.updateThread);
            this.state.thread.removeListener(ThreadEvent.Ready, this.updateThread);
        }
    };

    private updateThread = (thread?: Thread) => {
        if (thread) {
            this.setState({
                thread,
                replyToEvent: thread.replyToEvent,
            });
        }

        this.timelinePanelRef.current?.refreshTimeline();
    };

    public render(): JSX.Element {
        return (
            <MatrixRenderingContext.Provider value={{
                client: this.context,
                rendering: {
                    liveTimeline: this.state?.thread?.timelineSet?.getLiveTimeline(),
                },
            }}>
                <BaseCard
                    className="mx_ThreadView"
                    onClose={this.props.onClose}
                    previousPhase={RightPanelPhases.RoomSummary}
                    withoutScrollContainer={true}
                >
                    { this.state.thread && (
                        <TimelinePanel
                            ref={this.timelinePanelRef}
                            showReadReceipts={false} // No RR support in thread's MVP
                            manageReadReceipts={false} // No RR support in thread's MVP
                            manageReadMarkers={false} // No RM support in thread's MVP
                            sendReadReceiptOnLoad={false} // No RR support in thread's MVP
                            timelineSet={this.state?.thread?.timelineSet}
                            showUrlPreview={true}
                            tileShape={TileShape.Thread}
                            empty={<div>empty</div>}
                            alwaysShowTimestamps={true}
                            layout={Layout.Group}
                            hideThreadedMessages={false}
                            hidden={false}
                            showReactions={true}
                            className="mx_RoomView_messagePanel mx_GroupLayout"
                            permalinkCreator={this.props.permalinkCreator}
                            membersLoaded={true}
                            editState={this.state.editState}
                        />
                    ) }

                    { this.state?.thread?.timelineSet && (<MessageComposer
                        room={this.props.room}
                        liveTimeline={this.state.thread.timelineSet.getLiveTimeline()}
                        resizeNotifier={this.props.resizeNotifier}
                        replyInThread={true}
                        replyToEvent={this.state?.thread?.replyToEvent}
                        showReplyPreview={false}
                        permalinkCreator={this.props.permalinkCreator}
                        e2eStatus={this.props.e2eStatus}
                        compact={true}
                    />) }
                </BaseCard>
            </MatrixRenderingContext.Provider>
        );
    }
}
