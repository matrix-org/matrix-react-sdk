/*
Copyright 2015-2021 The Matrix.org Foundation C.I.C.

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
import React, { createRef } from 'react';
import classNames from 'classnames';
import { MatrixEvent, IEventRelation } from "matrix-js-sdk/src/models/event";
import { Room } from "matrix-js-sdk/src/models/room";
import { RoomMember } from "matrix-js-sdk/src/models/room-member";
import { RelationType } from 'matrix-js-sdk/src/@types/event';

import { _t } from '../../../languageHandler';
import { MatrixClientPeg } from '../../../MatrixClientPeg';
import dis from '../../../dispatcher/dispatcher';
import { ActionPayload } from "../../../dispatcher/payloads";
import Stickerpicker from './Stickerpicker';
import { makeRoomPermalink, RoomPermalinkCreator } from '../../../utils/permalinks/Permalinks';
import E2EIcon from './E2EIcon';
import SettingsStore from "../../../settings/SettingsStore";
import { aboveLeftOf, AboveLeftOf } from "../../structures/ContextMenu";
import AccessibleTooltipButton from "../elements/AccessibleTooltipButton";
import ReplyPreview from "./ReplyPreview";
import { UPDATE_EVENT } from "../../../stores/AsyncStore";
import { replaceableComponent } from "../../../utils/replaceableComponent";
import VoiceRecordComposerTile from "./VoiceRecordComposerTile";
import { VoiceRecordingStore } from "../../../stores/VoiceRecordingStore";
import { RecordingState } from "../../../audio/VoiceRecording";
import Tooltip, { Alignment } from "../elements/Tooltip";
import ResizeNotifier from "../../../utils/ResizeNotifier";
import { E2EStatus } from '../../../utils/ShieldUtils';
import SendMessageComposer, { SendMessageComposer as SendMessageComposerClass } from "./SendMessageComposer";
import { ComposerInsertPayload } from "../../../dispatcher/payloads/ComposerInsertPayload";
import { Action } from "../../../dispatcher/actions";
import EditorModel from "../../../editor/model";
import UIStore, { UI_EVENTS } from '../../../stores/UIStore';
import RoomContext from '../../../contexts/RoomContext';
import { SettingUpdatedPayload } from "../../../dispatcher/payloads/SettingUpdatedPayload";
import MessageComposerButtons from './MessageComposerButtons';

let instanceCount = 0;
const NARROW_MODE_BREAKPOINT = 500;

interface ISendButtonProps {
    onClick: () => void;
    title?: string; // defaults to something generic
}

function SendButton(props: ISendButtonProps) {
    return (
        <AccessibleTooltipButton
            className="mx_MessageComposer_sendMessage"
            onClick={props.onClick}
            title={props.title ?? _t('Send message')}
        />
    );
}

interface IProps {
    room: Room;
    resizeNotifier: ResizeNotifier;
    permalinkCreator: RoomPermalinkCreator;
    replyToEvent?: MatrixEvent;
    relation?: IEventRelation;
    e2eStatus?: E2EStatus;
    compact?: boolean;
}

interface IState {
    tombstone: MatrixEvent;
    canSendMessages: boolean;
    isComposerEmpty: boolean;
    haveRecording: boolean;
    recordingTimeLeftSeconds?: number;
    me?: RoomMember;
    narrowMode?: boolean;
    isMenuOpen: boolean;
    isStickerPickerOpen: boolean;
    showStickersButton: boolean;
}

@replaceableComponent("views.rooms.MessageComposer")
export default class MessageComposer extends React.Component<IProps, IState> {
    private dispatcherRef: string;
    private messageComposerInput = createRef<SendMessageComposerClass>();
    private voiceRecordingButton = createRef<VoiceRecordComposerTile>();
    private ref: React.RefObject<HTMLDivElement> = createRef();
    private instanceId: number;

    static contextType = RoomContext;
    public context!: React.ContextType<typeof RoomContext>;

    static defaultProps = {
        compact: false,
    };

    constructor(props: IProps) {
        super(props);
        VoiceRecordingStore.instance.on(UPDATE_EVENT, this.onVoiceStoreUpdate);

        this.state = {
            tombstone: this.getRoomTombstone(),
            canSendMessages: this.props.room.maySendMessage(),
            isComposerEmpty: true,
            haveRecording: false,
            recordingTimeLeftSeconds: null, // when set to a number, shows a toast
            isMenuOpen: false,
            isStickerPickerOpen: false,
            showStickersButton: SettingsStore.getValue("MessageComposerInput.showStickersButton"),
        };

        this.instanceId = instanceCount++;

        SettingsStore.monitorSetting("MessageComposerInput.showStickersButton", null);
    }

    componentDidMount() {
        this.dispatcherRef = dis.register(this.onAction);
        MatrixClientPeg.get().on("RoomState.events", this.onRoomStateEvents);
        this.waitForOwnMember();
        UIStore.instance.trackElementDimensions(`MessageComposer${this.instanceId}`, this.ref.current);
        UIStore.instance.on(`MessageComposer${this.instanceId}`, this.onResize);
    }

    private onResize = (type: UI_EVENTS, entry: ResizeObserverEntry) => {
        if (type === UI_EVENTS.Resize) {
            const narrowMode = entry.contentRect.width <= NARROW_MODE_BREAKPOINT;
            this.setState({
                narrowMode,
                isMenuOpen: !narrowMode ? false : this.state.isMenuOpen,
                isStickerPickerOpen: false,
            });
        }
    };

    private onAction = (payload: ActionPayload) => {
        switch (payload.action) {
            case "reply_to_event":
                if (payload.context === this.context.timelineRenderingType) {
                    // add a timeout for the reply preview to be rendered, so
                    // that the ScrollPanel listening to the resizeNotifier can
                    // correctly measure it's new height and scroll down to keep
                    // at the bottom if it already is
                    setTimeout(() => {
                        this.props.resizeNotifier.notifyTimelineHeightChanged();
                    }, 100);
                }
                break;

            case Action.SettingUpdated: {
                const settingUpdatedPayload = payload as SettingUpdatedPayload;
                switch (settingUpdatedPayload.settingName) {
                    case "MessageComposerInput.showStickersButton": {
                        const showStickersButton = SettingsStore.getValue("MessageComposerInput.showStickersButton");
                        if (this.state.showStickersButton !== showStickersButton) {
                            this.setState({ showStickersButton });
                        }
                        break;
                    }
                }
            }
        }
    };

    private waitForOwnMember() {
        // if we have the member already, do that
        const me = this.props.room.getMember(MatrixClientPeg.get().getUserId());
        if (me) {
            this.setState({ me });
            return;
        }
        // Otherwise, wait for member loading to finish and then update the member for the avatar.
        // The members should already be loading, and loadMembersIfNeeded
        // will return the promise for the existing operation
        this.props.room.loadMembersIfNeeded().then(() => {
            const me = this.props.room.getMember(MatrixClientPeg.get().getUserId());
            this.setState({ me });
        });
    }

    componentWillUnmount() {
        if (MatrixClientPeg.get()) {
            MatrixClientPeg.get().removeListener("RoomState.events", this.onRoomStateEvents);
        }
        VoiceRecordingStore.instance.off(UPDATE_EVENT, this.onVoiceStoreUpdate);
        dis.unregister(this.dispatcherRef);
        UIStore.instance.stopTrackingElementDimensions(`MessageComposer${this.instanceId}`);
        UIStore.instance.removeListener(`MessageComposer${this.instanceId}`, this.onResize);
    }

    private onRoomStateEvents = (ev, state) => {
        if (ev.getRoomId() !== this.props.room.roomId) return;

        if (ev.getType() === 'm.room.tombstone') {
            this.setState({ tombstone: this.getRoomTombstone() });
        }
        if (ev.getType() === 'm.room.power_levels') {
            this.setState({ canSendMessages: this.props.room.maySendMessage() });
        }
    };

    private getRoomTombstone() {
        return this.props.room.currentState.getStateEvents('m.room.tombstone', '');
    }

    private onTombstoneClick = (ev) => {
        ev.preventDefault();

        const replacementRoomId = this.state.tombstone.getContent()['replacement_room'];
        const replacementRoom = MatrixClientPeg.get().getRoom(replacementRoomId);
        let createEventId = null;
        if (replacementRoom) {
            const createEvent = replacementRoom.currentState.getStateEvents('m.room.create', '');
            if (createEvent && createEvent.getId()) createEventId = createEvent.getId();
        }

        const viaServers = [this.state.tombstone.getSender().split(':').slice(1).join(':')];
        dis.dispatch({
            action: Action.ViewRoom,
            highlighted: true,
            event_id: createEventId,
            room_id: replacementRoomId,
            auto_join: true,
            _type: "tombstone", // instrumentation

            // Try to join via the server that sent the event. This converts @something:example.org
            // into a server domain by splitting on colons and ignoring the first entry ("@something").
            via_servers: viaServers,
            opts: {
                // These are passed down to the js-sdk's /join call
                viaServers: viaServers,
            },
        });
    };

    private renderPlaceholderText = () => {
        if (this.props.replyToEvent) {
            const replyingToThread = this.props.relation?.rel_type === RelationType.Thread;
            if (replyingToThread && this.props.e2eStatus) {
                return _t('Reply to encrypted thread…');
            } else if (replyingToThread) {
                return _t('Reply to thread…');
            } else if (this.props.e2eStatus) {
                return _t('Send an encrypted reply…');
            } else {
                return _t('Send a reply…');
            }
        } else {
            if (this.props.e2eStatus) {
                return _t('Send an encrypted message…');
            } else {
                return _t('Send a message…');
            }
        }
    };

    private addEmoji = (emoji: string): boolean => {
        dis.dispatch<ComposerInsertPayload>({
            action: Action.ComposerInsert,
            text: emoji,
            timelineRenderingType: this.context.timelineRenderingType,
        });
        return true;
    };

    private sendMessage = async () => {
        if (this.state.haveRecording && this.voiceRecordingButton.current) {
            // There shouldn't be any text message to send when a voice recording is active, so
            // just send out the voice recording.
            await this.voiceRecordingButton.current?.send();
            return;
        }

        this.messageComposerInput.current?.sendMessage();
    };

    private onChange = (model: EditorModel) => {
        this.setState({
            isComposerEmpty: model.isEmpty,
        });
    };

    private onVoiceStoreUpdate = () => {
        const recording = VoiceRecordingStore.instance.activeRecording;
        if (recording) {
            // Delay saying we have a recording until it is started, as we might not yet have A/V permissions
            recording.on(RecordingState.Started, () => {
                this.setState({ haveRecording: !!VoiceRecordingStore.instance.activeRecording });
            });
            // We show a little heads up that the recording is about to automatically end soon. The 3s
            // display time is completely arbitrary. Note that we don't need to deregister the listener
            // because the recording instance will clean that up for us.
            recording.on(RecordingState.EndingSoon, ({ secondsLeft }) => {
                this.setState({ recordingTimeLeftSeconds: secondsLeft });
                setTimeout(() => this.setState({ recordingTimeLeftSeconds: null }), 3000);
            });
        } else {
            this.setState({ haveRecording: false });
        }
    };

    private setStickerPickerOpen = (isStickerPickerOpen: boolean) => {
        this.setState({
            isStickerPickerOpen,
            isMenuOpen: false,
        });
    };

    private toggleButtonMenu = (): void => {
        this.setState({
            isMenuOpen: !this.state.isMenuOpen,
        });
    };

    render() {
        const controls = [
            this.props.e2eStatus ?
                <E2EIcon key="e2eIcon" status={this.props.e2eStatus} className="mx_MessageComposer_e2eIcon" /> :
                null,
        ];

        let menuPosition: AboveLeftOf | undefined;
        if (this.ref.current) {
            const contentRect = this.ref.current.getBoundingClientRect();
            menuPosition = aboveLeftOf(contentRect);
        }

        if (!this.state.tombstone && this.state.canSendMessages) {
            controls.push(
                <SendMessageComposer
                    ref={this.messageComposerInput}
                    key="controls_input"
                    room={this.props.room}
                    placeholder={this.renderPlaceholderText()}
                    permalinkCreator={this.props.permalinkCreator}
                    relation={this.props.relation}
                    replyToEvent={this.props.replyToEvent}
                    onChange={this.onChange}
                    disabled={this.state.haveRecording}
                />,
            );

            controls.push(<VoiceRecordComposerTile
                key="controls_voice_record"
                ref={this.voiceRecordingButton}
                room={this.props.room} />);
        } else if (this.state.tombstone) {
            const replacementRoomId = this.state.tombstone.getContent()['replacement_room'];

            const continuesLink = replacementRoomId ? (
                <a href={makeRoomPermalink(replacementRoomId)}
                    className="mx_MessageComposer_roomReplaced_link"
                    onClick={this.onTombstoneClick}
                >
                    { _t("The conversation continues here.") }
                </a>
            ) : '';

            controls.push(<div className="mx_MessageComposer_replaced_wrapper" key="room_replaced">
                <div className="mx_MessageComposer_replaced_valign">
                    <img className="mx_MessageComposer_roomReplaced_icon"
                        src={require("../../../../res/img/room_replaced.svg")}
                    />
                    <span className="mx_MessageComposer_roomReplaced_header">
                        { _t("This room has been replaced and is no longer active.") }
                    </span><br />
                    { continuesLink }
                </div>
            </div>);
        } else {
            controls.push(
                <div key="controls_error" className="mx_MessageComposer_noperm_error">
                    { _t('You do not have permission to post to this room') }
                </div>,
            );
        }

        let recordingTooltip;
        const secondsLeft = Math.round(this.state.recordingTimeLeftSeconds);
        if (secondsLeft) {
            recordingTooltip = <Tooltip
                label={_t("%(seconds)ss left", { seconds: secondsLeft })}
                alignment={Alignment.Top}
                yOffset={-50}
            />;
        }

        const threadId = this.props.relation?.rel_type === RelationType.Thread
            ? this.props.relation.event_id
            : null;

        controls.push(
            <Stickerpicker
                room={this.props.room}
                threadId={threadId}
                isStickerPickerOpen={this.state.isStickerPickerOpen}
                setStickerPickerOpen={this.setStickerPickerOpen}
                menuPosition={menuPosition}
                key="stickers"
            />,
        );

        const showSendButton = !this.state.isComposerEmpty || this.state.haveRecording;

        const classes = classNames({
            "mx_MessageComposer": true,
            "mx_GroupLayout": true,
            "mx_MessageComposer--compact": this.props.compact,
            "mx_MessageComposer_e2eStatus": this.props.e2eStatus != undefined,
        });

        return (
            <div className={classes} ref={this.ref}>
                { recordingTooltip }
                <div className="mx_MessageComposer_wrapper">
                    <ReplyPreview
                        replyToEvent={this.props.replyToEvent}
                        permalinkCreator={this.props.permalinkCreator} />
                    <div className="mx_MessageComposer_row">
                        { controls }
                        <MessageComposerButtons
                            addEmoji={this.addEmoji}
                            haveRecording={this.state.haveRecording}
                            isMenuOpen={this.state.isMenuOpen}
                            isStickerPickerOpen={this.state.isStickerPickerOpen}
                            menuPosition={menuPosition}
                            narrowMode={this.state.narrowMode}
                            relation={this.props.relation}
                            onRecordStartEndClick={() => {
                                this.voiceRecordingButton.current?.onRecordStartEndClick();
                                if (this.state.narrowMode) {
                                    this.toggleButtonMenu();
                                }
                            }}
                            setStickerPickerOpen={this.setStickerPickerOpen}
                            showLocationButton={!window.electron}
                            showStickersButton={this.state.showStickersButton}
                            toggleButtonMenu={this.toggleButtonMenu}
                        />
                        { showSendButton && (
                            <SendButton
                                key="controls_send"
                                onClick={this.sendMessage}
                                title={this.state.haveRecording ? _t("Send voice message") : undefined}
                            />
                        ) }
                    </div>
                </div>
            </div>
        );
    }
}
