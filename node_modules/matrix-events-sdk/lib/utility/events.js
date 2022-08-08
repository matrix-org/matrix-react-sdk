"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.isEventTypeSame = isEventTypeSame;

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
 * Represents a potentially namespaced event type.
 */

/**
 * Determines if two event types are the same, including namespaces.
 * @param {EventType} given The given event type. This will be compared
 * against the expected type.
 * @param {EventType} expected The expected event type.
 * @returns {boolean} True if the given type matches the expected type.
 */
function isEventTypeSame(given, expected) {
  if (typeof given === "string") {
    if (typeof expected === "string") {
      return expected === given;
    } else {
      return expected.matches(given);
    }
  } else {
    if (typeof expected === "string") {
      return given.matches(expected);
    } else {
      var expectedNs = expected;
      var givenNs = given;
      return expectedNs.matches(givenNs.name) || expectedNs.matches(givenNs.altName);
    }
  }
}