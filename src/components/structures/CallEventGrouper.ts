/*
Copyright 2021 Šimon Brandner <simon.bra.ag@gmail.com>

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

import { EventType } from "matrix-js-sdk/src/@types/event";
import { MatrixEvent } from "matrix-js-sdk/src/models/event";
import { CallEvent, CallState, CallType, MatrixCall } from "matrix-js-sdk/src/webrtc/call";
import CallHandler, { CallHandlerEvent } from '../../CallHandler';
import { EventEmitter } from 'events';
import { MatrixClientPeg } from "../../MatrixClientPeg";
import defaultDispatcher from "../../dispatcher/dispatcher";

export enum CallEventGrouperEvent {
    StateChanged = "state_changed",
    SilencedChanged = "silenced_changed",
}

const SUPPORTED_STATES = [
    CallState.Connected,
    CallState.Connecting,
    CallState.Ringing,
];

export enum CustomCallState {
    Missed = "missed",
}

export default class CallEventGrouper extends EventEmitter {
    private events: Set<MatrixEvent> = new Set<MatrixEvent>();
    private call: MatrixCall;
    public state: CallState | CustomCallState;

    constructor() {
        super();

        CallHandler.sharedInstance().addListener(CallHandlerEvent.CallsChanged, this.setCall);
        CallHandler.sharedInstance().addListener(CallHandlerEvent.SilencedCallsChanged, this.onSilencedCallsChanged);
    }

    private get invite(): MatrixEvent {
        return [...this.events].find((event) => event.getType() === EventType.CallInvite);
    }

    private get hangup(): MatrixEvent {
        return [...this.events].find((event) => event.getType() === EventType.CallHangup);
    }

    private get reject(): MatrixEvent {
        return [...this.events].find((event) => event.getType() === EventType.CallReject);
    }

    public get isVoice(): boolean {
        const invite = this.invite;
        if (!invite) return;

        // FIXME: Find a better way to determine this from the event?
        if (invite.getContent()?.offer?.sdp?.indexOf('m=video') !== -1) return false;
        return true;
    }

    public get hangupReason(): string | null {
        return this.hangup?.getContent()?.reason;
    }

    /**
     * Returns true if there are only events from the other side - we missed the call
     */
    private get callWasMissed(): boolean {
        return ![...this.events].some((event) => event.sender?.userId === MatrixClientPeg.get().getUserId());
    }

    private get callId(): string {
        return [...this.events][0].getContent().call_id;
    }

    private onSilencedCallsChanged = () => {
        const newState = CallHandler.sharedInstance().isCallSilenced(this.callId);
        this.emit(CallEventGrouperEvent.SilencedChanged, newState);
    };

    public answerCall = () => {
        this.call?.answer();
    };

    public rejectCall = () => {
        this.call?.reject();
    };

    public callBack = () => {
        defaultDispatcher.dispatch({
            action: 'place_call',
            type: this.isVoice ? CallType.Voice : CallType.Video,
            room_id: [...this.events][0]?.getRoomId(),
        });
    };

    public toggleSilenced = () => {
        const silenced = CallHandler.sharedInstance().isCallSilenced(this.callId);
        silenced ?
            CallHandler.sharedInstance().unSilenceCall(this.callId) :
            CallHandler.sharedInstance().silenceCall(this.callId);
    };

    private setCallListeners() {
        if (!this.call) return;
        this.call.addListener(CallEvent.State, this.setState);
    }

    private setState = () => {
        if (SUPPORTED_STATES.includes(this.call?.state)) {
            this.state = this.call.state;
        } else {
            if (this.callWasMissed) this.state = CustomCallState.Missed;
            else if (this.reject) this.state = CallState.Ended;
            else if (this.hangup) this.state = CallState.Ended;
            else if (this.invite && this.call) this.state = CallState.Connecting;
        }
        this.emit(CallEventGrouperEvent.StateChanged, this.state);
    };

    private setCall = () => {
        if (this.call) return;

        this.call = CallHandler.sharedInstance().getCallById(this.callId);
        this.setCallListeners();
        this.setState();
    };

    public add(event: MatrixEvent) {
        this.events.add(event);
        this.setCall();
    }
}
