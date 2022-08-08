"use strict";

function _typeof(obj) { "@babel/helpers - typeof"; return _typeof = "function" == typeof Symbol && "symbol" == typeof Symbol.iterator ? function (obj) { return typeof obj; } : function (obj) { return obj && "function" == typeof Symbol && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj; }, _typeof(obj); }

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.PollEndEvent = void 0;

var _poll_types = require("./poll_types");

var _InvalidEventError = require("../InvalidEventError");

var _relationship_types = require("./relationship_types");

var _MessageEvent = require("./MessageEvent");

var _message_types = require("./message_types");

var _events = require("../utility/events");

var _ExtensibleEvent2 = require("./ExtensibleEvent");

function ownKeys(object, enumerableOnly) { var keys = Object.keys(object); if (Object.getOwnPropertySymbols) { var symbols = Object.getOwnPropertySymbols(object); enumerableOnly && (symbols = symbols.filter(function (sym) { return Object.getOwnPropertyDescriptor(object, sym).enumerable; })), keys.push.apply(keys, symbols); } return keys; }

function _objectSpread(target) { for (var i = 1; i < arguments.length; i++) { var source = null != arguments[i] ? arguments[i] : {}; i % 2 ? ownKeys(Object(source), !0).forEach(function (key) { _defineProperty(target, key, source[key]); }) : Object.getOwnPropertyDescriptors ? Object.defineProperties(target, Object.getOwnPropertyDescriptors(source)) : ownKeys(Object(source)).forEach(function (key) { Object.defineProperty(target, key, Object.getOwnPropertyDescriptor(source, key)); }); } return target; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } }

function _createClass(Constructor, protoProps, staticProps) { if (protoProps) _defineProperties(Constructor.prototype, protoProps); if (staticProps) _defineProperties(Constructor, staticProps); Object.defineProperty(Constructor, "prototype", { writable: false }); return Constructor; }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function"); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, writable: true, configurable: true } }); Object.defineProperty(subClass, "prototype", { writable: false }); if (superClass) _setPrototypeOf(subClass, superClass); }

function _setPrototypeOf(o, p) { _setPrototypeOf = Object.setPrototypeOf || function _setPrototypeOf(o, p) { o.__proto__ = p; return o; }; return _setPrototypeOf(o, p); }

function _createSuper(Derived) { var hasNativeReflectConstruct = _isNativeReflectConstruct(); return function _createSuperInternal() { var Super = _getPrototypeOf(Derived), result; if (hasNativeReflectConstruct) { var NewTarget = _getPrototypeOf(this).constructor; result = Reflect.construct(Super, arguments, NewTarget); } else { result = Super.apply(this, arguments); } return _possibleConstructorReturn(this, result); }; }

function _possibleConstructorReturn(self, call) { if (call && (_typeof(call) === "object" || typeof call === "function")) { return call; } else if (call !== void 0) { throw new TypeError("Derived constructors may only return object or undefined"); } return _assertThisInitialized(self); }

function _assertThisInitialized(self) { if (self === void 0) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return self; }

function _isNativeReflectConstruct() { if (typeof Reflect === "undefined" || !Reflect.construct) return false; if (Reflect.construct.sham) return false; if (typeof Proxy === "function") return true; try { Boolean.prototype.valueOf.call(Reflect.construct(Boolean, [], function () {})); return true; } catch (e) { return false; } }

function _getPrototypeOf(o) { _getPrototypeOf = Object.setPrototypeOf ? Object.getPrototypeOf : function _getPrototypeOf(o) { return o.__proto__ || Object.getPrototypeOf(o); }; return _getPrototypeOf(o); }

function _defineProperty(obj, key, value) { if (key in obj) { Object.defineProperty(obj, key, { value: value, enumerable: true, configurable: true, writable: true }); } else { obj[key] = value; } return obj; }

/**
 * Represents a poll end/closure event.
 */
var PollEndEvent = /*#__PURE__*/function (_ExtensibleEvent) {
  _inherits(PollEndEvent, _ExtensibleEvent);

  var _super = _createSuper(PollEndEvent);

  /**
   * The poll start event ID referenced by the response.
   */

  /**
   * The closing message for the event.
   */

  /**
   * Creates a new PollEndEvent from a pure format. Note that the event is *not*
   * parsed here: it will be treated as a literal m.poll.response primary typed event.
   * @param {IPartialEvent<M_POLL_END_EVENT_CONTENT>} wireFormat The event.
   */
  function PollEndEvent(wireFormat) {
    var _this;

    _classCallCheck(this, PollEndEvent);

    _this = _super.call(this, wireFormat);

    _defineProperty(_assertThisInitialized(_this), "pollEventId", void 0);

    _defineProperty(_assertThisInitialized(_this), "closingMessage", void 0);

    var rel = _this.wireContent["m.relates_to"];

    if (!_relationship_types.REFERENCE_RELATION.matches(rel === null || rel === void 0 ? void 0 : rel.rel_type) || typeof (rel === null || rel === void 0 ? void 0 : rel.event_id) !== "string") {
      throw new _InvalidEventError.InvalidEventError("Relationship must be a reference to an event");
    }

    _this.pollEventId = rel.event_id;
    _this.closingMessage = new _MessageEvent.MessageEvent(_this.wireFormat);
    return _this;
  }

  _createClass(PollEndEvent, [{
    key: "isEquivalentTo",
    value: function isEquivalentTo(primaryEventType) {
      return (0, _events.isEventTypeSame)(primaryEventType, _poll_types.M_POLL_END);
    }
  }, {
    key: "serialize",
    value: function serialize() {
      return {
        type: _poll_types.M_POLL_END.name,
        content: _objectSpread(_defineProperty({
          "m.relates_to": {
            rel_type: _relationship_types.REFERENCE_RELATION.name,
            event_id: this.pollEventId
          }
        }, _poll_types.M_POLL_END.name, {}), this.closingMessage.serialize().content)
      };
    }
    /**
     * Creates a new PollEndEvent from a poll event ID.
     * @param {string} pollEventId The poll start event ID.
     * @param {string} message A closing message, typically revealing the top answer.
     * @returns {PollStartEvent} The representative poll closure event.
     */

  }], [{
    key: "from",
    value: function from(pollEventId, message) {
      var _content;

      return new PollEndEvent({
        type: _poll_types.M_POLL_END.name,
        content: (_content = {
          "m.relates_to": {
            rel_type: _relationship_types.REFERENCE_RELATION.name,
            event_id: pollEventId
          }
        }, _defineProperty(_content, _poll_types.M_POLL_END.name, {}), _defineProperty(_content, _message_types.M_TEXT.name, message), _content)
      });
    }
  }]);

  return PollEndEvent;
}(_ExtensibleEvent2.ExtensibleEvent);

exports.PollEndEvent = PollEndEvent;