"use strict";

function _typeof(obj) { "@babel/helpers - typeof"; return _typeof = "function" == typeof Symbol && "symbol" == typeof Symbol.iterator ? function (obj) { return typeof obj; } : function (obj) { return obj && "function" == typeof Symbol && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj; }, _typeof(obj); }

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.PollStartEvent = exports.PollAnswerSubevent = void 0;

var _poll_types = require("./poll_types");

var _MessageEvent2 = require("./MessageEvent");

var _message_types = require("./message_types");

var _InvalidEventError = require("../InvalidEventError");

var _NamespacedValue = require("../NamespacedValue");

var _events = require("../utility/events");

var _ExtensibleEvent2 = require("./ExtensibleEvent");

function _toConsumableArray(arr) { return _arrayWithoutHoles(arr) || _iterableToArray(arr) || _unsupportedIterableToArray(arr) || _nonIterableSpread(); }

function _nonIterableSpread() { throw new TypeError("Invalid attempt to spread non-iterable instance.\nIn order to be iterable, non-array objects must have a [Symbol.iterator]() method."); }

function _unsupportedIterableToArray(o, minLen) { if (!o) return; if (typeof o === "string") return _arrayLikeToArray(o, minLen); var n = Object.prototype.toString.call(o).slice(8, -1); if (n === "Object" && o.constructor) n = o.constructor.name; if (n === "Map" || n === "Set") return Array.from(o); if (n === "Arguments" || /^(?:Ui|I)nt(?:8|16|32)(?:Clamped)?Array$/.test(n)) return _arrayLikeToArray(o, minLen); }

function _iterableToArray(iter) { if (typeof Symbol !== "undefined" && iter[Symbol.iterator] != null || iter["@@iterator"] != null) return Array.from(iter); }

function _arrayWithoutHoles(arr) { if (Array.isArray(arr)) return _arrayLikeToArray(arr); }

function _arrayLikeToArray(arr, len) { if (len == null || len > arr.length) len = arr.length; for (var i = 0, arr2 = new Array(len); i < len; i++) { arr2[i] = arr[i]; } return arr2; }

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
 * Represents a poll answer. Note that this is represented as a subtype and is
 * not registered as a parsable event - it is implied for usage exclusively
 * within the PollStartEvent parsing.
 */
var PollAnswerSubevent = /*#__PURE__*/function (_MessageEvent) {
  _inherits(PollAnswerSubevent, _MessageEvent);

  var _super = _createSuper(PollAnswerSubevent);

  /**
   * The answer ID.
   */
  function PollAnswerSubevent(wireFormat) {
    var _this;

    _classCallCheck(this, PollAnswerSubevent);

    _this = _super.call(this, wireFormat);

    _defineProperty(_assertThisInitialized(_this), "id", void 0);

    var id = wireFormat.content.id;

    if (!id || typeof id !== "string") {
      throw new _InvalidEventError.InvalidEventError("Answer ID must be a non-empty string");
    }

    _this.id = id;
    return _this;
  }

  _createClass(PollAnswerSubevent, [{
    key: "serialize",
    value: function serialize() {
      return {
        type: "org.matrix.sdk.poll.answer",
        content: _objectSpread({
          id: this.id
        }, this.serializeMMessageOnly())
      };
    }
    /**
     * Creates a new PollAnswerSubevent from ID and text.
     * @param {string} id The answer ID (unique within the poll).
     * @param {string} text The text.
     * @returns {PollAnswerSubevent} The representative answer.
     */

  }], [{
    key: "from",
    value: function from(id, text) {
      return new PollAnswerSubevent({
        type: "org.matrix.sdk.poll.answer",
        content: _defineProperty({
          id: id
        }, _message_types.M_TEXT.name, text)
      });
    }
  }]);

  return PollAnswerSubevent;
}(_MessageEvent2.MessageEvent);
/**
 * Represents a poll start event.
 */


exports.PollAnswerSubevent = PollAnswerSubevent;

var PollStartEvent = /*#__PURE__*/function (_ExtensibleEvent) {
  _inherits(PollStartEvent, _ExtensibleEvent);

  var _super2 = _createSuper(PollStartEvent);

  /**
   * The question being asked, as a MessageEvent node.
   */

  /**
   * The interpreted kind of poll. Note that this will infer a value that is known to the
   * SDK rather than verbatim - this means unknown types will be represented as undisclosed
   * polls.
   *
   * To get the raw kind, use rawKind.
   */

  /**
   * The true kind as provided by the event sender. Might not be valid.
   */

  /**
   * The maximum number of selections a user is allowed to make.
   */

  /**
   * The possible answers for the poll.
   */

  /**
   * Creates a new PollStartEvent from a pure format. Note that the event is *not*
   * parsed here: it will be treated as a literal m.poll.start primary typed event.
   * @param {IPartialEvent<M_POLL_START_EVENT_CONTENT>} wireFormat The event.
   */
  function PollStartEvent(wireFormat) {
    var _this2;

    _classCallCheck(this, PollStartEvent);

    _this2 = _super2.call(this, wireFormat);

    _defineProperty(_assertThisInitialized(_this2), "question", void 0);

    _defineProperty(_assertThisInitialized(_this2), "kind", void 0);

    _defineProperty(_assertThisInitialized(_this2), "rawKind", void 0);

    _defineProperty(_assertThisInitialized(_this2), "maxSelections", void 0);

    _defineProperty(_assertThisInitialized(_this2), "answers", void 0);

    var poll = _poll_types.M_POLL_START.findIn(_this2.wireContent);

    if (!poll.question) {
      throw new _InvalidEventError.InvalidEventError("A question is required");
    }

    _this2.question = new _MessageEvent2.MessageEvent({
      type: "org.matrix.sdk.poll.question",
      content: poll.question
    });
    _this2.rawKind = poll.kind;

    if (_poll_types.M_POLL_KIND_DISCLOSED.matches(_this2.rawKind)) {
      _this2.kind = _poll_types.M_POLL_KIND_DISCLOSED;
    } else {
      _this2.kind = _poll_types.M_POLL_KIND_UNDISCLOSED; // default & assumed value
    }

    _this2.maxSelections = Number.isFinite(poll.max_selections) && poll.max_selections > 0 ? poll.max_selections : 1;

    if (!Array.isArray(poll.answers)) {
      throw new _InvalidEventError.InvalidEventError("Poll answers must be an array");
    }

    var answers = poll.answers.slice(0, 20).map(function (a) {
      return new PollAnswerSubevent({
        type: "org.matrix.sdk.poll.answer",
        content: a
      });
    });

    if (answers.length <= 0) {
      throw new _InvalidEventError.InvalidEventError("No answers available");
    }

    _this2.answers = answers;
    return _this2;
  }

  _createClass(PollStartEvent, [{
    key: "isEquivalentTo",
    value: function isEquivalentTo(primaryEventType) {
      return (0, _events.isEventTypeSame)(primaryEventType, _poll_types.M_POLL_START);
    }
  }, {
    key: "serialize",
    value: function serialize() {
      var _content2;

      return {
        type: _poll_types.M_POLL_START.name,
        content: (_content2 = {}, _defineProperty(_content2, _poll_types.M_POLL_START.name, {
          question: this.question.serialize().content,
          kind: this.rawKind,
          max_selections: this.maxSelections,
          answers: this.answers.map(function (a) {
            return a.serialize().content;
          })
        }), _defineProperty(_content2, _message_types.M_TEXT.name, "".concat(this.question.text, "\n").concat(this.answers.map(function (a, i) {
          return "".concat(i + 1, ". ").concat(a.text);
        }).join("\n"))), _content2)
      };
    }
    /**
     * Creates a new PollStartEvent from question, answers, and metadata.
     * @param {string} question The question to ask.
     * @param {string} answers The answers. Should be unique within each other.
     * @param {KNOWN_POLL_KIND|string} kind The kind of poll.
     * @param {number} maxSelections The maximum number of selections. Must be 1 or higher.
     * @returns {PollStartEvent} The representative poll start event.
     */

  }], [{
    key: "from",
    value: function from(question, answers, kind) {
      var _content3;

      var maxSelections = arguments.length > 3 && arguments[3] !== undefined ? arguments[3] : 1;
      return new PollStartEvent({
        type: _poll_types.M_POLL_START.name,
        content: (_content3 = {}, _defineProperty(_content3, _message_types.M_TEXT.name, question), _defineProperty(_content3, _poll_types.M_POLL_START.name, {
          question: _defineProperty({}, _message_types.M_TEXT.name, question),
          kind: kind instanceof _NamespacedValue.NamespacedValue ? kind.name : kind,
          max_selections: maxSelections,
          answers: answers.map(function (a) {
            return _defineProperty({
              id: makeId()
            }, _message_types.M_TEXT.name, a);
          })
        }), _content3)
      });
    }
  }]);

  return PollStartEvent;
}(_ExtensibleEvent2.ExtensibleEvent);

exports.PollStartEvent = PollStartEvent;
var LETTERS = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";

function makeId() {
  return _toConsumableArray(Array(16)).map(function () {
    return LETTERS.charAt(Math.floor(Math.random() * LETTERS.length));
  }).join('');
}