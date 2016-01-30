/*
Copyright 2015, 2016 OpenMarket Ltd

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

/*
 * Manages a list of all the currently active calls.
 *
 * This handler dispatches when voip calls are added/updated/removed from this list:
 * {
 *   action: 'call_state'
 *   room_id: <room ID of the call>
 * }
 *
 * To know the state of the call, this handler exposes a getter to
 * obtain the call for a room:
 *   var call = CallHandler.getCall(roomId)
 *   var state = call.call_state; // ringing|ringback|connected|ended|busy|stop_ringback|stop_ringing
 *
 * This handler listens for and handles the following actions:
 * {
 *   action: 'place_call',
 *   type: 'voice|video',
 *   room_id: <room that the place call button was pressed in>
 * }
 *
 * {
 *   action: 'incoming_call'
 *   call: MatrixCall
 * }
 *
 * {
 *   action: 'hangup'
 *   room_id: <room that the hangup button was pressed in>
 * }
 *
 * {
 *   action: 'answer'
 *   room_id: <room that the answer button was pressed in>
 * }
 */

var MatrixClientPeg = require('./MatrixClientPeg');
var Modal = require('./Modal');
var sdk = require('./index');
var Matrix = require("matrix-js-sdk");
var dis = require("./dispatcher");

global.mxCalls = {
    //room_id: MatrixCall
};
var calls = global.mxCalls;
var ConferenceHandler = null;

function play(audioId) {
    // TODO: Attach an invisible element for this instead
    // which listens?
    var audio = document.getElementById(audioId);
    if (audio) {
        audio.load();
        audio.play();
    }
}

function pause(audioId) {
    // TODO: Attach an invisible element for this instead
    // which listens?
    var audio = document.getElementById(audioId);
    if (audio) {
        audio.pause();
    }
}

function _setCallListeners(call) {
    call.on("error", function(err) {
        console.error("Call error: %s", err);
        console.error(err.stack);
        call.hangup();
        _setCallState(undefined, call.roomId, "ended");
    });
    call.on("hangup", function() {
        _setCallState(undefined, call.roomId, "ended");
    });
    // map web rtc states to dummy UI state
    // ringing|ringback|connected|ended|busy|stop_ringback|stop_ringing
    call.on("state", function(newState, oldState) {
        if (newState === "ringing") {
            _setCallState(call, call.roomId, "ringing");
            pause("ringbackAudio");
        }
        else if (newState === "invite_sent") {
            _setCallState(call, call.roomId, "ringback");
            play("ringbackAudio");
        }
        else if (newState === "ended" && oldState === "connected") {
            _setCallState(undefined, call.roomId, "ended");
            pause("ringbackAudio");
            play("callendAudio");
        }
        else if (newState === "ended" && oldState === "invite_sent" &&
                (call.hangupParty === "remote" ||
                (call.hangupParty === "local" && call.hangupReason === "invite_timeout")
                )) {
            _setCallState(call, call.roomId, "busy");
            pause("ringbackAudio");
            play("busyAudio");
            var ErrorDialog = sdk.getComponent("dialogs.ErrorDialog");
            Modal.createDialog(ErrorDialog, {
                title: "Call Timeout",
                description: "The remote side failed to pick up."
            });
        }
        else if (oldState === "invite_sent") {
            _setCallState(call, call.roomId, "stop_ringback");
            pause("ringbackAudio");
        }
        else if (oldState === "ringing") {
            _setCallState(call, call.roomId, "stop_ringing");
            pause("ringbackAudio");
        }
        else if (newState === "connected") {
            _setCallState(call, call.roomId, "connected");
            pause("ringbackAudio");
        }
    });
}

function _setCallState(call, roomId, status) {
    console.log(
        "Call state in %s changed to %s (%s)", roomId, status, (call ? call.call_state : "-")
    );
    calls[roomId] = call;

    if (status === "ringing") {
        play("ringAudio")
    }
    else if (call && call.call_state === "ringing") {
        pause("ringAudio")
    }

    if (call) {
        call.call_state = status;
    }
    dis.dispatch({
        action: 'call_state',
        room_id: roomId
    });
}

function _onAction(payload) {
    function placeCall(newCall) {
        _setCallListeners(newCall);
        _setCallState(newCall, newCall.roomId, "ringback");
        if (payload.type === 'voice') {
            newCall.placeVoiceCall();
        }
        else if (payload.type === 'video') {
            newCall.placeVideoCall(
                payload.remote_element,
                payload.local_element
            );
        }
        else if (payload.type === 'screensharing') {
            newCall.placeScreenSharingCall(
                payload.remote_element,
                payload.local_element
            );
        }
        else {
            console.error("Unknown conf call type: %s", payload.type);
        }
    }
    var ErrorDialog = sdk.getComponent("dialogs.ErrorDialog");

    switch (payload.action) {
        case 'place_call':
            if (module.exports.getAnyActiveCall()) {
                Modal.createDialog(ErrorDialog, {
                    title: "Existing Call",
                    description: "You are already in a call."
                });
                return; // don't allow >1 call to be placed.
            }

            // if the runtime env doesn't do VoIP, whine.
            if (!MatrixClientPeg.get().supportsVoip()) {
                Modal.createDialog(ErrorDialog, {
                    title: "VoIP is unsupported",
                    description: "You cannot place VoIP calls in this browser."
                });
                return;
            }

            var room = MatrixClientPeg.get().getRoom(payload.room_id);
            if (!room) {
                console.error("Room %s does not exist.", payload.room_id);
                return;
            }

            var members = room.getJoinedMembers();
            if (members.length <= 1) {
                var ErrorDialog = sdk.getComponent("dialogs.ErrorDialog");
                Modal.createDialog(ErrorDialog, {
                    description: "You cannot place a call with yourself."
                });
                return;
            }
            else if (members.length === 2) {
                console.log("Place %s call in %s", payload.type, payload.room_id);
                var call = Matrix.createNewMatrixCall(
                    MatrixClientPeg.get(), payload.room_id
                );
                placeCall(call);
            }
            else { // > 2
                dis.dispatch({
                    action: "place_conference_call",
                    room_id: payload.room_id,
                    type: payload.type,
                    remote_element: payload.remote_element,
                    local_element: payload.local_element
                });
            }
            break;
        case 'place_conference_call':
            console.log("Place conference call in %s", payload.room_id);
            if (!ConferenceHandler) {
                Modal.createDialog(ErrorDialog, {
                    description: "Conference calls are not supported in this client"
                });
            }
            else if (!MatrixClientPeg.get().supportsVoip()) {
                Modal.createDialog(ErrorDialog, {
                    title: "VoIP is unsupported",
                    description: "You cannot place VoIP calls in this browser."
                });
            }
            else {
                ConferenceHandler.createNewMatrixCall(
                    MatrixClientPeg.get(), payload.room_id
                ).done(function(call) {
                    placeCall(call);
                }, function(err) {
                    console.error("Failed to setup conference call: %s", err);
                });
            }
            break;
        case 'incoming_call':
            if (module.exports.getAnyActiveCall()) {
                payload.call.hangup("busy");
                return; // don't allow >1 call to be received, hangup newer one.
            }

            // if the runtime env doesn't do VoIP, stop here.
            if (!MatrixClientPeg.get().supportsVoip()) {
                return;
            }

            var call = payload.call;
            _setCallListeners(call);
            _setCallState(call, call.roomId, "ringing");
            break;
        case 'hangup':
            if (!calls[payload.room_id]) {
                return; // no call to hangup
            }
            calls[payload.room_id].hangup();
            _setCallState(null, payload.room_id, "ended");
            break;
        case 'answer':
            if (!calls[payload.room_id]) {
                return; // no call to answer
            }
            calls[payload.room_id].answer();
            _setCallState(calls[payload.room_id], payload.room_id, "connected");
            dis.dispatch({
                action: "view_room",
                room_id: payload.room_id
            });
            break;
    }
}
// FIXME: Nasty way of making sure we only register
// with the dispatcher once
if (!global.mxCallHandler) {
    dis.register(_onAction);
}

var callHandler = {
    getCallForRoom: function(roomId) {
        var call = module.exports.getCall(roomId);
        if (call) return call;

        if (ConferenceHandler) {
            call = ConferenceHandler.getConferenceCallForRoom(roomId);
        }
        if (call) return call;

        return null;
    },

    getCall: function(roomId) {
        return calls[roomId] || null;
    },

    getAnyActiveCall: function() {
        var roomsWithCalls = Object.keys(calls);
        for (var i = 0; i < roomsWithCalls.length; i++) {
            if (calls[roomsWithCalls[i]] &&
                    calls[roomsWithCalls[i]].call_state !== "ended") {
                return calls[roomsWithCalls[i]];
            }
        }
        return null;
    },

    setConferenceHandler: function(confHandler) {
        ConferenceHandler = confHandler;
    }
};
// Only things in here which actually need to be global are the
// calls list (done separately) and making sure we only register
// with the dispatcher once (which uses this mechanism but checks
// separately). This could be tidied up.
if (global.mxCallHandler === undefined) {
    global.mxCallHandler = callHandler;
}

module.exports = global.mxCallHandler;
