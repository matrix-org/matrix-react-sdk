"use strict";

function _typeof(obj) { "@babel/helpers - typeof"; return _typeof = "function" == typeof Symbol && "symbol" == typeof Symbol.iterator ? function (obj) { return typeof obj; } : function (obj) { return obj && "function" == typeof Symbol && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj; }, _typeof(obj); }

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.PollResponseEvent = void 0;

var _ExtensibleEvent2 = require("./ExtensibleEvent");

var _poll_types = require("./poll_types");

var _InvalidEventError = require("../InvalidEventError");

var _relationship_types = require("./relationship_types");

var _events = require("../utility/events");

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
 * Represents a poll response event.
 */
var PollResponseEvent = /*#__PURE__*/function (_ExtensibleEvent) {
  _inherits(PollResponseEvent, _ExtensibleEvent);

  var _super = _createSuper(PollResponseEvent);

  /**
   * Creates a new PollResponseEvent from a pure format. Note that the event is *not*
   * parsed here: it will be treated as a literal m.poll.response primary typed event.
   *
   * To validate the response against a poll, call `validateAgainst` after creation.
   * @param {IPartialEvent<M_POLL_RESPONSE_EVENT_CONTENT>} wireFormat The event.
   */
  function PollResponseEvent(wireFormat) {
    var _this;

    _classCallCheck(this, PollResponseEvent);

    _this = _super.call(this, wireFormat);

    _defineProperty(_assertThisInitialized(_this), "internalAnswerIds", void 0);

    _defineProperty(_assertThisInitialized(_this), "internalSpoiled", void 0);

    _defineProperty(_assertThisInitialized(_this), "pollEventId", void 0);

    var rel = _this.wireContent["m.relates_to"];

    if (!_relationship_types.REFERENCE_RELATION.matches(rel === null || rel === void 0 ? void 0 : rel.rel_type) || typeof (rel === null || rel === void 0 ? void 0 : rel.event_id) !== "string") {
      throw new _InvalidEventError.InvalidEventError("Relationship must be a reference to an event");
    }

    _this.pollEventId = rel.event_id;

    _this.validateAgainst(null);

    return _this;
  }
  /**
   * Validates the poll response using the poll start event as a frame of reference. This
   * is used to determine if the vote is spoiled, whether the answers are valid, etc.
   * @param {PollStartEvent} poll The poll start event.
   */


  _createClass(PollResponseEvent, [{
    key: "answerIds",
    get:
    /**
     * The provided answers for the poll. Note that this may be falsy/unpredictable if
     * the `spoiled` property is true.
     */
    function get() {
      return this.internalAnswerIds;
    }
    /**
     * The poll start event ID referenced by the response.
     */

  }, {
    key: "spoiled",
    get:
    /**
     * Whether the vote is spoiled.
     */
    function get() {
      return this.internalSpoiled;
    }
  }, {
    key: "validateAgainst",
    value: function validateAgainst(poll) {
      var response = _poll_types.M_POLL_RESPONSE.findIn(this.wireContent);

      if (!Array.isArray(response === null || response === void 0 ? void 0 : response.answers)) {
        this.internalSpoiled = true;
        this.internalAnswerIds = [];
        return;
      }

      var answers = response.answers;

      if (answers.some(function (a) {
        return typeof a !== "string";
      }) || answers.length === 0) {
        this.internalSpoiled = true;
        this.internalAnswerIds = [];
        return;
      }

      if (poll) {
        if (answers.some(function (a) {
          return !poll.answers.some(function (pa) {
            return pa.id === a;
          });
        })) {
          this.internalSpoiled = true;
          this.internalAnswerIds = [];
          return;
        }

        answers = answers.slice(0, poll.maxSelections);
      }

      this.internalAnswerIds = answers;
      this.internalSpoiled = false;
    }
  }, {
    key: "isEquivalentTo",
    value: function isEquivalentTo(primaryEventType) {
      return (0, _events.isEventTypeSame)(primaryEventType, _poll_types.M_POLL_RESPONSE);
    }
  }, {
    key: "serialize",
    value: function serialize() {
      return {
        type: _poll_types.M_POLL_RESPONSE.name,
        content: _defineProperty({
          "m.relates_to": {
            rel_type: _relationship_types.REFERENCE_RELATION.name,
            event_id: this.pollEventId
          }
        }, _poll_types.M_POLL_RESPONSE.name, {
          answers: this.spoiled ? undefined : this.answerIds
        })
      };
    }
    /**
     * Creates a new PollResponseEvent from a set of answers. To spoil the vote, pass an empty
     * answers array.
     * @param {string} answers The user's answers. Should be valid from a poll's answer IDs.
     * @param {string} pollEventId The poll start event ID.
     * @returns {PollStartEvent} The representative poll response event.
     */

  }], [{
    key: "from",
    value: function from(answers, pollEventId) {
      return new PollResponseEvent({
        type: _poll_types.M_POLL_RESPONSE.name,
        content: _defineProperty({
          "m.relates_to": {
            rel_type: _relationship_types.REFERENCE_RELATION.name,
            event_id: pollEventId
          }
        }, _poll_types.M_POLL_RESPONSE.name, {
          answers: answers
        })
      });
    }
  }]);

  return PollResponseEvent;
}(_ExtensibleEvent2.ExtensibleEvent);

exports.PollResponseEvent = PollResponseEvent;