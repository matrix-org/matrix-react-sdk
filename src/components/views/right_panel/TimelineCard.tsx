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
import { Thread } from 'matrix-js-sdk/src/models/thread';

import BaseCard from "./BaseCard";
import { RightPanelPhases } from "../../../stores/RightPanelStorePhases";

import ResizeNotifier from '../../../utils/ResizeNotifier';
import MessageComposer from '../rooms/MessageComposer';
import { RoomPermalinkCreator } from '../../../utils/permalinks/Permalinks';
import { Layout } from '../../../settings/Layout';
import TimelinePanel from '../../structures/TimelinePanel';
import { E2EStatus } from '../../../utils/ShieldUtils';
import EditorStateTransfer from '../../../utils/EditorStateTransfer';
import RoomContext from '../../../contexts/RoomContext';

import { _t } from '../../../languageHandler';
import { replaceableComponent } from '../../../utils/replaceableComponent';

interface IProps {
    room: Room;
    onClose: () => void;
    resizeNotifier: ResizeNotifier;
    permalinkCreator?: RoomPermalinkCreator;
    e2eStatus?: E2EStatus;
    initialEvent?: MatrixEvent;
    initialEventHighlighted?: boolean;
}
interface IState {
    thread?: Thread;
    editState?: EditorStateTransfer;
    replyToEvent?: MatrixEvent;
}

@replaceableComponent("structures.TimelineCard")
export default class TimelineCard extends React.Component<IProps, IState> {
    static contextType = RoomContext;

    private messagePanel: TimelinePanel;

    constructor(props: IProps) {
        super(props);
        this.state = {};
    }
    public componentDidMount(): void {

    }

    public componentWillUnmount(): void {

    }

    public componentDidUpdate(prevProps) {

    }

    private renderTimelineCardHeader = (): JSX.Element => {
        return <div className="mx_TimelineCard__header">
            <span>{ _t("Chat") }</span>
        </div>;
    };

    private gatherTimelinePanelRef = r => {
        this.messagePanel = r;
    };

    private onMessageListScroll = ev => {
        // if (this.messagePanel.isAtEndOfLiveTimeline()) {
        //     this.setState({
        //         numUnreadMessages: 0,
        //         atEndOfLiveTimeline: true,
        //     });
        // } else {
        //     this.setState({
        //         atEndOfLiveTimeline: false,
        //     });
        // }
        // this.updateTopUnreadMessagesBar();
    };

    private onUserScroll = () => {
        // if (this.state.initialEventId && this.state.isInitialEventHighlighted) {
        //     dis.dispatch({
        //         action: 'view_room',
        //         room_id: this.state.room.roomId,
        //         event_id: this.state.initialEventId,
        //         highlighted: false,
        //         replyingToEvent: this.state.replyToEvent,
        //     });
        // }
    };

    // decide whether or not the top 'unread messages' bar should be shown
    private updateTopUnreadMessagesBar = () => {
        if (!this.messagePanel) {
            return;
        }

        // const showBar = this.messagePanel.canJumpToReadMarker();
        // if (this.state.showTopUnreadMessagesBar != showBar) {
        //     this.setState({ showTopUnreadMessagesBar: showBar });
        // }
    };

    public render(): JSX.Element {
        return (
            <BaseCard
                className="mx_ThreadPanel mx_TimelineCard"
                onClose={this.props.onClose}
                withoutScrollContainer={true}
                header={this.renderTimelineCardHeader()}>
                <TimelinePanel
                    ref={this.gatherTimelinePanelRef}
                    showReadReceipts={true} // No RR support in thread's MVP
                    manageReadReceipts={true} // No RR support in thread's MVP
                    manageReadMarkers={true} // No RM support in thread's MVP
                    sendReadReceiptOnLoad={true} // No RR support in thread's MVP
                    timelineSet={this.props.room.getUnfilteredTimelineSet()}
                    showUrlPreview={true}
                    threadViewPreviousCard={RightPanelPhases.TimelineCard}
                    layout={Layout.Group}
                    hideThreadedMessages={false}
                    hidden={false}
                    showReactions={true}
                    className="mx_RoomView_messagePanel mx_GroupLayout"
                    permalinkCreator={this.props.permalinkCreator}
                    membersLoaded={true}
                    editState={this.state.editState}
                    eventId={this.props.initialEvent?.getId()}
                    resizeNotifier={this.props.resizeNotifier}
                    onScroll={this.onMessageListScroll}
                    onUserScroll={this.onUserScroll}
                    onReadMarkerUpdated={this.updateTopUnreadMessagesBar}
                // highlightedEventId={highlightedEventId}
                // onUserScroll={this.onScroll}
                />

                { /* { ContentMessages.sharedInstance().getCurrentUploads(threadRelation).length > 0 && (
                <UploadBar room={this.props.room} relation={threadRelation} />
            ) } */ }

                <MessageComposer
                    room={this.props.room}
                    resizeNotifier={this.props.resizeNotifier}
                    // relation={threadRelation}
                    replyToEvent={this.state.replyToEvent}
                    permalinkCreator={this.props.permalinkCreator}
                    e2eStatus={this.props.e2eStatus}
                    compact={true}
                />
            </BaseCard>
        // </RoomContext.Provider>
        );
    }
}
