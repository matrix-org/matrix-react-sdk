"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.LegacyMsgType = void 0;
exports.isEventLike = isEventLike;

var _message_types = require("../events/message_types");

/*
Copyright 2022 The Matrix.org Foundation C.I.C.

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

/**
 * Represents a legacy m.room.message msgtype
 */
var LegacyMsgType;
/**
 * Determines if the given partial event looks similar enough to the given legacy msgtype
 * to count as that message type.
 * @param {IPartialEvent<EitherAnd<IPartialLegacyContent, M_MESSAGE_EVENT_CONTENT>>} event The event.
 * @param {LegacyMsgType} msgtype The message type to compare for.
 * @returns {boolean} True if the event appears to look similar enough to the msgtype.
 */

exports.LegacyMsgType = LegacyMsgType;

(function (LegacyMsgType) {
  LegacyMsgType["Text"] = "m.text";
  LegacyMsgType["Notice"] = "m.notice";
  LegacyMsgType["Emote"] = "m.emote";
})(LegacyMsgType || (exports.LegacyMsgType = LegacyMsgType = {}));

function isEventLike(event, msgtype) {
  var content = event.content;

  if (msgtype === LegacyMsgType.Text) {
    return _message_types.M_MESSAGE.matches(event.type) || event.type === "m.room.message" && (content === null || content === void 0 ? void 0 : content['msgtype']) === "m.text";
  } else if (msgtype === LegacyMsgType.Emote) {
    return _message_types.M_EMOTE.matches(event.type) || event.type === "m.room.message" && (content === null || content === void 0 ? void 0 : content['msgtype']) === "m.emote";
  } else if (msgtype === LegacyMsgType.Notice) {
    return _message_types.M_NOTICE.matches(event.type) || event.type === "m.room.message" && (content === null || content === void 0 ? void 0 : content['msgtype']) === "m.notice";
  }

  return false;
}