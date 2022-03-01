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
import { EventEmitter } from 'events';

import CallHandler, { CallHandlerEvent } from '../../CallHandler';
import { MatrixClientPeg } from "../../MatrixClientPeg";

export enum CallEventGrouperEvent {
    StateChanged = "state_changed",
    SilencedChanged = "silenced_changed",
    LengthChanged = "length_changed",
}

const CONNECTING_STATES = [
    CallState.Connecting,
    CallState.WaitLocalMedia,
    CallState.CreateOffer,
    CallState.CreateAnswer,
];

const SUPPORTED_STATES = [
    CallState.Connected,
    CallState.Ringing,
];

export enum CustomCallState {
    Missed = "missed",
}

export function buildCallEventGroupers(
    callEventGroupers: Map<string, CallEventGrouper>,
    events?: MatrixEvent[],
): Map<string, CallEventGrouper> {
    const newCallEventGroupers = new Map();
    events?.forEach(ev => {
        if (!ev.getType().startsWith("m.call.") && !ev.getType().startsWith("org.matrix.call.")) {
            return;
        }

        const callId = ev.getContent().call_id;
        if (!newCallEventGroupers.has(callId)) {
            if (callEventGroupers.has(callId)) {
                // reuse the CallEventGrouper object where possible
                newCallEventGroupers.set(callId, callEventGroupers.get(callId));
            } else {
                newCallEventGroupers.set(callId, new CallEventGrouper());
            }
        }
        newCallEventGroupers.get(callId).add(ev);
    });
    return newCallEventGroupers;
}

export default class CallEventGrouper extends EventEmitter {
    private events: Set<MatrixEvent> = new Set<MatrixEvent>();
    private call: MatrixCall;
    public state: CallState | CustomCallState;

    constructor() {
        super();

        CallHandler.instance.addListener(CallHandlerEvent.CallsChanged, this.setCall);
        CallHandler.instance.addListener(CallHandlerEvent.SilencedCallsChanged, this.onSilencedCallsChanged);
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

    private get selectAnswer(): MatrixEvent {
        return [...this.events].find((event) => event.getType() === EventType.CallSelectAnswer);
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

    public get rejectParty(): string {
        return this.reject?.getSender();
    }

    public get gotRejected(): boolean {
        return Boolean(this.reject);
    }

    public get duration(): Date {
        if (!this.hangup || !this.selectAnswer) return;
        return new Date(this.hangup.getDate().getTime() - this.selectAnswer.getDate().getTime());
    }

    /**
     * Returns true if there are only events from the other side - we missed the call
     */
    private get callWasMissed(): boolean {
        return ![...this.events].some((event) => event.sender?.userId === MatrixClientPeg.get().getUserId());
    }

    private get callId(): string | undefined {
        return [...this.events][0]?.getContent()?.call_id;
    }

    private get roomId(): string | undefined {
        return [...this.events][0]?.getRoomId();
    }

    private onSilencedCallsChanged = () => {
        const newState = CallHandler.instance.isCallSilenced(this.callId);
        this.emit(CallEventGrouperEvent.SilencedChanged, newState);
    };

    private onLengthChanged = (length: number): void => {
        this.emit(CallEventGrouperEvent.LengthChanged, length);
    };

    public answerCall = (): void => {
        CallHandler.instance.answerCall(this.roomId);
    };

    public rejectCall = (): void => {
        CallHandler.instance.hangupOrReject(this.roomId, true);
    };

    public callBack = (): void => {
        CallHandler.instance.placeCall(this.roomId, this.isVoice ? CallType.Voice : CallType.Video);
    };

    public toggleSilenced = () => {
        const silenced = CallHandler.instance.isCallSilenced(this.callId);
        silenced ?
            CallHandler.instance.unSilenceCall(this.callId) :
            CallHandler.instance.silenceCall(this.callId);
    };

    private setCallListeners() {
        if (!this.call) return;
        this.call.addListener(CallEvent.State, this.setState);
        this.call.addListener(CallEvent.LengthChanged, this.onLengthChanged);
    }

    private setState = () => {
        if (CONNECTING_STATES.includes(this.call?.state)) {
            this.state = CallState.Connecting;
        } else if (SUPPORTED_STATES.includes(this.call?.state)) {
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

        this.call = CallHandler.instance.getCallById(this.callId);
        this.setCallListeners();
        this.setState();
    };

    public add(event: MatrixEvent) {
        if (this.events.has(event)) return; // nothing to do
        this.events.add(event);
        this.setCall();
    }
}
