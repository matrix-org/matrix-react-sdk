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
//Need to import a singleton something what is it?

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
            // js-sdk Room object
            room: PropTypes.object,
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
            this._joinChannel(payload.jitsiDomain, payload.confId)
            break;
        }
    }

    _joinChannel(jitsiDomain, roomName) {
        console.log('Voice channel joining with', jitsiDomain, roomName)
        loaded = false;
        this.state.joinError = false
        if (!jitsiDomain) jitsiDomain = SdkConfig.get()['jitsi']['preferredDomain'] //TODO: Or fail to join if no domain?
        activeChannel = new JitsiMeetExternalAPI(jitsiDomain, {
            width: 0,
            height: 0,
            parentNode: document.querySelector('#jitsiVoiceChannelWrapper'),
            roomName: roomName,
            interfaceConfigOverwrite: {
            SHOW_JITSI_WATERMARK: false,
            SHOW_WATERMARK_FOR_GUESTS: false,
            MAIN_TOOLBAR_BUTTONS: [],
            VIDEO_LAYOUT_FIT: "height",
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
        this._close()
    }

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
        this.toggleMicMute(this.state.isMicrophoneMuted)
        this._register('readyToClose', this._close)
        this._register('videoConferenceJoined', this._onJoin)
        //TODO: register more flow control callbacks
        //state or props didnt change. need to update manually for connection data to update
        this.forceUpdate()
    }

    _onJoin = () => {
        this.state.joined = true
        this.setState(this.state)
        console.log('Joined channel successfully')
    }

    _close = () => {
        console.log("Closing Voice Channel")
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

        return (
            <div className='mx_VoiceChannelControls'>
                <div id="jitsiVoiceChannelWrapper"></div>
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