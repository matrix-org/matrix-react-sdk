import React from 'react';
import createReactClass from 'create-react-class';
import PropTypes from 'prop-types';
import RoomAvatar from '../views/avatars/RoomAvatar';
import AccessibleButton from '../views/elements/AccessibleButton';
import { _t } from '../../languageHandler';
import * as sdk from '../../index';
import classNames from 'classnames';
import SdkConfig from '../../SdkConfig'
import dis from '../../dispatcher';
import { MatrixClientPeg } from '../../MatrixClientPeg';
import VoiceChannelUtils from '../../VoiceChannelUtils'
//TODO: Need to import a singleton? something what is it?

// var JitsiMeetExternalAPI;
var activeChannel;
let script;
let loaded;

export default class VoiceChannelControls extends React.Component {
    dispatcherRef;

    constructor (props) {
        super(props);

        this.state = {
            isMicrophoneMuted: false,
            joined: false,
            joinError: false,
            roomId: null,
            participantId: null,
            showJitsiDebug: false
        };
        
    };

    componentDidMount() {
        this.dispatcherRef = dis.register(this._onAction);
        script = document.createElement('script');
        script.src = SdkConfig.get()['jitsi']['externalApiUrl'];
        script.async = true;
        //  script.onload = () => this.scriptLoaded();
        document.body.appendChild(script); //Need to remove on destroy?
    }

    componentWillUnmount() {
        dis.unregister(this.dispatcherRef)
        console.log('Voice channel component unregistered from dispatcher')
        if (activeChannel){
            //last one out sets room vc state
            activeChannel.dispose();
        } 
        document.body.removeChild(script)
    }

    _onAction = (payload) => {
        switch (payload.action) {
            case 'join_channel':
            console.log('VoiceChannel recieved joinchannel event', payload)
            this._joinChannel(payload.jitsiDomain, payload.confId, payload.roomId)
            break;
        }
    }

    _joinChannel(jitsiDomain, roomName, roomId) {
        console.log('Voice channel joining with', jitsiDomain, roomName)
        loaded = false;
        this.state.roomId = roomId
        this.state.joinError = false
        if (!jitsiDomain) jitsiDomain = SdkConfig.get()['jitsi']['preferredDomain'] //TODO: Or fail to join if no domain?
        activeChannel = new JitsiMeetExternalAPI(jitsiDomain, {
            width: '100%',
            height: '200px',
            parentNode: document.querySelector('#jitsiVoiceChannelWrapper'),
            roomName: roomName,
            interfaceConfigOverwrite: {
                SHOW_JITSI_WATERMARK: false,
                SHOW_WATERMARK_FOR_GUESTS: false,
                MAIN_TOOLBAR_BUTTONS: [],
                VIDEO_LAYOUT_FIT: "height"
            },
            onload: this._onLoad
        })
        this.setState(this.state)
    }

    _toggleMicMute = (changeTo) => {
        if (!activeChannel) return;
        activeChannel.isAudioMuted().then(muted => {
            if (muted !== changeTo) {
                this._channel('toggleAudio')
            }
        })
    }

    _leaveChannel = () => {
        console.log('Attempting to leave channel')
        //Try to leave jitsi gracefully
        this._channel('hangup')
        //Cleanup on this side
        //Call a settimeout to give time for a graceful exit?
        this._close()
    }

    //Click event for microphone button. Helps to keep microphone state consistent when changing voice channels
    _onMicClick = () => {
        console.log('Microphone muted:', this.state.isMicrophoneMuted);
        this.state.isMicrophoneMuted = !this.state.isMicrophoneMuted;
        this._toggleMicMute(this.state.isMicrophoneMuted)
        this.setState(this.state)
    };

    ///******************************************///
    ///*   Safe Jitsi API accessors / helpers   *///
    ///******************************************///

    _register = (eventName, callback) => {
        if (!activeChannel || !eventName || !callback) return;
        activeChannel.addListener(eventName, callback)
    }

    _channel = (command) => {
        if (!activeChannel) {
             console.log(`Could not execute voice channel command: ${command}. There is no active channel`)
             return;
        }
        activeChannel.executeCommand(command)
    }


    ///*******************************************///
    ///*         Jitsi callback handlers         *///
    ///*******************************************///

    //Jitsi widget loaded sucessfully. Not connected to conference yet
    _onLoad = () => {
        if (loaded) { //Has already loaded/jitsi failed to connect
        //TODO: Implement retry system
            this.state.joinError = true;
            this.setState(this.state);
            this._close();
            return
        }
        loaded = true;
        console.log('Channel loaded', activeChannel)
        this._toggleMicMute(this.state.isMicrophoneMuted)
        this._register('readyToClose', this._close)
        this._register('videoConferenceJoined', this._videoConferenceJoined)
        //TODO: register more flow control callbacks
        //state or props didnt change. need to update manually for connection data to update

        //TODO: remove following testing flow
        // const clientUserId = MatrixClientPeg.get().getUserId()
        // if (clientUserId) {
        //     const users = VoiceChannelUtils.getUsers(this.state.roomId)
        //     const participants = Object.keys(users)
        //     const participantId = Number(participants.length)
        //     console.log('VCC participantid', participantId)
        //     VoiceChannelUtils.addUser(this.state.roomId, {[participantId]: clientUserId})
        //     this.state.participantId = participantId
        //     this.setState(this.state)
        // } 
        console.log('VCC users',VoiceChannelUtils.getUsers(this.state.roomId))
        
        this.forceUpdate()
    }

    //User sucessfully joined jitsi conference
    //Update this.state and room state
    _videoConferenceJoined = (data) => {
        const {roomName, id, displayName, avatarUrl} = data //Data recieved from jitsi API callback

        //Update room info/state
        const clientUserId = MatrixClientPeg.get().getUserId()
        VoiceChannelUtils.addUser(this.state.roomId, {[id]: clientUserId})

        //Update client to state to reflect succesful join
        this.state.participantId = id
        this.state.joined = true
        this.setState(this.state)
        //TODO: Remove logging
        console.log('Joined channel successfully')
    }

    //User sucessfully left jitsi conference
    _videoConferenceLeft = (data) => {
        //const {roomName} = data
        //Update room/channel state to reflect this
        VoiceChannelUtils.removeUser(this.state.roomId, this.state.participantId)
        VoiceChannelUtils.removeUser(this.state.roomId, 0)
    }

    //Conference is ready to close, safe to clean-up
    _close = () => {
        VoiceChannelUtils.removeUser(this.state.roomId, this.state.participantId)
        console.log("Closing Voice Channel")
        this.state.participantId = null
        if (activeChannel) {
            activeChannel.dispose()
            activeChannel = null
        } else {
            this.state.joinError = false
            this.setState(this.state)
        }
        this.forceUpdate()
    }

    ///*******************************************///

    _showDebugClick = () => {
        this.state.showJitsiDebug = !this.state.showJitsiDebug
        this.setState(this.state)
    }

    render () {

        let channelState;
        let leaveButton;
        if (this.state.joinError) {
            channelState = "Connection Error"
        } else if (activeChannel) {
            if (this.state.joined) {
                channelState = "Connected"
            } else {
                channelState = "Connecting"
            }
            
            leaveButton = (
                <AccessibleButton className={'mx_VoiceChannelControls_button mx_VoiceChannelControls_leave'}
                   onClick={this._leaveChannel}
                    title={_t("Click to leave voice channel")}
                />
            )
        } else {
            channelState = "Not Connected"
        }

        const className = classNames({
            'mx_VoiceChannelControls_button': true,
            'mx_VoiceChannelControls_unmuted': this.state.isMicrophoneMuted,
            'mx_VoiceChannelControls_muted': !this.state.isMicrophoneMuted
        });

        const wrapperStyle = {
            display: this.state.showJitsiDebug ? 'block' : 'none',
        }

        //TODO: set jitsiwrapper to display: none
        return (
            <div className='mx_VoiceChannelControls'>
                <div onClick={this._showDebugClick}>{this.state.showJitsiDebug ? 'Hide' : 'Show'} jitsi debug</div>
                <div id="jitsiVoiceChannelWrapper" style={wrapperStyle}></div>
                <div className='mx_VoiceChannelControls_labelContainer' >
                    <div className='mx_VoiceChannelControls_label'>
                        { channelState }
                    </div>

                    <AccessibleButton className={className}
                                    onClick={this._onMicClick}
                                    title={this.state.isMicrophoneMuted ? _t("Click to unmute audio") : _t("Click to mute audio")}
                    />
                    { leaveButton }
                </div>
            </div>
        );
    };
}