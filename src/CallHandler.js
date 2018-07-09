/*
Copyright 2015, 2016 OpenMarket Ltd
Copyright 2017, 2018 New Vector Ltd

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

import MatrixClientPeg from './MatrixClientPeg';
import PlatformPeg from './PlatformPeg';
import Modal from './Modal';
import sdk from './index';
import { _t } from './languageHandler';
import Matrix from 'matrix-js-sdk';
import dis from './dispatcher';
import { showUnknownDeviceDialogForCalls } from './cryptodevices';
import SettingsStore from "./settings/SettingsStore";
import WidgetUtils from './utils/WidgetUtils';

global.mxCalls = {
    //room_id: MatrixCall
};
const calls = global.mxCalls;
let ConferenceHandler = null;

const audioPromises = {};

function play(audioId) {
    // TODO: Attach an invisible element for this instead
    // which listens?
    const audio = document.getElementById(audioId);
    if (audio) {
        if (audioPromises[audioId]) {
            audioPromises[audioId] = audioPromises[audioId].then(()=>{
                audio.load();
                return audio.play();
            });
        } else {
            audioPromises[audioId] = audio.play();
        }
    }
}

function pause(audioId) {
    // TODO: Attach an invisible element for this instead
    // which listens?
    const audio = document.getElementById(audioId);
    if (audio) {
        if (audioPromises[audioId]) {
            audioPromises[audioId] = audioPromises[audioId].then(()=>audio.pause());
        } else {
            // pause doesn't actually return a promise, but might as well do this for symmetry with play();
            audioPromises[audioId] = audio.pause();
        }
    }
}

function _reAttemptCall(call) {
    if (call.direction === 'outbound') {
        dis.dispatch({
            action: 'place_call',
            room_id: call.roomId,
            type: call.type,
        });
    } else {
        call.answer();
    }
}

function _setCallListeners(call) {
    call.on("error", function(err) {
        console.error("Call error: %s", err);
        console.error(err.stack);
        if (err.code === 'unknown_devices') {
            const QuestionDialog = sdk.getComponent("dialogs.QuestionDialog");

            Modal.createTrackedDialog('Call Failed', '', QuestionDialog, {
                title: _t('Call Failed'),
                description: _t(
                    "There are unknown devices in this room: "+
                    "if you proceed without verifying them, it will be "+
                    "possible for someone to eavesdrop on your call.",
                ),
                button: _t('Review Devices'),
                onFinished: function(confirmed) {
                    if (confirmed) {
                        const room = MatrixClientPeg.get().getRoom(call.roomId);
                        showUnknownDeviceDialogForCalls(
                            MatrixClientPeg.get(),
                            room,
                            () => {
                                _reAttemptCall(call);
                            },
                            call.direction === 'outbound' ? _t("Call Anyway") : _t("Answer Anyway"),
                            call.direction === 'outbound' ? _t("Call") : _t("Answer"),
                        );
                    }
                },
            });
        } else {
            const ErrorDialog = sdk.getComponent("dialogs.ErrorDialog");

            Modal.createTrackedDialog('Call Failed', '', ErrorDialog, {
                title: _t('Call Failed'),
                description: err.message,
            });
        }
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
        } else if (newState === "invite_sent") {
            _setCallState(call, call.roomId, "ringback");
            play("ringbackAudio");
        } else if (newState === "ended" && oldState === "connected") {
            _setCallState(undefined, call.roomId, "ended");
            pause("ringbackAudio");
            play("callendAudio");
        } else if (newState === "ended" && oldState === "invite_sent" &&
                (call.hangupParty === "remote" ||
                (call.hangupParty === "local" && call.hangupReason === "invite_timeout")
                )) {
            _setCallState(call, call.roomId, "busy");
            pause("ringbackAudio");
            play("busyAudio");
            const ErrorDialog = sdk.getComponent("dialogs.ErrorDialog");
            Modal.createTrackedDialog('Call Handler', 'Call Timeout', ErrorDialog, {
                title: _t('Call Timeout'),
                description: _t('The remote side failed to pick up') + '.',
            });
        } else if (oldState === "invite_sent") {
            _setCallState(call, call.roomId, "stop_ringback");
            pause("ringbackAudio");
        } else if (oldState === "ringing") {
            _setCallState(call, call.roomId, "stop_ringing");
            pause("ringbackAudio");
        } else if (newState === "connected") {
            _setCallState(call, call.roomId, "connected");
            pause("ringbackAudio");
        }
    });
}

function _setCallState(call, roomId, status) {
    console.log(
        "Call state in %s changed to %s (%s)", roomId, status, (call ? call.call_state : "-"),
    );
    calls[roomId] = call;

    if (status === "ringing") {
        play("ringAudio");
    } else if (call && call.call_state === "ringing") {
        pause("ringAudio");
    }

    if (call) {
        call.call_state = status;
    }
    dis.dispatch({
        action: 'call_state',
        room_id: roomId,
        state: status,
    });
}

function _onAction(payload) {
    function placeCall(newCall) {
        _setCallListeners(newCall);
        if (payload.type === 'voice') {
            newCall.placeVoiceCall();
        } else if (payload.type === 'video') {
            newCall.placeVideoCall(
                payload.remote_element,
                payload.local_element,
            );
        } else if (payload.type === 'screensharing') {
            const screenCapErrorString = PlatformPeg.get().screenCaptureErrorString();
            if (screenCapErrorString) {
                _setCallState(undefined, newCall.roomId, "ended");
                console.log("Can't capture screen: " + screenCapErrorString);
                const ErrorDialog = sdk.getComponent("dialogs.ErrorDialog");
                Modal.createTrackedDialog('Call Handler', 'Unable to capture screen', ErrorDialog, {
                    title: _t('Unable to capture screen'),
                    description: screenCapErrorString,
                });
                return;
            }
            newCall.placeScreenSharingCall(
                payload.remote_element,
                payload.local_element,
            );
        } else {
            console.error("Unknown conf call type: %s", payload.type);
        }
    }

    switch (payload.action) {
        case 'place_call':
            {
                if (module.exports.getAnyActiveCall()) {
                    const ErrorDialog = sdk.getComponent("dialogs.ErrorDialog");
                    Modal.createTrackedDialog('Call Handler', 'Existing Call', ErrorDialog, {
                        title: _t('Existing Call'),
                        description: _t('You are already in a call.'),
                    });
                    return; // don't allow >1 call to be placed.
                }

                // if the runtime env doesn't do VoIP, whine.
                if (!MatrixClientPeg.get().supportsVoip()) {
                    const ErrorDialog = sdk.getComponent("dialogs.ErrorDialog");
                    Modal.createTrackedDialog('Call Handler', 'VoIP is unsupported', ErrorDialog, {
                        title: _t('VoIP is unsupported'),
                        description: _t('You cannot place VoIP calls in this browser.'),
                    });
                    return;
                }

                const room = MatrixClientPeg.get().getRoom(payload.room_id);
                if (!room) {
                    console.error("Room %s does not exist.", payload.room_id);
                    return;
                }

                const members = room.getJoinedMembers();
                if (members.length <= 1) {
                    const ErrorDialog = sdk.getComponent("dialogs.ErrorDialog");
                    Modal.createTrackedDialog('Call Handler', 'Cannot place call with self', ErrorDialog, {
                        description: _t('You cannot place a call with yourself.'),
                    });
                    return;
                } else if (members.length === 2) {
                    console.log("Place %s call in %s", payload.type, payload.room_id);
                    const call = Matrix.createNewMatrixCall(MatrixClientPeg.get(), payload.room_id);
                    placeCall(call);
                } else { // > 2
                    dis.dispatch({
                        action: "place_conference_call",
                        room_id: payload.room_id,
                        type: payload.type,
                        remote_element: payload.remote_element,
                        local_element: payload.local_element,
                    });
                }
            }
            break;
        case 'place_conference_call':
            console.log("Place conference call in %s", payload.room_id);

            if (MatrixClientPeg.get().isRoomEncrypted(payload.room_id)) {
                // Conference calls are implemented by sending the media to central
                // server which combines the audio from all the participants together
                // into a single stream. This is incompatible with end-to-end encryption
                // because a central server would be decrypting the audio for each
                // participant.
                // Therefore we disable conference calling in E2E rooms.
                const ErrorDialog = sdk.getComponent("dialogs.ErrorDialog");
                Modal.createTrackedDialog('Call Handler', 'Conference calls unsupported e2e', ErrorDialog, {
                    description: _t('Conference calls are not supported in encrypted rooms'),
                });
                return;
            }

            if (SettingsStore.isFeatureEnabled('feature_jitsi')) {
                _startCallApp(payload.room_id, payload.type);
            } else {
                if (!ConferenceHandler) {
                    const ErrorDialog = sdk.getComponent("dialogs.ErrorDialog");
                    Modal.createTrackedDialog('Call Handler', 'Conference call unsupported client', ErrorDialog, {
                        description: _t('Conference calls are not supported in this client'),
                    });
                } else if (!MatrixClientPeg.get().supportsVoip()) {
                    const ErrorDialog = sdk.getComponent("dialogs.ErrorDialog");
                    Modal.createTrackedDialog('Call Handler', 'VoIP is unsupported', ErrorDialog, {
                        title: _t('VoIP is unsupported'),
                        description: _t('You cannot place VoIP calls in this browser.'),
                    });
                } else {
                    const QuestionDialog = sdk.getComponent("dialogs.QuestionDialog");
                    Modal.createTrackedDialog('Call Handler', 'Conference calling in development', QuestionDialog, {
                        title: _t('Warning!'),
                        description: _t('Conference calling is in development and may not be reliable.'),
                        onFinished: (confirm)=>{
                            if (confirm) {
                                ConferenceHandler.createNewMatrixCall(
                                    MatrixClientPeg.get(), payload.room_id,
                                ).done(function(call) {
                                    placeCall(call);
                                }, function(err) {
                                    const ErrorDialog = sdk.getComponent("dialogs.ErrorDialog");
                                    console.error("Conference call failed: " + err);
                                    Modal.createTrackedDialog(
                                        'Call Handler',
                                        'Failed to set up conference call',
                                        ErrorDialog,
                                        {
                                            title: _t('Failed to set up conference call'),
                                            description: (
                                                _t('Conference call failed.') +
                                                ' ' + ((err && err.message) ? err.message : '')
                                            ),
                                        },
                                    );
                                });
                            }
                        },
                    });
                }
            }
            break;
        case 'incoming_call':
            {
                if (module.exports.getAnyActiveCall()) {
                    // ignore multiple incoming calls. in future, we may want a line-1/line-2 setup.
                    // we avoid rejecting with "busy" in case the user wants to answer it on a different device.
                    // in future we could signal a "local busy" as a warning to the caller.
                    // see https://github.com/vector-im/vector-web/issues/1964
                    return;
                }

                // if the runtime env doesn't do VoIP, stop here.
                if (!MatrixClientPeg.get().supportsVoip()) {
                    return;
                }

                const call = payload.call;
                _setCallListeners(call);
                _setCallState(call, call.roomId, "ringing");
            }
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
                room_id: payload.room_id,
            });
            break;
    }
}

function _startCallApp(roomId, type) {
    dis.dispatch({
        action: 'appsDrawer',
        show: true,
    });

    const room = MatrixClientPeg.get().getRoom(roomId);
    if (!room) {
        console.error("Attempted to start conference call widget in unknown room: " + roomId);
        return;
    }

    const currentJitsiWidgets = WidgetUtils.getRoomWidgets(room).filter((ev) => {
        return ev.getContent().type === 'jitsi';
    });
    if (currentJitsiWidgets.length > 0) {
        console.warn(
            "Refusing to start conference call widget in " + roomId +
            " a conference call widget is already present",
        );
        const ErrorDialog = sdk.getComponent("dialogs.ErrorDialog");

        Modal.createTrackedDialog('Already have Jitsi Widget', '', ErrorDialog, {
            title: _t('Call in Progress'),
            description: _t('A call is already in progress!'),
        });
        return;
    }

    // This inherits its poor naming from the field of the same name that goes into
    // the event. It's just a random string to make the Jitsi URLs unique.
    const widgetSessionId = Math.random().toString(36).substring(2);
    const confId = room.roomId.replace(/[^A-Za-z0-9]/g, '') + widgetSessionId;
    // NB. we can't just encodeURICompoent all of these because the $ signs need to be there
    // (but currently the only thing that needs encoding is the confId)
    const queryString = [
        'confId='+encodeURIComponent(confId),
        'isAudioConf='+(type === 'voice' ? 'true' : 'false'),
        'displayName=$matrix_display_name',
        'avatarUrl=$matrix_avatar_url',
        'email=$matrix_user_id',
    ].join('&');
    const widgetUrl = (
        'https://scalar.vector.im/api/widgets' +
        '/jitsi.html?' +
        queryString
    );

    const widgetData = { widgetSessionId };

    const widgetId = (
        'jitsi_' +
        MatrixClientPeg.get().credentials.userId +
        '_' +
        Date.now()
    );

    WidgetUtils.setRoomWidget(roomId, widgetId, 'jitsi', widgetUrl, 'Jitsi', widgetData).then(() => {
        console.log('Jitsi widget added');
    }).catch((e) => {
        console.error(e);
    });
}

// FIXME: Nasty way of making sure we only register
// with the dispatcher once
if (!global.mxCallHandler) {
    dis.register(_onAction);
}

const callHandler = {
    getCallForRoom: function(roomId) {
        let call = module.exports.getCall(roomId);
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
        const roomsWithCalls = Object.keys(calls);
        for (let i = 0; i < roomsWithCalls.length; i++) {
            if (calls[roomsWithCalls[i]] &&
                    calls[roomsWithCalls[i]].call_state !== "ended") {
                return calls[roomsWithCalls[i]];
            }
        }
        return null;
    },

    setConferenceHandler: function(confHandler) {
        ConferenceHandler = confHandler;
    },

    getConferenceHandler: function() {
        return ConferenceHandler;
    },
};
// Only things in here which actually need to be global are the
// calls list (done separately) and making sure we only register
// with the dispatcher once (which uses this mechanism but checks
// separately). This could be tidied up.
if (global.mxCallHandler === undefined) {
    global.mxCallHandler = callHandler;
}

module.exports = global.mxCallHandler;
