/*
Copyright 2015, 2016 OpenMarket Ltd
Copyright 2017, 2018 New Vector Ltd
Copyright 2019 The Matrix.org Foundation C.I.C.

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

import MatrixClientPeg from "./MatrixClientPeg";
import PlatformPeg from "./PlatformPeg";
import Modal from "./Modal";
import sdk from "./index";
import { _t } from "./languageHandler";
import Matrix from "matrix-js-sdk";
import dis from "./dispatcher";
import SdkConfig from "./SdkConfig";
import { showUnknownDeviceDialogForCalls } from "./cryptodevices";
import WidgetUtils from "./utils/WidgetUtils";
import WidgetEchoStore from "./stores/WidgetEchoStore";
import { IntegrationManagers } from "./integrations/IntegrationManagers";
import SettingsStore, { SettingLevel } from "./settings/SettingsStore";

global.mxCalls = {
    //room_id: MatrixCall
};
const calls = global.mxCalls;

console.log("\n++++++++++++++++");
console.log("WHAT IS CALLS", calls);
console.log("++++++++++++++++\n");

let ConferenceHandler = null;

const audioPromises = {};

function play(audioId) {
    // TODO: Attach an invisible element for this instead
    // which listens?
    const audio = document.getElementById(audioId);
    if (audio) {
        if (audioPromises[audioId]) {
            audioPromises[audioId] = audioPromises[audioId].then(() => {
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
            audioPromises[audioId] = audioPromises[audioId].then(() =>
                audio.pause()
            );
        } else {
            // pause doesn't actually return a promise, but might as well do this for symmetry with play();
            audioPromises[audioId] = audio.pause();
        }
    }
}

function _reAttemptCall(call) {
    if (call.direction === "outbound") {
        dis.dispatch({
            action: "place_call",
            room_id: call.roomId,
            type: call.type
        });
    } else {
        call.answer();
    }
}

function _setCallListeners(call) {
    console.log("CHECK IF THERE IS A LISTENER FOR MUTE <line 128>", call);
    call.on("error", function(err) {
        console.error("Call error:", err);
        if (err.code === "unknown_devices") {
            const QuestionDialog = sdk.getComponent("dialogs.QuestionDialog");

            Modal.createTrackedDialog("Call Failed", "", QuestionDialog, {
                title: _t("Call Failed"),
                description: _t(
                    "There are unknown devices in this room: " +
                        "if you proceed without verifying them, it will be " +
                        "possible for someone to eavesdrop on your call."
                ),
                button: _t("Review Devices"),
                onFinished: function(confirmed) {
                    if (confirmed) {
                        const room = MatrixClientPeg.get().getRoom(call.roomId);
                        showUnknownDeviceDialogForCalls(
                            MatrixClientPeg.get(),
                            room,
                            () => {
                                _reAttemptCall(call);
                            },
                            call.direction === "outbound"
                                ? _t("Call Anyway")
                                : _t("Answer Anyway"),
                            call.direction === "outbound"
                                ? _t("Call")
                                : _t("Answer")
                        );
                    }
                }
            });
        } else {
            if (
                MatrixClientPeg.get().getTurnServers().length === 0 &&
                SettingsStore.getValue("fallbackICEServerAllowed") === null
            ) {
                _showICEFallbackPrompt();
                return;
            }

            const ErrorDialog = sdk.getComponent("dialogs.ErrorDialog");
            Modal.createTrackedDialog("Call Failed", "", ErrorDialog, {
                title: _t("Call Failed"),
                description: err.message
            });
        }
    });
    call.on("hangup", function() {
        console.log("HANGUP EVENT HANDLER RUN IN CALL_HANDLER <line 178>");
        _setCallState(undefined, call.roomId, "ended");
    });
    // IS THERE A LISTENER FOR MUTE?
    // NO
    call.on("mute", function() {
        console.log("------------------------");
        console.log("MUTE FROM CALL HANDLER");
        console.log("------------------------");
        //_setCallState(undefined, call.roomId, "mute");
    });
    // map web rtc states to dummy UI state
    // ringing|ringback|connected|ended|busy|stop_ringback|stop_ringing
    call.on("state", function(newState, oldState) {
        //console.log("++++++++++++++++++++");
        //console.log("NEW STATE", newState);
        //console.log("OLD STATE", oldState);
        //console.log("++++++++++++++++++++");
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
        } else if (
            newState === "ended" &&
            oldState === "invite_sent" &&
            (call.hangupParty === "remote" ||
                (call.hangupParty === "local" &&
                    call.hangupReason === "invite_timeout"))
        ) {
            _setCallState(call, call.roomId, "busy");
            pause("ringbackAudio");
            play("busyAudio");
            const ErrorDialog = sdk.getComponent("dialogs.ErrorDialog");
            Modal.createTrackedDialog(
                "Call Handler",
                "Call Timeout",
                ErrorDialog,
                {
                    title: _t("Call Timeout"),
                    description: _t("The remote side failed to pick up") + "."
                }
            );
        } else if (oldState === "invite_sent") {
            _setCallState(call, call.roomId, "stop_ringback");
            pause("ringbackAudio");
        } else if (oldState === "ringing") {
            _setCallState(call, call.roomId, "stop_ringing");
            pause("ringbackAudio");
        } else if (newState === "connected") {
            _setCallState(call, call.roomId, "connected");
            pause("ringbackAudio");
            // DO NOT CHANGE CALL STATE
            // CALL STATE SHOULD ALWAYS BE CONNECTED FOR ACTIVE CALL
        } /* else if (newState === "mute") {
            console.log(
                "NEW CALL STATE SET TO MUTE, <line 224 CallHandler.js>"
            );
            //_setCallState(call, call.roomId, "mute");
        } else if (newState === "hold") {
            //_setCallState(call, call.roomId, "hold");
        } else if (newState === "transfer") {
            //_setCallState(call, call.roomId, "transfer");
        } else if (newState === "dialpad") {
            //_setCallState(call, call.roomId, "dialpad");
        }*/
    });
}

// SET CALL STATE
// XXX status is never mute ???
function _setCallState(call, roomId, status) {
    // status => stop_ringback, connected, ringback
    // CALL HANDLER HAS STATUS && CALL STATE

    console.log("************ CALL HANDLER ****************");
    console.log("call is: ", call);
    console.log("room ID: ", roomId);
    console.log("STATUS: ", status); // status = 'connected'
    console.log("************ CALL HANDLER ****************");

    console.log(
        `Call state in ${roomId} changed to ${status} (${
            call ? call.call_state : "-"
        })`
    );

    //console.log("-----------------");
    //console.log("CALLS", calls);
    //console.log("-----------------");

    calls[roomId] = call;
    //console.log("** SET CALL STATE", calls[roomId]);

    if (status === "ringing") {
        play("ringAudio");
    } else if (call && call.call_state === "ringing") {
        pause("ringAudio");
    }

    if (call) {
        call.call_state = status;
    }

    // HAS TO BE DONE AFTER SO IT DOESN'T GET OVERWRITTEN
    if (status === "mute") {
        // SETTING STATUS AS STATE WILL ALWAYS HAVE CALL 'CONNECTED'
        call.call_state = "connected";
        call.mute = !call.mute;
    }
    if (status === "hold") {
        // SETTING STATUS AS STATE WILL ALWAYS HAVE CALL 'CONNECTED'
        call.call_state = "connected";
        call.hold = !call.hold;
    }
    if (status === "transfer") {
        // SETTING STATUS AS STATE WILL ALWAYS HAVE CALL 'CONNECTED'
        call.call_state = "connected";
        call.transfer = !transfer;
    }

    dis.dispatch({
        action: "call_state",
        room_id: roomId,
        state: status
    });
}

function _showICEFallbackPrompt() {
    const cli = MatrixClientPeg.get();
    const QuestionDialog = sdk.getComponent("dialogs.QuestionDialog");
    const code = sub => <code>{sub}</code>;
    Modal.createTrackedDialog(
        "No TURN servers",
        "",
        QuestionDialog,
        {
            title: _t("Call failed due to misconfigured server"),
            description: (
                <div>
                    <p>
                        {_t(
                            "Please ask the administrator of your homeserver " +
                                "(<code>%(homeserverDomain)s</code>) to configure a TURN server in " +
                                "order for calls to work reliably.",
                            { homeserverDomain: cli.getDomain() },
                            { code }
                        )}
                    </p>
                    <p>
                        {_t(
                            "Alternatively, you can try to use the public server at " +
                                "<code>turn.matrix.org</code>, but this will not be as reliable, and " +
                                "it will share your IP address with that server. You can also manage " +
                                "this in Settings.",
                            null,
                            { code }
                        )}
                    </p>
                </div>
            ),
            button: _t("Try using turn.matrix.org"),
            cancelButton: _t("OK"),
            onFinished: allow => {
                SettingsStore.setValue(
                    "fallbackICEServerAllowed",
                    null,
                    SettingLevel.DEVICE,
                    allow
                );
                cli.setFallbackICEServerAllowed(allow);
            }
        },
        null,
        true
    );
}

function _onAction(payload) {
    // FUNCTION TO MAKE VOICE/VIDEO CALL
    function placeCall(newCall) {
        // newCall === MatrixCall
        _setCallListeners(newCall);
        // VOICE CALL
        if (payload.type === "voice") {
            newCall.placeVoiceCall();
            // VIDEO CALL
        } else if (payload.type === "video") {
            newCall.placeVideoCall(
                payload.remote_element,
                payload.local_element
            );
        } else if (payload.type === "screensharing") {
            const screenCapErrorString = PlatformPeg.get().screenCaptureErrorString();
            if (screenCapErrorString) {
                _setCallState(undefined, newCall.roomId, "ended");
                console.log("Can't capture screen: " + screenCapErrorString);
                const ErrorDialog = sdk.getComponent("dialogs.ErrorDialog");
                Modal.createTrackedDialog(
                    "Call Handler",
                    "Unable to capture screen",
                    ErrorDialog,
                    {
                        title: _t("Unable to capture screen"),
                        description: screenCapErrorString
                    }
                );
                return;
            }
            newCall.placeScreenSharingCall(
                payload.remote_element,
                payload.local_element
            );
        } else {
            console.error("Unknown conf call type: %s", payload.type);
        }
    } // END OF PLACE CALL FUNCTION

    switch (payload.action) {
        // THIS IS WHERE THE STATE IN ROOM TILE SHOULD BE CHANGED TO MUTE = TRUE
        case "mute":
            _setCallState(payload.call, payload.room_id, payload.action);
            break;
        case "hold":
            _setCallState(payload.call, payload.room_id, payload.action);
            break;
        case "transfer":
            _setCallState(payload.call, payload.room_id, payload.action);
            break;
        case "place_call": // LIMITS CALLS
            {
                if (module.exports.getAnyActiveCall()) {
                    const ErrorDialog = sdk.getComponent("dialogs.ErrorDialog");
                    Modal.createTrackedDialog(
                        "Call Handler",
                        "Existing Call",
                        ErrorDialog,
                        {
                            title: _t("Existing Call"),
                            description: _t("You are already in a call.")
                        }
                    );
                    return; // don't allow >1 call to be placed.
                }

                // if the runtime env doesn't do VoIP, whine.
                if (!MatrixClientPeg.get().supportsVoip()) {
                    const ErrorDialog = sdk.getComponent("dialogs.ErrorDialog");
                    Modal.createTrackedDialog(
                        "Call Handler",
                        "VoIP is unsupported",
                        ErrorDialog,
                        {
                            title: _t("VoIP is unsupported"),
                            description: _t(
                                "You cannot place VoIP calls in this browser."
                            )
                        }
                    );
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
                    Modal.createTrackedDialog(
                        "Call Handler",
                        "Cannot place call with self",
                        ErrorDialog,
                        {
                            description: _t(
                                "You cannot place a call with yourself."
                            )
                        }
                    );
                    return;
                } else if (members.length === 2) {
                    console.log(
                        "Place %s call in %s",
                        payload.type,
                        payload.room_id
                    );
                    const call = Matrix.createNewMatrixCall(
                        MatrixClientPeg.get(),
                        payload.room_id
                    );
                    placeCall(call);
                } else {
                    // > 2
                    dis.dispatch({
                        action: "place_conference_call",
                        room_id: payload.room_id,
                        type: payload.type,
                        remote_element: payload.remote_element,
                        local_element: payload.local_element
                    });
                }
            }
            break;
        case "place_conference_call":
            console.log("Place conference call in %s", payload.room_id);
            _startCallApp(payload.room_id, payload.type);
            break;
        case "incoming_call":
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
        case "hangup":
            if (!calls[payload.room_id]) {
                return; // no call to hangup
            }
            calls[payload.room_id].hangup();
            _setCallState(null, payload.room_id, "ended");
            break;
        case "answer":
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

async function _startCallApp(roomId, type) {
    // check for a working integrations manager. Technically we could put
    // the state event in anyway, but the resulting widget would then not
    // work for us. Better that the user knows before everyone else in the
    // room sees it.
    const managers = IntegrationManagers.sharedInstance();
    let haveScalar = false;
    if (managers.hasManager()) {
        try {
            const scalarClient = managers.getPrimaryManager().getScalarClient();
            await scalarClient.connect();
            haveScalar = scalarClient.hasCredentials();
        } catch (e) {
            // ignore
        }
    }

    if (!haveScalar) {
        const ErrorDialog = sdk.getComponent("dialogs.ErrorDialog");

        Modal.createTrackedDialog(
            "Could not connect to the integration server",
            "",
            ErrorDialog,
            {
                title: _t("Could not connect to the integration server"),
                description: _t(
                    "A conference call could not be started because the integrations server is not available"
                )
            }
        );
        return;
    }

    dis.dispatch({
        action: "appsDrawer",
        show: true
    });

    const room = MatrixClientPeg.get().getRoom(roomId);
    const currentRoomWidgets = WidgetUtils.getRoomWidgets(room);

    if (
        WidgetEchoStore.roomHasPendingWidgetsOfType(
            roomId,
            currentRoomWidgets,
            "jitsi"
        )
    ) {
        const ErrorDialog = sdk.getComponent("dialogs.ErrorDialog");

        Modal.createTrackedDialog("Call already in progress", "", ErrorDialog, {
            title: _t("Call in Progress"),
            description: _t("A call is currently being placed!")
        });
        return;
    }

    const currentJitsiWidgets = currentRoomWidgets.filter(ev => {
        return ev.getContent().type === "jitsi";
    });
    if (currentJitsiWidgets.length > 0) {
        console.warn(
            "Refusing to start conference call widget in " +
                roomId +
                " a conference call widget is already present"
        );
        const ErrorDialog = sdk.getComponent("dialogs.ErrorDialog");

        Modal.createTrackedDialog(
            "Already have Jitsi Widget",
            "",
            ErrorDialog,
            {
                title: _t("Call in Progress"),
                description: _t("A call is already in progress!")
            }
        );
        return;
    }

    // This inherits its poor naming from the field of the same name that goes into
    // the event. It's just a random string to make the Jitsi URLs unique.
    const widgetSessionId = Math.random()
        .toString(36)
        .substring(2);
    const confId = room.roomId.replace(/[^A-Za-z0-9]/g, "") + widgetSessionId;
    // NB. we can't just encodeURICompoent all of these because the $ signs need to be there
    // (but currently the only thing that needs encoding is the confId)
    const queryString = [
        "confId=" + encodeURIComponent(confId),
        "isAudioConf=" + (type === "voice" ? "true" : "false"),
        "displayName=$matrix_display_name",
        "avatarUrl=$matrix_avatar_url",
        "email=$matrix_user_id"
    ].join("&");

    let widgetUrl;
    if (SdkConfig.get().integrations_jitsi_widget_url) {
        // Try this config key. This probably isn't ideal as a way of discovering this
        // URL, but this will at least allow the integration manager to not be hardcoded.
        widgetUrl =
            SdkConfig.get().integrations_jitsi_widget_url + "?" + queryString;
    } else {
        const apiUrl = IntegrationManagers.sharedInstance().getPrimaryManager()
            .apiUrl;
        widgetUrl = apiUrl + "/widgets/jitsi.html?" + queryString;
    }

    const widgetData = { widgetSessionId };

    const widgetId =
        "jitsi_" + MatrixClientPeg.get().credentials.userId + "_" + Date.now();

    WidgetUtils.setRoomWidget(
        roomId,
        widgetId,
        "jitsi",
        widgetUrl,
        "Jitsi",
        widgetData
    )
        .then(() => {
            console.log("Jitsi widget added");
        })
        .catch(e => {
            if (e.errcode === "M_FORBIDDEN") {
                const ErrorDialog = sdk.getComponent("dialogs.ErrorDialog");

                Modal.createTrackedDialog("Call Failed", "", ErrorDialog, {
                    title: _t("Permission Required"),
                    description: _t(
                        "You do not have permission to start a conference call in this room"
                    )
                });
            }
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
            if (
                calls[roomsWithCalls[i]] &&
                calls[roomsWithCalls[i]].call_state !== "ended"
            ) {
                return calls[roomsWithCalls[i]];
            }
        }
        return null;
    },

    /**
     * The conference handler is a module that deals with implementation-specific
     * multi-party calling implementations. Riot passes in its own which creates
     * a one-to-one call with a freeswitch conference bridge. As of July 2018,
     * the de-facto way of conference calling is a Jitsi widget, so this is
     * deprecated. It reamins here for two reasons:
     *  1. So Riot still supports joining existing freeswitch conference calls
     *     (but doesn't support creating them). After a transition period, we can
     *     remove support for joining them too.
     *  2. To hide the one-to-one rooms that old-style conferencing creates. This
     *     is much harder to remove: probably either we make Riot leave & forget these
     *     rooms after we remove support for joining freeswitch conferences, or we
     *     accept that random rooms with cryptic users will suddently appear for
     *     anyone who's ever used conference calling, or we are stuck with this
     *     code forever.
     *
     * @param {object} confHandler The conference handler object
     */
    setConferenceHandler: function(confHandler) {
        ConferenceHandler = confHandler;
    },

    getConferenceHandler: function() {
        return ConferenceHandler;
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
