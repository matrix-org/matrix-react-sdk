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

var MatrixClientPeg = require("./MatrixClientPeg");
var CallHandler = require("./CallHandler");
import counterpart from 'counterpart';
import * as Roles from './Roles';

function textForMemberEvent(ev) {
    // XXX: SYJS-16 "sender is sometimes null for join messages"
    var senderName = ev.sender ? ev.sender.name : ev.getSender();
    var targetName = ev.target ? ev.target.name : ev.getStateKey();
    var ConferenceHandler = CallHandler.getConferenceHandler();
    var reason = ev.getContent().reason ? (
        " Reason: " + ev.getContent().reason
    ) : "";
    switch (ev.getContent().membership) {
        case 'invite':
            var threePidContent = ev.getContent().third_party_invite;
            if (threePidContent) {
                if (threePidContent.display_name) {
                    return targetName + " " + counterpart.translate("accepted the invitation for") + " " +
                        threePidContent.display_name + ".";
                } else {
                    return targetName + " " + counterpart.translate("accepted an invitation") + ".";
                }
            }
            else {
                if (ConferenceHandler && ConferenceHandler.isConferenceUser(ev.getStateKey())) {
                    return senderName + " " + counterpart.translate("requested a VoIP conference");
                }
                else {
                    return senderName + " " + counterpart.translate("invited") + " " + targetName + ".";
                }
            }
        case 'ban':
            return senderName + " " + counterpart.translate("banned") + " " + targetName + "." + reason;
        case 'join':
            if (ev.getPrevContent() && ev.getPrevContent().membership == 'join') {
                if (ev.getPrevContent().displayname && ev.getContent().displayname && ev.getPrevContent().displayname != ev.getContent().displayname) {
                    return ev.getSender() + " " + counterpart.translate("changed their display name from") + " " +
                        ev.getPrevContent().displayname + " " + "to " +
                        ev.getContent().displayname;
                } else if (!ev.getPrevContent().displayname && ev.getContent().displayname) {
                    return ev.getSender() + " " + counterpart.translate("set their display name to") + " " + ev.getContent().displayname;
                } else if (ev.getPrevContent().displayname && !ev.getContent().displayname) {
                    return ev.getSender() + " " + counterpart.translate("removed their display name") + " (" + ev.getPrevContent().displayname + ")";
                } else if (ev.getPrevContent().avatar_url && !ev.getContent().avatar_url) {
                    return senderName + " " + counterpart.translate("removed their profile picture");
                } else if (ev.getPrevContent().avatar_url && ev.getContent().avatar_url && ev.getPrevContent().avatar_url != ev.getContent().avatar_url) {
                    return senderName + " " + "changed their profile picture";
                } else if (!ev.getPrevContent().avatar_url && ev.getContent().avatar_url) {
                    return senderName + " " + counterpart.translate("set a profile picture");
                } else {
                    // hacky hack for https://github.com/vector-im/vector-web/issues/2020
                    return senderName + " " + counterpart.translate("rejoined the room.");
                }
            } else {
                if (!ev.target) console.warn("Join message has no target! -- " + ev.getContent().state_key);
                if (ConferenceHandler && ConferenceHandler.isConferenceUser(ev.getStateKey())) {
                    return counterpart.translate("VoIP conference started");
                }
                else {
                    return targetName + " " + counterpart.translate("joined the room") + ".";
                }
            }
        case 'leave':
            if (ev.getSender() === ev.getStateKey()) {
                if (ConferenceHandler && ConferenceHandler.isConferenceUser(ev.getStateKey())) {
                    return counterpart.translate("VoIP conference finished");
                }
                else if (ev.getPrevContent().membership === "invite") {
                    return targetName + " " + counterpart.translate("rejected the invitation.");
                }
                else {
                    return targetName + " " + counterpart.translate("left the room");
                }
            }
            else if (ev.getPrevContent().membership === "ban") {
                return senderName + " " + counterpart.translate("unbanned ") + targetName + ".";
            }
            else if (ev.getPrevContent().membership === "join") {
                return senderName + " " + counterpart.translate("kicked ") + targetName + "." + reason;
            }
            else if (ev.getPrevContent().membership === "invite") {
                return senderName + " " + counterpart.translate("withdrew ") + targetName + counterpart.translate("'s invitation.") + reason;
            }
            else {
                return targetName + " " + counterpart.translate("left the room.");
            }
    }
}

function textForTopicEvent(ev) {
    var senderDisplayName = ev.sender && ev.sender.name ? ev.sender.name : ev.getSender();

    return senderDisplayName + " " + counterpart.translate('changed the topic to') + " " + ev.getContent().topic;
}

function textForRoomNameEvent(ev) {
    var senderDisplayName = ev.sender && ev.sender.name ? ev.sender.name : ev.getSender();

    return senderDisplayName + " " + counterpart.translate("changed the room name to") + " " + ev.getContent().name;
}

function textForMessageEvent(ev) {
    var senderDisplayName = ev.sender && ev.sender.name ? ev.sender.name : ev.getSender();
    var message = senderDisplayName + ': ' + ev.getContent().body;
    if (ev.getContent().msgtype === "m.emote") {
        message = "* " + senderDisplayName + " " + message;
    } else if (ev.getContent().msgtype === "m.image") {
        message = senderDisplayName + " " + counterpart.translate("sent an image") + ".";
    }
    return message;
}

function textForCallAnswerEvent(event) {
    var senderName = event.sender ? event.sender.name : counterpart.translate("Someone");
    var supported = MatrixClientPeg.get().supportsVoip() ? "" : counterpart.translate(" (not supported by this browser)");
    return senderName + " " + counterpart.translate("answered the call.") + supported;
}

function textForCallHangupEvent(event) {
    var senderName = event.sender ? event.sender.name : counterpart.translate("Someone");
    var supported = MatrixClientPeg.get().supportsVoip() ? "" : counterpart.translate(" (not supported by this browser)");
    return senderName + " " + counterpart.translate("ended the call.") + supported;
}

function textForCallInviteEvent(event) {
    var senderName = event.sender ? event.sender.name : counterpart.translate("Someone");
    // FIXME: Find a better way to determine this from the event?
    var type = "voice";
    if (event.getContent().offer && event.getContent().offer.sdp &&
            event.getContent().offer.sdp.indexOf('m=video') !== -1) {
        type = "video";
    }
    var supported = MatrixClientPeg.get().supportsVoip() ? "" : " (not supported by this browser)";
    return senderName + " " + counterpart.translate("placed a") + " " + type + " " + counterpart.translate("call.") + supported;
}

function textForThreePidInviteEvent(event) {
    var senderName = event.sender ? event.sender.name : event.getSender();
    return senderName + " " + counterpart.translate("sent an invitation to") + " " + event.getContent().display_name +
     counterpart.translate(" to join the room") + ".";
}

function textForHistoryVisibilityEvent(event) {
    var senderName = event.sender ? event.sender.name : event.getSender();
    var vis = event.getContent().history_visibility;
    var text = senderName + " " + counterpart.translate("made future room history visible to") + " ";
    if (vis === "invited") {
        text += counterpart.translate("all room members, from the point they are invited") + ".";
    }
    else if (vis === "joined") {
        text += counterpart.translate("all room members, from the point they joined") + ".";
    }
    else if (vis === "shared") {
        text += counterpart.translate("all room members") + ".";
    }
    else if (vis === "world_readable") {
        text += counterpart.translate("anyone") + ".";
    }
    else {
        text += " " + counterpart.translate("unknown") + " (" + vis + ")";
    }
    return text;
}

function textForEncryptionEvent(event) {
    var senderName = event.sender ? event.sender.name : event.getSender();
    return senderName + " " + counterpart.translate("turned on end-to-end encryption (algorithm") + " "+ event.getContent().algorithm + ")";
}

// Currently will only display a change if a user's power level is changed
function textForPowerEvent(event) {
    const senderName = event.sender ? event.sender.name : event.getSender();
    if (!event.getPrevContent() || !event.getPrevContent().users) {
        return '';
    }
    const userDefault = event.getContent().users_default || 0;
    // Construct set of userIds
    let users = [];
    Object.keys(event.getContent().users).forEach(
        (userId) => {
            if (users.indexOf(userId) === -1) users.push(userId);
        }
    );
    Object.keys(event.getPrevContent().users).forEach(
        (userId) => {
            if (users.indexOf(userId) === -1) users.push(userId);
        }
    );
    let diff = [];
    users.forEach((userId) => {
        // Previous power level
        const from = event.getPrevContent().users[userId];
        // Current power level
        const to = event.getContent().users[userId];
        if (to !== from) {
            diff.push(
                userId +
                " " + counterpart.translate('from') + ' ' + Roles.textualPowerLevel(from, userDefault) +
                " " + counterpart.translate('to') + ' ' + Roles.textualPowerLevel(to, userDefault)
            );
        }
    });
    if (!diff.length) {
        return '';
    }
    return senderName + " " + counterpart.translate('changed the power level of') + ' ' + diff.join(', ');
}

var handlers = {
    'm.room.message': textForMessageEvent,
    'm.room.name':    textForRoomNameEvent,
    'm.room.topic':   textForTopicEvent,
    'm.room.member':  textForMemberEvent,
    'm.call.invite':  textForCallInviteEvent,
    'm.call.answer':  textForCallAnswerEvent,
    'm.call.hangup':  textForCallHangupEvent,
    'm.room.third_party_invite': textForThreePidInviteEvent,
    'm.room.history_visibility': textForHistoryVisibilityEvent,
    'm.room.encryption': textForEncryptionEvent,
    'm.room.power_levels': textForPowerEvent,
};

module.exports = {
    textForEvent: function(ev) {
        var hdlr = handlers[ev.getType()];
        if (!hdlr) return "";
        return hdlr(ev);
    }
};
