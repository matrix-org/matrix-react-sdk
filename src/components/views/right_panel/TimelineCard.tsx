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
import { EventSubscription } from "fbemitter";
import { EventTimelineSet, MatrixEvent, Room } from 'matrix-js-sdk/src';
import { Thread } from 'matrix-js-sdk/src/models/thread';

import BaseCard from "./BaseCard";

import ResizeNotifier from '../../../utils/ResizeNotifier';
import MessageComposer from '../rooms/MessageComposer';
import { RoomPermalinkCreator } from '../../../utils/permalinks/Permalinks';
import { Layout } from '../../../settings/enums/Layout';
import TimelinePanel from '../../structures/TimelinePanel';
import { E2EStatus } from '../../../utils/ShieldUtils';
import EditorStateTransfer from '../../../utils/EditorStateTransfer';
import RoomContext from '../../../contexts/RoomContext';
import dis from '../../../dispatcher/dispatcher';
import { _t } from '../../../languageHandler';
import { replaceableComponent } from '../../../utils/replaceableComponent';
import { ActionPayload } from '../../../dispatcher/payloads';
import { Action } from '../../../dispatcher/actions';
import RoomViewStore from '../../../stores/RoomViewStore';
interface IProps {
    room: Room;
    onClose: () => void;
    resizeNotifier: ResizeNotifier;
    permalinkCreator?: RoomPermalinkCreator;
    e2eStatus?: E2EStatus;
    timelineSet?: EventTimelineSet;
}
interface IState {
    thread?: Thread;
    editState?: EditorStateTransfer;
    replyToEvent?: MatrixEvent;
    initialEventId?: string;
    initialEventHighlighted?: boolean;
}

@replaceableComponent("structures.TimelineCard")
export default class TimelineCard extends React.Component<IProps, IState> {
    static contextType = RoomContext;

    private dispatcherRef: string;
    private timelinePanelRef: React.RefObject<TimelinePanel> = React.createRef();
    private roomStoreToken: EventSubscription;
    constructor(props: IProps) {
        super(props);
        this.state = {};
    }

    public componentDidMount(): void {
        this.roomStoreToken = RoomViewStore.addListener(this.onRoomViewStoreUpdate);
        this.dispatcherRef = dis.register(this.onAction);
    }

    public componentWillUnmount(): void {
        // Remove RoomStore listener
        if (this.roomStoreToken) {
            this.roomStoreToken.remove();
        }
        dis.unregister(this.dispatcherRef);
    }

    private onRoomViewStoreUpdate = async (initial?: boolean): Promise<void> => {
        const newState: Pick<IState, any> = {
            // roomId,
            // roomAlias: RoomViewStore.getRoomAlias(),
            // roomLoading: RoomViewStore.isRoomLoading(),
            // roomLoadError: RoomViewStore.getRoomLoadError(),
            // joining: RoomViewStore.isJoining(),
            // replyToEvent: RoomViewStore.getQuotingEvent(),
            // // we should only peek once we have a ready client
            // shouldPeek: this.state.matrixClientIsReady && RoomViewStore.shouldPeek(),
            // showReadReceipts: SettingsStore.getValue("showReadReceipts", roomId),
            // showRedactions: SettingsStore.getValue("showRedactions", roomId),
            // showJoinLeaves: SettingsStore.getValue("showJoinLeaves", roomId),
            // showAvatarChanges: SettingsStore.getValue("showAvatarChanges", roomId),
            // showDisplaynameChanges: SettingsStore.getValue("showDisplaynameChanges", roomId),
            // wasContextSwitch: RoomViewStore.getWasContextSwitch(),
            initialEventId: RoomViewStore.getInitialEventId(),
            initialEventHighlighted: RoomViewStore.isInitialEventHighlighted(),
            replyToEvent: RoomViewStore.getQuotingEvent(),
        };
        this.setState(newState);
    };

    private onAction = (payload: ActionPayload): void => {
        switch (payload.action) {
            case Action.EditEvent:
                this.setState({
                    editState: payload.event ? new EditorStateTransfer(payload.event) : null,
                }, () => {
                    if (payload.event) {
                        this.timelinePanelRef.current?.scrollToEventIfNeeded(payload.event.getId());
                    }
                });
                break;
            default:
                break;
        }
    };

    private onScroll = (): void => {
        if (this.state.initialEventId && this.state.initialEventHighlighted) {
            dis.dispatch({
                action: Action.ViewRoom,
                room_id: this.props.room.roomId,
                event_id: this.state.initialEventId,
                highlighted: false,
                replyingToEvent: this.state.replyToEvent,
            });
        }
    };

    private renderTimelineCardHeader = (): JSX.Element => {
        return <div className="mx_TimelineCard__header">
            <span>{ _t("Chat") }</span>
        </div>;
    };

    public render(): JSX.Element {
        const highlightedEventId = this.state.initialEventHighlighted
            ? this.state.initialEventId
            : null;

        return (
            <RoomContext.Provider value={{
                ...this.context,
                liveTimeline: this.props.timelineSet.getLiveTimeline(),
            }}>
                <BaseCard
                    className="mx_ThreadPanel mx_TimelineCard"
                    onClose={this.props.onClose}
                    withoutScrollContainer={true}
                    header={this.renderTimelineCardHeader()}
                >
                    <TimelinePanel
                        ref={this.timelinePanelRef}
                        showReadReceipts={false} // TODO: RR's cause issues with limited horizontal space
                        manageReadReceipts={true}
                        manageReadMarkers={false} // No RM support in the TimelineCard
                        sendReadReceiptOnLoad={true}
                        timelineSet={this.props.timelineSet}
                        showUrlPreview={true}
                        layout={Layout.Group}
                        hideThreadedMessages={false}
                        hidden={false}
                        showReactions={true}
                        className="mx_RoomView_messagePanel mx_GroupLayout"
                        permalinkCreator={this.props.permalinkCreator}
                        membersLoaded={true}
                        editState={this.state.editState}
                        eventId={this.state.initialEventId}
                        resizeNotifier={this.props.resizeNotifier}
                        highlightedEventId={highlightedEventId}
                        onUserScroll={this.onScroll}
                    />

                    <MessageComposer
                        room={this.props.room}
                        resizeNotifier={this.props.resizeNotifier}
                        replyToEvent={this.state.replyToEvent}
                        permalinkCreator={this.props.permalinkCreator}
                        e2eStatus={this.props.e2eStatus}
                        compact={true}
                    />
                </BaseCard>
            </RoomContext.Provider>
        );
    }
}
