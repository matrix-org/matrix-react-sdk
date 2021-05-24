/*
Copyright 2015, 2016 OpenMarket Ltd
Copyright 2019, 2020 The Matrix.org Foundation C.I.C.

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

import React, { createRef, CSSProperties } from 'react';
import dis from '../../../dispatcher/dispatcher';
import CallHandler from '../../../CallHandler';
import {MatrixClientPeg} from '../../../MatrixClientPeg';
import { _t, _td } from '../../../languageHandler';
import VideoFeed from './VideoFeed';
import RoomAvatar from "../avatars/RoomAvatar";
import { CallState, CallType, MatrixCall, CallEvent } from 'matrix-js-sdk/src/webrtc/call';
import classNames from 'classnames';
import AccessibleButton from '../elements/AccessibleButton';
import {isOnlyCtrlOrCmdKeyEvent, Key} from '../../../Keyboard';
import {alwaysAboveLeftOf, alwaysAboveRightOf, ChevronFace, ContextMenuButton} from '../../structures/ContextMenu';
import CallContextMenu from '../context_menus/CallContextMenu';
import { avatarUrlForMember } from '../../../Avatar';
import DialpadContextMenu from '../context_menus/DialpadContextMenu';
import { CallFeed } from 'matrix-js-sdk/src/webrtc/callFeed';
import {replaceableComponent} from "../../../utils/replaceableComponent";

interface IProps {
        // The call for us to display
        call: MatrixCall,

        // Another ongoing call to display information about
        secondaryCall?: MatrixCall,

        // a callback which is called when the content in the CallView changes
        // in a way that is likely to cause a resize.
        onResize?: any;

        // Whether this call view is for picture-in-picture mode
        // otherwise, it's the larger call view when viewing the room the call is in.
        // This is sort of a proxy for a number of things but we currently have no
        // need to control those things separately, so this is simpler.
        pipMode?: boolean;
}

interface IState {
    isLocalOnHold: boolean,
    isRemoteOnHold: boolean,
    micMuted: boolean,
    vidMuted: boolean,
    callState: CallState,
    controlsVisible: boolean,
    showMoreMenu: boolean,
    showDialpad: boolean,
    feeds: CallFeed[],
}

function getFullScreenElement() {
    return (
        document.fullscreenElement ||
        // moz omitted because firefox supports this unprefixed now (webkit here for safari)
        document.webkitFullscreenElement ||
        document.msFullscreenElement
    );
}

function requestFullscreen(element: Element) {
    const method = (
        element.requestFullscreen ||
        // moz omitted since firefox supports unprefixed now
        element.webkitRequestFullScreen ||
        element.msRequestFullscreen
    );
    if (method) method.call(element);
}

function exitFullscreen() {
    const exitMethod = (
        document.exitFullscreen ||
        document.webkitExitFullscreen ||
        document.msExitFullscreen
    );
    if (exitMethod) exitMethod.call(document);
}

const CONTROLS_HIDE_DELAY = 1000;
// Height of the header duplicated from CSS because we need to subtract it from our max
// height to get the max height of the video
const CONTEXT_MENU_VPADDING = 8; // How far the context menu sits above the button (px)

@replaceableComponent("views.voip.CallView")
export default class CallView extends React.Component<IProps, IState> {
    private dispatcherRef: string;
    private contentRef = createRef<HTMLDivElement>();
    private controlsHideTimer: number = null;
    private dialpadButton = createRef<HTMLDivElement>();
    private contextMenuButton = createRef<HTMLDivElement>();

    constructor(props: IProps) {
        super(props);

        this.state = {
            isLocalOnHold: this.props.call.isLocalOnHold(),
            isRemoteOnHold: this.props.call.isRemoteOnHold(),
            micMuted: this.props.call.isMicrophoneMuted(),
            vidMuted: this.props.call.isLocalVideoMuted(),
            callState: this.props.call.state,
            controlsVisible: true,
            showMoreMenu: false,
            showDialpad: false,
            feeds: this.props.call.getFeeds(),
        }

        this.updateCallListeners(null, this.props.call);
    }

    public componentDidMount() {
        this.dispatcherRef = dis.register(this.onAction);
        document.addEventListener('keydown', this.onNativeKeyDown);
    }

    public componentWillUnmount() {
        if (getFullScreenElement()) {
            exitFullscreen();
        }

        document.removeEventListener("keydown", this.onNativeKeyDown);
        this.updateCallListeners(this.props.call, null);
        dis.unregister(this.dispatcherRef);
    }

    public componentDidUpdate(prevProps) {
        if (this.props.call === prevProps.call) return;

        this.setState({
            isLocalOnHold: this.props.call.isLocalOnHold(),
            isRemoteOnHold: this.props.call.isRemoteOnHold(),
            micMuted: this.props.call.isMicrophoneMuted(),
            vidMuted: this.props.call.isLocalVideoMuted(),
            callState: this.props.call.state,
        });

        this.updateCallListeners(null, this.props.call);
    }

    private onAction = (payload) => {
        switch (payload.action) {
            case 'video_fullscreen': {
                if (!this.contentRef.current) {
                    return;
                }
                if (payload.fullscreen) {
                    requestFullscreen(this.contentRef.current);
                } else if (getFullScreenElement()) {
                    exitFullscreen();
                }
                break;
            }
        }
    };

    private updateCallListeners(oldCall: MatrixCall, newCall: MatrixCall) {
        if (oldCall === newCall) return;

        if (oldCall) {
            oldCall.removeListener(CallEvent.State, this.onCallState);
            oldCall.removeListener(CallEvent.LocalHoldUnhold, this.onCallLocalHoldUnhold);
            oldCall.removeListener(CallEvent.RemoteHoldUnhold, this.onCallRemoteHoldUnhold);
            oldCall.removeListener(CallEvent.FeedsChanged, this.onFeedsChanged);
        }
        if (newCall) {
            newCall.on(CallEvent.State, this.onCallState);
            newCall.on(CallEvent.LocalHoldUnhold, this.onCallLocalHoldUnhold);
            newCall.on(CallEvent.RemoteHoldUnhold, this.onCallRemoteHoldUnhold);
            newCall.on(CallEvent.FeedsChanged, this.onFeedsChanged);
        }
    }

    private onCallState = (state) => {
        this.setState({
            callState: state,
        });
    };

    private onFeedsChanged = (newFeeds: Array<CallFeed>) => {
        this.setState({feeds: newFeeds});
    };

    private onCallLocalHoldUnhold = () => {
        this.setState({
            isLocalOnHold: this.props.call.isLocalOnHold(),
        });
    };

    private onCallRemoteHoldUnhold = () => {
        this.setState({
            isRemoteOnHold: this.props.call.isRemoteOnHold(),
            // update both here because isLocalOnHold changes when we hold the call too
            isLocalOnHold: this.props.call.isLocalOnHold(),
        });
    };

    private onFullscreenClick = () => {
        dis.dispatch({
            action: 'video_fullscreen',
            fullscreen: true,
        });
    };

    private onExpandClick = () => {
        const userFacingRoomId = CallHandler.sharedInstance().roomIdForCall(this.props.call);
        dis.dispatch({
            action: 'view_room',
            room_id: userFacingRoomId,
        });
    };

    private onControlsHideTimer = () => {
        this.controlsHideTimer = null;
        this.setState({
            controlsVisible: false,
        });
    }

    private onMouseMove = () => {
        this.showControls();
    }

    private showControls() {
        if (this.state.showMoreMenu || this.state.showDialpad) return;

        if (!this.state.controlsVisible) {
            this.setState({
                controlsVisible: true,
            });
        }
        if (this.controlsHideTimer !== null) {
            clearTimeout(this.controlsHideTimer);
        }
        this.controlsHideTimer = window.setTimeout(this.onControlsHideTimer, CONTROLS_HIDE_DELAY);
    }

    private onDialpadClick = () => {
        if (!this.state.showDialpad) {
            if (this.controlsHideTimer) {
                clearTimeout(this.controlsHideTimer);
                this.controlsHideTimer = null;
            }

            this.setState({
                showDialpad: true,
                controlsVisible: true,
            });
        } else {
            if (this.controlsHideTimer !== null) {
                clearTimeout(this.controlsHideTimer);
            }
            this.controlsHideTimer = window.setTimeout(this.onControlsHideTimer, CONTROLS_HIDE_DELAY);

            this.setState({
                showDialpad: false,
            });
        }
    }

    private onMicMuteClick = () => {
        const newVal = !this.state.micMuted;

        this.props.call.setMicrophoneMuted(newVal);
        this.setState({micMuted: newVal});
    }

    private onVidMuteClick = () => {
        const newVal = !this.state.vidMuted;

        this.props.call.setLocalVideoMuted(newVal);
        this.setState({vidMuted: newVal});
    }

    private onMoreClick = () => {
        if (this.controlsHideTimer) {
            clearTimeout(this.controlsHideTimer);
            this.controlsHideTimer = null;
        }

        this.setState({
            showMoreMenu: true,
            controlsVisible: true,
        });
    }

    private closeDialpad = () => {
        this.setState({
            showDialpad: false,
        });
        this.controlsHideTimer = window.setTimeout(this.onControlsHideTimer, CONTROLS_HIDE_DELAY);
    }

    private closeContextMenu = () => {
        this.setState({
            showMoreMenu: false,
        });
        this.controlsHideTimer = window.setTimeout(this.onControlsHideTimer, CONTROLS_HIDE_DELAY);
    }

    // we register global shortcuts here, they *must not conflict* with local shortcuts elsewhere or both will fire
    // Note that this assumes we always have a CallView on screen at any given time
    // CallHandler would probably be a better place for this
    private onNativeKeyDown = ev => {
        let handled = false;
        const ctrlCmdOnly = isOnlyCtrlOrCmdKeyEvent(ev);

        switch (ev.key) {
            case Key.D:
                if (ctrlCmdOnly) {
                    this.onMicMuteClick();
                    // show the controls to give feedback
                    this.showControls();
                    handled = true;
                }
                break;

            case Key.E:
                if (ctrlCmdOnly) {
                    this.onVidMuteClick();
                    // show the controls to give feedback
                    this.showControls();
                    handled = true;
                }
                break;
        }

        if (handled) {
            ev.stopPropagation();
            ev.preventDefault();
        }
    };

    private onRoomAvatarClick = () => {
        const userFacingRoomId = CallHandler.sharedInstance().roomIdForCall(this.props.call);
        dis.dispatch({
            action: 'view_room',
            room_id: userFacingRoomId,
        });
    }

    private onSecondaryRoomAvatarClick = () => {
        const userFacingRoomId = CallHandler.sharedInstance().roomIdForCall(this.props.secondaryCall);

        dis.dispatch({
            action: 'view_room',
            room_id: userFacingRoomId,
        });
    }

    private onCallResumeClick = () => {
        const userFacingRoomId = CallHandler.sharedInstance().roomIdForCall(this.props.call);
        CallHandler.sharedInstance().setActiveCallRoomId(userFacingRoomId);
    }

    private onTransferClick = () => {
        const transfereeCall = CallHandler.sharedInstance().getTransfereeForCallId(this.props.call.callId);
        this.props.call.transferToCall(transfereeCall);
    }

    public render() {
        const client = MatrixClientPeg.get();
        const callRoomId = CallHandler.sharedInstance().roomIdForCall(this.props.call);
        const secondaryCallRoomId = CallHandler.sharedInstance().roomIdForCall(this.props.secondaryCall);
        const callRoom = client.getRoom(callRoomId);
        const secCallRoom = this.props.secondaryCall ? client.getRoom(secondaryCallRoomId) : null;

        let dialPad;
        let contextMenu;

        if (this.state.showDialpad) {
            dialPad = <DialpadContextMenu
                {...alwaysAboveRightOf(
                    this.dialpadButton.current.getBoundingClientRect(),
                    ChevronFace.None,
                    CONTEXT_MENU_VPADDING,
                )}
                onFinished={this.closeDialpad}
                call={this.props.call}
            />;
        }

        if (this.state.showMoreMenu) {
            contextMenu = <CallContextMenu
                {...alwaysAboveLeftOf(
                    this.contextMenuButton.current.getBoundingClientRect(),
                    ChevronFace.None,
                    CONTEXT_MENU_VPADDING,
                )}
                onFinished={this.closeContextMenu}
                call={this.props.call}
            />;
        }

        const micClasses = classNames({
            mx_CallView_callControls_button: true,
            mx_CallView_callControls_button_micOn: !this.state.micMuted,
            mx_CallView_callControls_button_micOff: this.state.micMuted,
        });

        const vidClasses = classNames({
            mx_CallView_callControls_button: true,
            mx_CallView_callControls_button_vidOn: !this.state.vidMuted,
            mx_CallView_callControls_button_vidOff: this.state.vidMuted,
        });

        // Put the other states of the mic/video icons in the document to make sure they're cached
        // (otherwise the icon disappears briefly when toggled)
        const micCacheClasses = classNames({
            mx_CallView_callControls_button: true,
            mx_CallView_callControls_button_micOn: this.state.micMuted,
            mx_CallView_callControls_button_micOff: !this.state.micMuted,
            mx_CallView_callControls_button_invisible: true,
        });

        const vidCacheClasses = classNames({
            mx_CallView_callControls_button: true,
            mx_CallView_callControls_button_vidOn: this.state.micMuted,
            mx_CallView_callControls_button_vidOff: !this.state.micMuted,
            mx_CallView_callControls_button_invisible: true,
        });

        const callControlsClasses = classNames({
            mx_CallView_callControls: true,
            mx_CallView_callControls_hidden: !this.state.controlsVisible,
        });

        const vidMuteButton = this.props.call.type === CallType.Video ? <AccessibleButton
            className={vidClasses}
            onClick={this.onVidMuteClick}
        /> : null;

        // The dial pad & 'more' button actions are only relevant in a connected call
        // When not connected, we have to put something there to make the flexbox alignment correct
        const dialpadButton = this.state.callState === CallState.Connected ? <ContextMenuButton
            className="mx_CallView_callControls_button mx_CallView_callControls_dialpad"
            inputRef={this.dialpadButton}
            onClick={this.onDialpadClick}
            isExpanded={this.state.showDialpad}
        /> : <div className="mx_CallView_callControls_button mx_CallView_callControls_button_dialpad_hidden" />;

        const contextMenuButton = this.state.callState === CallState.Connected ? <ContextMenuButton
            className="mx_CallView_callControls_button mx_CallView_callControls_button_more"
            onClick={this.onMoreClick}
            inputRef={this.contextMenuButton}
            isExpanded={this.state.showMoreMenu}
        /> : <div className="mx_CallView_callControls_button mx_CallView_callControls_button_more_hidden" />;

        // in the near future, the dial pad button will go on the left. For now, it's the nothing button
        // because something needs to have margin-right: auto to make the alignment correct.
        const callControls = <div className={callControlsClasses}>
            {dialpadButton}
            <AccessibleButton
                className={micClasses}
                onClick={this.onMicMuteClick}
            />
            <AccessibleButton
                className="mx_CallView_callControls_button mx_CallView_callControls_button_hangup"
                onClick={() => {
                    dis.dispatch({
                        action: 'hangup',
                        room_id: callRoomId,
                    });
                }}
            />
            {vidMuteButton}
            <div className={micCacheClasses} />
            <div className={vidCacheClasses} />
            {contextMenuButton}
        </div>;

        const avatarSize = this.props.pipMode ? 76 : 160;

        // The 'content' for the call, ie. the videos for a video call and profile picture
        // for voice calls (fills the bg)
        let contentView: React.ReactNode;

        const transfereeCall = CallHandler.sharedInstance().getTransfereeForCallId(this.props.call.callId);
        const isOnHold = this.state.isLocalOnHold || this.state.isRemoteOnHold;
        let holdTransferContent;
        if (transfereeCall) {
            const transferTargetRoom = MatrixClientPeg.get().getRoom(
                CallHandler.sharedInstance().roomIdForCall(this.props.call),
            );
            const transferTargetName = transferTargetRoom ? transferTargetRoom.name : _t("unknown person");

            const transfereeRoom = MatrixClientPeg.get().getRoom(
                CallHandler.sharedInstance().roomIdForCall(transfereeCall),
            );
            const transfereeName = transfereeRoom ? transfereeRoom.name : _t("unknown person");

            holdTransferContent = <div className="mx_CallView_holdTransferContent">
                {_t(
                    "Consulting with %(transferTarget)s. <a>Transfer to %(transferee)s</a>",
                    {
                        transferTarget: transferTargetName,
                        transferee: transfereeName,
                    },
                    {
                        a: sub => <AccessibleButton kind="link" onClick={this.onTransferClick}>{sub}</AccessibleButton>,
                    },
                )}
            </div>;
        } else if (isOnHold) {
            let onHoldText = null;
            if (this.state.isRemoteOnHold) {
                const holdString = CallHandler.sharedInstance().hasAnyUnheldCall() ?
                    _td("You held the call <a>Switch</a>") : _td("You held the call <a>Resume</a>");
                onHoldText = _t(holdString, {}, {
                    a: sub => <AccessibleButton kind="link" onClick={this.onCallResumeClick}>
                        {sub}
                    </AccessibleButton>,
                });
            } else if (this.state.isLocalOnHold) {
                onHoldText = _t("%(peerName)s held the call", {
                    peerName: this.props.call.getOpponentMember().name,
                });
            }
            holdTransferContent = <div className="mx_CallView_holdTransferContent">
                {onHoldText}
            </div>;
        }

        // This is a bit messy. I can't see a reason to have two onHold/transfer screens
        if (isOnHold || transfereeCall) {
            if (this.props.call.type === CallType.Video) {
                const containerClasses = classNames({
                    mx_CallView_content: true,
                    mx_CallView_video: true,
                    mx_CallView_video_hold: isOnHold,
                });
                let onHoldBackground = null;
                const backgroundStyle: CSSProperties = {};
                const backgroundAvatarUrl = avatarUrlForMember(
                // is it worth getting the size of the div to pass here?
                    this.props.call.getOpponentMember(), 1024, 1024, 'crop',
                );
                backgroundStyle.backgroundImage = 'url(' + backgroundAvatarUrl + ')';
                onHoldBackground = <div className="mx_CallView_video_holdBackground" style={backgroundStyle} />;

                contentView = (
                    <div className={containerClasses} ref={this.contentRef} onMouseMove={this.onMouseMove}>
                        {onHoldBackground}
                        {holdTransferContent}
                        {callControls}
                    </div>
                );
            } else {
                const classes = classNames({
                    mx_CallView_content: true,
                    mx_CallView_voice: true,
                    mx_CallView_voice_hold: isOnHold,
                });

                contentView =(
                    <div className={classes} onMouseMove={this.onMouseMove}>
                        <div className="mx_CallView_voice_avatarsContainer">
                            <div
                                className="mx_CallView_voice_avatarContainer"
                                style={{width: avatarSize, height: avatarSize}}
                            >
                                <RoomAvatar
                                    room={callRoom}
                                    height={avatarSize}
                                    width={avatarSize}
                                />
                            </div>
                        </div>
                        {holdTransferContent}
                        {callControls}
                    </div>
                );
            }
        } else if (this.props.call.noIncomingFeeds()) {
            // Here we're reusing the css classes from voice on hold, because
            // I am lazy. If this gets merged, the CallView might be subject
            // to change anyway - I might take an axe to this file in order to
            // try to get other things working
            const classes = classNames({
                mx_CallView_content: true,
                mx_CallView_voice: true,
            });

            const feeds = this.props.call.getLocalFeeds().map((feed, i) => {
                // Here we check to hide local audio feeds to achieve the same UI/UX
                // as before. But once again this might be subject to change
                if (feed.isVideoMuted()) return;
                return (
                    <VideoFeed
                        key={i}
                        feed={feed}
                        call={this.props.call}
                        pipMode={this.props.pipMode}
                        onResize={this.props.onResize}
                    />
                );
            });

            // Saying "Connecting" here isn't really true, but the best thing
            // I can come up with, but this might be subject to change as well
            contentView = <div className={classes} onMouseMove={this.onMouseMove}>
                {feeds}
                <div className="mx_CallView_voice_avatarsContainer">
                    <div className="mx_CallView_voice_avatarContainer" style={{width: avatarSize, height: avatarSize}}>
                        <RoomAvatar
                            room={callRoom}
                            height={avatarSize}
                            width={avatarSize}
                        />
                    </div>
                </div>
                <div className="mx_CallView_holdTransferContent">{_t("Connecting")}</div>
                {callControls}
            </div>;
        } else {
            const containerClasses = classNames({
                mx_CallView_content: true,
                mx_CallView_video: true,
            });

            // TODO: Later the CallView should probably be reworked to support
            // any number of feeds but now we can always expect there to be two
            // feeds. This is because the js-sdk ignores any new incoming streams
            const feeds = this.state.feeds.map((feed, i) => {
                // Here we check to hide local audio feeds to achieve the same UI/UX
                // as before. But once again this might be subject to change
                if (feed.isVideoMuted() && feed.isLocal()) return;
                return (
                    <VideoFeed
                        key={i}
                        feed={feed}
                        call={this.props.call}
                        pipMode={this.props.pipMode}
                        onResize={this.props.onResize}
                    />
                );
            });

            contentView = <div className={containerClasses} ref={this.contentRef} onMouseMove={this.onMouseMove}>
                {feeds}
                {callControls}
            </div>;
        }

        const callTypeText = this.props.call.type === CallType.Video ? _t("Video Call") : _t("Voice Call");
        let myClassName;

        let fullScreenButton;
        if (this.props.call.type === CallType.Video && !this.props.pipMode) {
            fullScreenButton = <div className="mx_CallView_header_button mx_CallView_header_button_fullscreen"
                onClick={this.onFullscreenClick} title={_t("Fill Screen")}
            />;
        }

        let expandButton;
        if (this.props.pipMode) {
            expandButton = <div className="mx_CallView_header_button mx_CallView_header_button_expand"
                onClick={this.onExpandClick} title={_t("Return to call")}
            />;
        }

        const headerControls = <div className="mx_CallView_header_controls">
            {fullScreenButton}
            {expandButton}
        </div>;

        let header: React.ReactNode;
        if (!this.props.pipMode) {
            header = <div className="mx_CallView_header">
                <div className="mx_CallView_header_phoneIcon"></div>
                <span className="mx_CallView_header_callType">{callTypeText}</span>
                {headerControls}
            </div>;
            myClassName = 'mx_CallView_large';
        } else {
            let secondaryCallInfo;
            if (this.props.secondaryCall) {
                secondaryCallInfo = <span className="mx_CallView_header_secondaryCallInfo">
                    <AccessibleButton element='span' onClick={this.onSecondaryRoomAvatarClick}>
                        <RoomAvatar room={secCallRoom} height={16} width={16} />
                        <span className="mx_CallView_secondaryCall_roomName">
                            {_t("%(name)s on hold", { name: secCallRoom.name })}
                        </span>
                    </AccessibleButton>
                </span>;
            }

            header = <div className="mx_CallView_header">
                <AccessibleButton onClick={this.onRoomAvatarClick}>
                    <RoomAvatar room={callRoom} height={32} width={32} />
                </AccessibleButton>
                <div className="mx_CallView_header_callInfo">
                    <div className="mx_CallView_header_roomName">{callRoom.name}</div>
                    <div className="mx_CallView_header_callTypeSmall">
                        {callTypeText}
                        {secondaryCallInfo}
                    </div>
                </div>
                {headerControls}
            </div>;
            myClassName = 'mx_CallView_pip';
        }

        return <div className={"mx_CallView " + myClassName}>
            {header}
            {contentView}
            {dialPad}
            {contextMenu}
        </div>;
    }
}
