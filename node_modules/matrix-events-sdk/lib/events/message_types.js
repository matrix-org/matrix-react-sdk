"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.M_TEXT = exports.M_NOTICE = exports.M_MESSAGE = exports.M_HTML = exports.M_EMOTE = void 0;

var _NamespacedValue = require("../NamespacedValue");

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
 * The namespaced value for m.message
 */
var M_MESSAGE = new _NamespacedValue.UnstableValue("m.message", "org.matrix.msc1767.message");
/**
 * An m.message event rendering
 */

exports.M_MESSAGE = M_MESSAGE;

/**
 * The namespaced value for m.text
 */
var M_TEXT = new _NamespacedValue.UnstableValue("m.text", "org.matrix.msc1767.text");
/**
 * The content for an m.text event
 */

exports.M_TEXT = M_TEXT;

/**
 * The namespaced value for m.html
 */
var M_HTML = new _NamespacedValue.UnstableValue("m.html", "org.matrix.msc1767.html");
/**
 * The content for an m.html event
 */

exports.M_HTML = M_HTML;

/**
 * The namespaced value for m.emote
 */
var M_EMOTE = new _NamespacedValue.UnstableValue("m.emote", "org.matrix.msc1767.emote");
/**
 * The event definition for an m.emote event (in content)
 */

exports.M_EMOTE = M_EMOTE;

/**
 * The namespaced value for m.notice
 */
var M_NOTICE = new _NamespacedValue.UnstableValue("m.notice", "org.matrix.msc1767.notice");
/**
 * The event definition for an m.notice event (in content)
 */

exports.M_NOTICE = M_NOTICE;