"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.parseMPoll = parseMPoll;

var _poll_types = require("../../events/poll_types");

var _PollStartEvent = require("../../events/PollStartEvent");

var _PollResponseEvent = require("../../events/PollResponseEvent");

var _PollEndEvent = require("../../events/PollEndEvent");

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
function parseMPoll(wireEvent) {
  if (_poll_types.M_POLL_START.matches(wireEvent.type)) {
    return new _PollStartEvent.PollStartEvent(wireEvent);
  } else if (_poll_types.M_POLL_RESPONSE.matches(wireEvent.type)) {
    return new _PollResponseEvent.PollResponseEvent(wireEvent);
  } else if (_poll_types.M_POLL_END.matches(wireEvent.type)) {
    return new _PollEndEvent.PollEndEvent(wireEvent);
  }

  return null; // not a poll event
}