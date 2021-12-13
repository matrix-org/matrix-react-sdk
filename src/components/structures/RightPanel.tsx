/*
Copyright 2019 Michael Telatynski <7t3chguy@gmail.com>
Copyright 2015 - 2021 The Matrix.org Foundation C.I.C.

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
import { Room } from "matrix-js-sdk/src/models/room";
import { RoomState } from "matrix-js-sdk/src/models/room-state";
import { RoomMember } from "matrix-js-sdk/src/models/room-member";
import { MatrixEvent } from "matrix-js-sdk/src/models/event";
import { VerificationRequest } from "matrix-js-sdk/src/crypto/verification/request/VerificationRequest";
import { throttle } from 'lodash';
import { User } from 'matrix-js-sdk/src/models/user';

import dis from '../../dispatcher/dispatcher';
import GroupStore from '../../stores/GroupStore';
import { RightPanelPhases } from '../../stores/right-panel/RightPanelStorePhases';
import RightPanelStore from "../../stores/right-panel/RightPanelStore";
import MatrixClientContext from "../../contexts/MatrixClientContext";
import { Action } from "../../dispatcher/actions";
import RoomSummaryCard from "../views/right_panel/RoomSummaryCard";
import WidgetCard from "../views/right_panel/WidgetCard";
import { replaceableComponent } from "../../utils/replaceableComponent";
import SettingsStore from "../../settings/SettingsStore";
import { ActionPayload } from "../../dispatcher/payloads";
import MemberList from "../views/rooms/MemberList";
import GroupMemberList from "../views/groups/GroupMemberList";
import GroupRoomList from "../views/groups/GroupRoomList";
import GroupRoomInfo from "../views/groups/GroupRoomInfo";
import UserInfo, { GroupMember } from "../views/right_panel/UserInfo";
import ThirdPartyMemberInfo from "../views/rooms/ThirdPartyMemberInfo";
import FilePanel from "./FilePanel";
import ThreadView from "./ThreadView";
import ThreadPanel from "./ThreadPanel";
import NotificationPanel from "./NotificationPanel";
import ResizeNotifier from "../../utils/ResizeNotifier";
import PinnedMessagesCard from "../views/right_panel/PinnedMessagesCard";
import { RoomPermalinkCreator } from '../../utils/permalinks/Permalinks';
import { E2EStatus } from '../../utils/ShieldUtils';
import { dispatchShowThreadsPanelEvent } from '../../dispatcher/dispatch-actions/threads';
import TimelineCard from '../views/right_panel/TimelineCard';
import { UPDATE_EVENT } from '../../stores/AsyncStore';

interface IProps {
    room?: Room; // if showing panels for a given room, this is set
    groupId?: string; // if showing panels for a given group, this is set
    member?: RoomMember; // used if we know the room member ahead of opening the panel
    resizeNotifier: ResizeNotifier;
    permalinkCreator?: RoomPermalinkCreator;
    e2eStatus?: E2EStatus;
}

interface IState {
    phase: RightPanelPhases;
    isUserPrivilegedInGroup?: boolean;
    searchQuery: string;

    // Parameters for the states of the different right panels (handled by the RightPanelStore)
    // see: IPanelState
    member?: RoomMember | User | GroupMember;
    verificationRequest?: VerificationRequest;
    verificationRequestPromise?: Promise<VerificationRequest>;
    space?: Room;
    widgetId?: string;
    groupRoomId?: string;
    groupId?: string;
    threadHeadEvent?: MatrixEvent;
    initialEvent?: MatrixEvent;
    isInitialEventHighlighted?: boolean;
}

@replaceableComponent("structures.RightPanel")
export default class RightPanel extends React.Component<IProps, IState> {
    static contextType = MatrixClientContext;

    private dispatcherRef: string;

    constructor(props, context) {
        super(props, context);
        this.state = {
            // get all the state from the room panel store on init
            ...RightPanelStore.instance.currentPanel?.state,
            phase: RightPanelStore.instance.currentPanel?.phase,
            isUserPrivilegedInGroup: null,
            member: this.getUserForPanel(),
            searchQuery: "",
        };
    }

    private readonly delayedUpdate = throttle((): void => {
        this.forceUpdate();
    }, 500, { leading: true, trailing: true });

    // Helper function to split out the logic for getPhaseFromProps() and the constructor
    // as both are called at the same time in the constructor.
    private getUserForPanel(): RoomMember | User | GroupMember {
        if (this.state && this.state.member) return this.state.member;
        const lastState = RightPanelStore.instance.currentPanel?.state;
        // Should just use the member from the RightPanelStore. Wherever the prop is passed should just update the store beforehand.
        return this.props.member ?? lastState?.member;
    }

    public componentDidMount(): void {
        this.dispatcherRef = dis.register(this.onAction);
        const cli = this.context;
        cli.on("RoomState.members", this.onRoomStateMember);
        RightPanelStore.instance.on(UPDATE_EVENT, this.onRightPanelStoreUpdate);
        this.initGroupStore(this.props.groupId);
    }

    public componentWillUnmount(): void {
        dis.unregister(this.dispatcherRef);
        if (this.context) {
            this.context.removeListener("RoomState.members", this.onRoomStateMember);
        }
        RightPanelStore.instance.off(UPDATE_EVENT, this.onRightPanelStoreUpdate);
        this.unregisterGroupStore();
    }

    // TODO: [REACT-WARNING] Replace with appropriate lifecycle event
    public UNSAFE_componentWillReceiveProps(newProps: IProps): void { // eslint-disable-line
        if (newProps.groupId !== this.props.groupId) {
            this.unregisterGroupStore();
            this.initGroupStore(newProps.groupId);
        }
    }

    private initGroupStore(groupId: string) {
        if (!groupId) return;
        GroupStore.registerListener(groupId, this.onGroupStoreUpdated);
    }

    private unregisterGroupStore() {
        GroupStore.unregisterListener(this.onGroupStoreUpdated);
    }

    private onGroupStoreUpdated = () => {
        this.setState({
            isUserPrivilegedInGroup: GroupStore.isUserPrivileged(this.props.groupId),
        });
    };

    private onRoomStateMember = (ev: MatrixEvent, state: RoomState, member: RoomMember) => {
        if (!this.props.room || member.roomId !== this.props.room.roomId) {
            return;
        }
        // redraw the badge on the membership list
        if (this.state.phase === RightPanelPhases.RoomMemberList && member.roomId === this.props.room.roomId) {
            this.delayedUpdate();
        } else if (this.state.phase === RightPanelPhases.RoomMemberInfo && member.roomId === this.props.room.roomId &&
            member.userId === this.state.member.userId) {
            // refresh the member info (e.g. new power level)
            this.delayedUpdate();
        }
    };
    private onRightPanelStoreUpdate = () => {
        const currentRoom = RightPanelStore.instance.currentPanel;
        this.setState({
            ...currentRoom.state,
            phase: currentRoom.phase,

        });
    };
    private onAction = (payload: ActionPayload) => {
        const isChangingRoom = payload.action === Action.ViewRoom && payload.room_id !== this.props.room.roomId;
        const isViewingThread = this.state.phase === RightPanelPhases.ThreadView;
        if (isChangingRoom && isViewingThread) {
            dispatchShowThreadsPanelEvent();
        }
    };

    private onClose = () => {
        // XXX: There are three different ways of 'closing' this panel depending on what state
        // things are in... this knows far more than it should do about the state of the rest
        // of the app and is generally a bit silly.
        if (this.props.member) {
            // If we have a user prop then we're displaying a user from the 'user' page type
            // in LoggedInView, so need to change the page type to close the panel (we switch
            // to the home page which is not obviously the correct thing to do, but I'm not sure
            // anything else is - we could hide the close button altogether?)
            dis.dispatch({
                action: "view_home_page",
            });
        } else if (
            this.state.phase === RightPanelPhases.EncryptionPanel &&
            this.state.verificationRequest && this.state.verificationRequest.pending
        ) {
            // When the user clicks close on the encryption panel cancel the pending request first if any
            this.state.verificationRequest.cancel();
        } else {
            // the RightPanelStore knows which mode room/group it is in, so we handle closing here
            RightPanelStore.instance.togglePanel();
        }
    };

    private onSearchQueryChanged = (searchQuery: string): void => {
        this.setState({ searchQuery });
    };

    public render(): JSX.Element {
        let panel = <div />;
        const roomId = this.props.room ? this.props.room.roomId : undefined;

        switch (this.state.phase) {
            case RightPanelPhases.RoomMemberList:
                if (roomId) {
                    panel = <MemberList
                        roomId={roomId}
                        key={roomId}
                        onClose={this.onClose}
                        searchQuery={this.state.searchQuery}
                        onSearchQueryChanged={this.onSearchQueryChanged}
                    />;
                }
                break;
            case RightPanelPhases.SpaceMemberList:
                panel = <MemberList
                    roomId={this.state.space ? this.state.space.roomId : roomId}
                    key={this.state.space ? this.state.space.roomId : roomId}
                    onClose={this.onClose}
                    searchQuery={this.state.searchQuery}
                    onSearchQueryChanged={this.onSearchQueryChanged}
                />;
                break;

            case RightPanelPhases.GroupMemberList:
                if (this.props.groupId) {
                    panel = <GroupMemberList groupId={this.props.groupId} key={this.props.groupId} />;
                }
                break;

            case RightPanelPhases.GroupRoomList:
                panel = <GroupRoomList groupId={this.props.groupId} key={this.props.groupId} />;
                break;

            case RightPanelPhases.RoomMemberInfo:
            case RightPanelPhases.SpaceMemberInfo:
            case RightPanelPhases.EncryptionPanel: {
                const roomMember = this.state.member instanceof RoomMember ? this.state.member: undefined;
                panel = <UserInfo
                    user={this.state.member}
                    room={this.context.getRoom(roomMember?.roomId) ?? this.props.room}
                    key={roomId || this.state.member.userId}
                    onClose={this.onClose}
                    phase={this.state.phase}
                    verificationRequest={this.state.verificationRequest}
                    verificationRequestPromise={this.state.verificationRequestPromise}
                />;
                break;
            }
            case RightPanelPhases.Room3pidMemberInfo:
            case RightPanelPhases.Space3pidMemberInfo:
                panel = <ThirdPartyMemberInfo event={this.state.threadHeadEvent} key={roomId} />;
                break;

            case RightPanelPhases.GroupMemberInfo:
                panel = <UserInfo
                    user={this.state.member}
                    groupId={this.props.groupId}
                    key={this.state.member.userId}
                    phase={this.state.phase}
                    onClose={this.onClose} />;
                break;

            case RightPanelPhases.GroupRoomInfo:
                panel = <GroupRoomInfo
                    groupRoomId={this.state.groupRoomId}
                    groupId={this.props.groupId}
                    key={this.state.groupRoomId} />;
                break;

            case RightPanelPhases.NotificationPanel:
                panel = <NotificationPanel onClose={this.onClose} />;
                break;

            case RightPanelPhases.PinnedMessages:
                if (SettingsStore.getValue("feature_pinning")) {
                    panel = <PinnedMessagesCard room={this.props.room} onClose={this.onClose} />;
                }
                break;
            case RightPanelPhases.Timeline:
                if (!SettingsStore.getValue("feature_maximised_widgets")) break;
                panel = <TimelineCard
                    classNames="mx_ThreadPanel mx_TimelineCard"
                    room={this.props.room}
                    timelineSet={this.props.room.getUnfilteredTimelineSet()}
                    resizeNotifier={this.props.resizeNotifier}
                    onClose={this.onClose}
                    permalinkCreator={this.props.permalinkCreator}
                    e2eStatus={this.props.e2eStatus}
                />;
                break;
            case RightPanelPhases.FilePanel:
                panel = <FilePanel roomId={roomId} resizeNotifier={this.props.resizeNotifier} onClose={this.onClose} />;
                break;

            case RightPanelPhases.ThreadView:
                panel = <ThreadView
                    room={this.props.room}
                    resizeNotifier={this.props.resizeNotifier}
                    onClose={this.onClose}
                    mxEvent={this.state.threadHeadEvent}
                    initialEvent={this.state.initialEvent}
                    isInitialEventHighlighted={this.state.isInitialEventHighlighted}
                    permalinkCreator={this.props.permalinkCreator}
                    e2eStatus={this.props.e2eStatus} />;
                break;

            case RightPanelPhases.ThreadPanel:
                panel = <ThreadPanel
                    roomId={roomId}
                    resizeNotifier={this.props.resizeNotifier}
                    onClose={this.onClose}
                    permalinkCreator={this.props.permalinkCreator}
                />;
                break;

            case RightPanelPhases.RoomSummary:
                panel = <RoomSummaryCard room={this.props.room} onClose={this.onClose} />;
                break;

            case RightPanelPhases.Widget:
                panel = <WidgetCard room={this.props.room} widgetId={this.state.widgetId} onClose={this.onClose} />;
                break;
        }

        return (
            <aside className="mx_RightPanel dark-panel" id="mx_RightPanel">
                { panel }
            </aside>
        );
    }
}
