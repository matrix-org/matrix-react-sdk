"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.ExtensibleEvent = void 0;

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } }

function _createClass(Constructor, protoProps, staticProps) { if (protoProps) _defineProperties(Constructor.prototype, protoProps); if (staticProps) _defineProperties(Constructor, staticProps); Object.defineProperty(Constructor, "prototype", { writable: false }); return Constructor; }

/*
Copyright 2021 - 2022 The Matrix.org Foundation C.I.C.

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
 * Represents an Extensible Event in Matrix.
 */
var ExtensibleEvent = /*#__PURE__*/function () {
  function ExtensibleEvent(wireFormat) {
    _classCallCheck(this, ExtensibleEvent);

    this.wireFormat = wireFormat;
  }
  /**
   * Shortcut to wireFormat.content
   */


  _createClass(ExtensibleEvent, [{
    key: "wireContent",
    get: function get() {
      return this.wireFormat.content;
    }
    /**
     * Serializes the event into a format which can be used to send the
     * event to the room.
     * @returns {IPartialEvent<object>} The serialized event.
     */

  }]);

  return ExtensibleEvent;
}();

exports.ExtensibleEvent = ExtensibleEvent;