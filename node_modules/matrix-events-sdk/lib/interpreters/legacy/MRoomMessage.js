"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.LEGACY_M_ROOM_MESSAGE = void 0;
exports.parseMRoomMessage = parseMRoomMessage;

var _MessageEvent = require("../../events/MessageEvent");

var _NoticeEvent = require("../../events/NoticeEvent");

var _EmoteEvent = require("../../events/EmoteEvent");

var _NamespacedValue = require("../../NamespacedValue");

var _message_types = require("../../events/message_types");

function ownKeys(object, enumerableOnly) { var keys = Object.keys(object); if (Object.getOwnPropertySymbols) { var symbols = Object.getOwnPropertySymbols(object); enumerableOnly && (symbols = symbols.filter(function (sym) { return Object.getOwnPropertyDescriptor(object, sym).enumerable; })), keys.push.apply(keys, symbols); } return keys; }

function _objectSpread(target) { for (var i = 1; i < arguments.length; i++) { var source = null != arguments[i] ? arguments[i] : {}; i % 2 ? ownKeys(Object(source), !0).forEach(function (key) { _defineProperty(target, key, source[key]); }) : Object.getOwnPropertyDescriptors ? Object.defineProperties(target, Object.getOwnPropertyDescriptors(source)) : ownKeys(Object(source)).forEach(function (key) { Object.defineProperty(target, key, Object.getOwnPropertyDescriptor(source, key)); }); } return target; }

function _defineProperty(obj, key, value) { if (key in obj) { Object.defineProperty(obj, key, { value: value, enumerable: true, configurable: true, writable: true }); } else { obj[key] = value; } return obj; }

var LEGACY_M_ROOM_MESSAGE = new _NamespacedValue.NamespacedValue("m.room.message");
exports.LEGACY_M_ROOM_MESSAGE = LEGACY_M_ROOM_MESSAGE;

function parseMRoomMessage(wireEvent) {
  var _wireEvent$content, _wireEvent$content2, _wireEvent$content3;

  if (_message_types.M_MESSAGE.findIn(wireEvent.content) || _message_types.M_TEXT.findIn(wireEvent.content)) {
    // We know enough about the event to coerce it into the right type
    return new _MessageEvent.MessageEvent(wireEvent);
  }

  var msgtype = (_wireEvent$content = wireEvent.content) === null || _wireEvent$content === void 0 ? void 0 : _wireEvent$content.msgtype;
  var text = (_wireEvent$content2 = wireEvent.content) === null || _wireEvent$content2 === void 0 ? void 0 : _wireEvent$content2.body;
  var html = ((_wireEvent$content3 = wireEvent.content) === null || _wireEvent$content3 === void 0 ? void 0 : _wireEvent$content3.format) === "org.matrix.custom.html" ? wireEvent.content.formatted_body : null;

  if (msgtype === "m.text") {
    var _objectSpread2;

    return new _MessageEvent.MessageEvent(_objectSpread(_objectSpread({}, wireEvent), {}, {
      content: _objectSpread(_objectSpread({}, wireEvent.content), {}, (_objectSpread2 = {}, _defineProperty(_objectSpread2, _message_types.M_TEXT.name, text), _defineProperty(_objectSpread2, _message_types.M_HTML.name, html), _objectSpread2))
    }));
  } else if (msgtype === "m.notice") {
    var _objectSpread3;

    return new _NoticeEvent.NoticeEvent(_objectSpread(_objectSpread({}, wireEvent), {}, {
      content: _objectSpread(_objectSpread({}, wireEvent.content), {}, (_objectSpread3 = {}, _defineProperty(_objectSpread3, _message_types.M_TEXT.name, text), _defineProperty(_objectSpread3, _message_types.M_HTML.name, html), _objectSpread3))
    }));
  } else if (msgtype === "m.emote") {
    var _objectSpread4;

    return new _EmoteEvent.EmoteEvent(_objectSpread(_objectSpread({}, wireEvent), {}, {
      content: _objectSpread(_objectSpread({}, wireEvent.content), {}, (_objectSpread4 = {}, _defineProperty(_objectSpread4, _message_types.M_TEXT.name, text), _defineProperty(_objectSpread4, _message_types.M_HTML.name, html), _objectSpread4))
    }));
  } else {
    // TODO: Handle other types
    return null;
  }
}