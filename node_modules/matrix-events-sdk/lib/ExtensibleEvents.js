"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.ExtensibleEvents = void 0;

var _NamespacedMap = require("./NamespacedMap");

var _InvalidEventError = require("./InvalidEventError");

var _MRoomMessage = require("./interpreters/legacy/MRoomMessage");

var _MMessage = require("./interpreters/modern/MMessage");

var _message_types = require("./events/message_types");

var _poll_types = require("./events/poll_types");

var _MPoll = require("./interpreters/modern/MPoll");

function _createForOfIteratorHelper(o, allowArrayLike) { var it = typeof Symbol !== "undefined" && o[Symbol.iterator] || o["@@iterator"]; if (!it) { if (Array.isArray(o) || (it = _unsupportedIterableToArray(o)) || allowArrayLike && o && typeof o.length === "number") { if (it) o = it; var i = 0; var F = function F() {}; return { s: F, n: function n() { if (i >= o.length) return { done: true }; return { done: false, value: o[i++] }; }, e: function e(_e) { throw _e; }, f: F }; } throw new TypeError("Invalid attempt to iterate non-iterable instance.\nIn order to be iterable, non-array objects must have a [Symbol.iterator]() method."); } var normalCompletion = true, didErr = false, err; return { s: function s() { it = it.call(o); }, n: function n() { var step = it.next(); normalCompletion = step.done; return step; }, e: function e(_e2) { didErr = true; err = _e2; }, f: function f() { try { if (!normalCompletion && it["return"] != null) it["return"](); } finally { if (didErr) throw err; } } }; }

function _unsupportedIterableToArray(o, minLen) { if (!o) return; if (typeof o === "string") return _arrayLikeToArray(o, minLen); var n = Object.prototype.toString.call(o).slice(8, -1); if (n === "Object" && o.constructor) n = o.constructor.name; if (n === "Map" || n === "Set") return Array.from(o); if (n === "Arguments" || /^(?:Ui|I)nt(?:8|16|32)(?:Clamped)?Array$/.test(n)) return _arrayLikeToArray(o, minLen); }

function _arrayLikeToArray(arr, len) { if (len == null || len > arr.length) len = arr.length; for (var i = 0, arr2 = new Array(len); i < len; i++) { arr2[i] = arr[i]; } return arr2; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } }

function _createClass(Constructor, protoProps, staticProps) { if (protoProps) _defineProperties(Constructor.prototype, protoProps); if (staticProps) _defineProperties(Constructor, staticProps); Object.defineProperty(Constructor, "prototype", { writable: false }); return Constructor; }

function _defineProperty(obj, key, value) { if (key in obj) { Object.defineProperty(obj, key, { value: value, enumerable: true, configurable: true, writable: true }); } else { obj[key] = value; } return obj; }

/**
 * Utility class for parsing and identifying event types in a renderable form. An
 * instance of this class can be created to change rendering preference depending
 * on use-case.
 */
var ExtensibleEvents = /*#__PURE__*/function () {
  function ExtensibleEvents() {
    _classCallCheck(this, ExtensibleEvents);

    _defineProperty(this, "interpreters", new _NamespacedMap.NamespacedMap([// Remember to add your unit test when adding to this! ("known events" test description)
    [_MRoomMessage.LEGACY_M_ROOM_MESSAGE, _MRoomMessage.parseMRoomMessage], [_message_types.M_MESSAGE, _MMessage.parseMMessage], [_message_types.M_EMOTE, _MMessage.parseMMessage], [_message_types.M_NOTICE, _MMessage.parseMMessage], [_poll_types.M_POLL_START, _MPoll.parseMPoll], [_poll_types.M_POLL_RESPONSE, _MPoll.parseMPoll], [_poll_types.M_POLL_END, _MPoll.parseMPoll]]));

    _defineProperty(this, "_unknownInterpretOrder", [_message_types.M_MESSAGE]);
  }
  /**
   * Gets the default instance for all extensible event parsing.
   */


  _createClass(ExtensibleEvents, [{
    key: "unknownInterpretOrder",
    get:
    /**
     * Gets the order the internal processor will use for unknown primary
     * event types.
     */
    function get() {
      var _this$_unknownInterpr;

      return (_this$_unknownInterpr = this._unknownInterpretOrder) !== null && _this$_unknownInterpr !== void 0 ? _this$_unknownInterpr : [];
    }
    /**
     * Sets the order the internal processor will use for unknown primary
     * event types.
     * @param {NamespacedValue<string, string>[]} val The parsing order.
     */
    ,
    set: function set(val) {
      this._unknownInterpretOrder = val;
    }
    /**
     * Gets the order the internal processor will use for unknown primary
     * event types.
     */

  }, {
    key: "registerInterpreter",
    value:
    /**
     * Registers a primary event type interpreter. Note that the interpreter might be
     * called with non-primary events if the event is being parsed as a fallback.
     * @param {NamespacedValue<string, string>} wireEventType The event type.
     * @param {EventInterpreter} interpreter The interpreter.
     */
    function registerInterpreter(wireEventType, interpreter) {
      this.interpreters.set(wireEventType, interpreter);
    }
    /**
     * Registers a primary event type interpreter. Note that the interpreter might be
     * called with non-primary events if the event is being parsed as a fallback.
     * @param {NamespacedValue<string, string>} wireEventType The event type.
     * @param {EventInterpreter} interpreter The interpreter.
     */

  }, {
    key: "parse",
    value:
    /**
     * Parses an event, trying the primary event type first. If the primary type is not known
     * then the content will be inspected to find the most suitable fallback.
     *
     * If the parsing failed or was a completely unknown type, this will return falsy.
     * @param {IPartialEvent<object>} wireFormat The event to parse.
     * @returns {Optional<ExtensibleEvent>} The parsed extensible event.
     */
    function parse(wireFormat) {
      try {
        if (this.interpreters.hasNamespaced(wireFormat.type)) {
          return this.interpreters.getNamespaced(wireFormat.type)(wireFormat);
        }

        var _iterator = _createForOfIteratorHelper(this.unknownInterpretOrder),
            _step;

        try {
          for (_iterator.s(); !(_step = _iterator.n()).done;) {
            var tryType = _step.value;

            if (this.interpreters.has(tryType)) {
              var val = this.interpreters.get(tryType)(wireFormat);
              if (val) return val;
            }
          }
        } catch (err) {
          _iterator.e(err);
        } finally {
          _iterator.f();
        }

        return null; // cannot be parsed
      } catch (e) {
        if (e instanceof _InvalidEventError.InvalidEventError) {
          return null; // fail parsing and move on
        }

        throw e; // re-throw everything else
      }
    }
    /**
     * Parses an event, trying the primary event type first. If the primary type is not known
     * then the content will be inspected to find the most suitable fallback.
     *
     * If the parsing failed or was a completely unknown type, this will return falsy.
     * @param {IPartialEvent<object>} wireFormat The event to parse.
     * @returns {Optional<ExtensibleEvent>} The parsed extensible event.
     */

  }], [{
    key: "defaultInstance",
    get: function get() {
      return ExtensibleEvents._defaultInstance;
    }
  }, {
    key: "unknownInterpretOrder",
    get: function get() {
      return ExtensibleEvents.defaultInstance.unknownInterpretOrder;
    }
    /**
     * Sets the order the internal processor will use for unknown primary
     * event types.
     * @param {NamespacedValue<string, string>[]} val The parsing order.
     */
    ,
    set: function set(val) {
      ExtensibleEvents.defaultInstance.unknownInterpretOrder = val;
    }
  }, {
    key: "registerInterpreter",
    value: function registerInterpreter(wireEventType, interpreter) {
      ExtensibleEvents.defaultInstance.registerInterpreter(wireEventType, interpreter);
    }
  }, {
    key: "parse",
    value: function parse(wireFormat) {
      return ExtensibleEvents.defaultInstance.parse(wireFormat);
    }
  }]);

  return ExtensibleEvents;
}();

exports.ExtensibleEvents = ExtensibleEvents;

_defineProperty(ExtensibleEvents, "_defaultInstance", new ExtensibleEvents());