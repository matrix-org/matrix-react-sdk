"use strict";

function _typeof(obj) { "@babel/helpers - typeof"; return _typeof = "function" == typeof Symbol && "symbol" == typeof Symbol.iterator ? function (obj) { return typeof obj; } : function (obj) { return obj && "function" == typeof Symbol && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj; }, _typeof(obj); }

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.MessageEvent = void 0;

var _ExtensibleEvent2 = require("./ExtensibleEvent");

var _types = require("../types");

var _InvalidEventError = require("../InvalidEventError");

var _message_types = require("./message_types");

var _events = require("../utility/events");

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
 * Represents a message event. Message events are the simplest form of event with
 * just text (optionally of different mimetypes, like HTML).
 *
 * Message events can additionally be an Emote or Notice, though typically those
 * are represented as EmoteEvent and NoticeEvent respectively.
 */
var MessageEvent = /*#__PURE__*/function (_ExtensibleEvent) {
  _inherits(MessageEvent, _ExtensibleEvent);

  var _super = _createSuper(MessageEvent);

  /**
   * The default text for the event.
   */

  /**
   * The default HTML for the event, if provided.
   */

  /**
   * All the different renderings of the message. Note that this is the same
   * format as an m.message body but may contain elements not found directly
   * in the event content: this is because this is interpreted based off the
   * other information available in the event.
   */

  /**
   * Creates a new MessageEvent from a pure format. Note that the event is
   * *not* parsed here: it will be treated as a literal m.message primary
   * typed event.
   * @param {IPartialEvent<M_MESSAGE_EVENT_CONTENT>} wireFormat The event.
   */
  function MessageEvent(wireFormat) {
    var _this;

    _classCallCheck(this, MessageEvent);

    _this = _super.call(this, wireFormat);

    _defineProperty(_assertThisInitialized(_this), "text", void 0);

    _defineProperty(_assertThisInitialized(_this), "html", void 0);

    _defineProperty(_assertThisInitialized(_this), "renderings", void 0);

    var mmessage = _message_types.M_MESSAGE.findIn(_this.wireContent);

    var mtext = _message_types.M_TEXT.findIn(_this.wireContent);

    var mhtml = _message_types.M_HTML.findIn(_this.wireContent);

    if ((0, _types.isProvided)(mmessage)) {
      if (!Array.isArray(mmessage)) {
        throw new _InvalidEventError.InvalidEventError("m.message contents must be an array");
      }

      var text = mmessage.find(function (r) {
        return !(0, _types.isProvided)(r.mimetype) || r.mimetype === "text/plain";
      });
      var html = mmessage.find(function (r) {
        return r.mimetype === "text/html";
      });
      if (!text) throw new _InvalidEventError.InvalidEventError("m.message is missing a plain text representation");
      _this.text = text.body;
      _this.html = html === null || html === void 0 ? void 0 : html.body;
      _this.renderings = mmessage;
    } else if ((0, _types.isOptionalAString)(mtext)) {
      _this.text = mtext;
      _this.html = mhtml;
      _this.renderings = [{
        body: mtext,
        mimetype: "text/plain"
      }];

      if (_this.html) {
        _this.renderings.push({
          body: _this.html,
          mimetype: "text/html"
        });
      }
    } else {
      throw new _InvalidEventError.InvalidEventError("Missing textual representation for event");
    }

    return _this;
  }
  /**
   * Gets whether this message is considered an "emote". Note that a message
   * might be an emote and notice at the same time: while technically possible,
   * the event should be interpreted as one or the other.
   */


  _createClass(MessageEvent, [{
    key: "isEmote",
    get: function get() {
      return _message_types.M_EMOTE.matches(this.wireFormat.type) || (0, _types.isProvided)(_message_types.M_EMOTE.findIn(this.wireFormat.content));
    }
    /**
     * Gets whether this message is considered a "notice". Note that a message
     * might be an emote and notice at the same time: while technically possible,
     * the event should be interpreted as one or the other.
     */

  }, {
    key: "isNotice",
    get: function get() {
      return _message_types.M_NOTICE.matches(this.wireFormat.type) || (0, _types.isProvided)(_message_types.M_NOTICE.findIn(this.wireFormat.content));
    }
  }, {
    key: "isEquivalentTo",
    value: function isEquivalentTo(primaryEventType) {
      return (0, _events.isEventTypeSame)(primaryEventType, _message_types.M_MESSAGE);
    }
  }, {
    key: "serializeMMessageOnly",
    value: function serializeMMessageOnly() {
      var messageRendering = _defineProperty({}, _message_types.M_MESSAGE.name, this.renderings); // Use the shorthand if it's just a simple text event


      if (this.renderings.length === 1) {
        var mime = this.renderings[0].mimetype;

        if (mime === undefined || mime === "text/plain") {
          messageRendering = _defineProperty({}, _message_types.M_TEXT.name, this.renderings[0].body);
        }
      }

      return messageRendering;
    }
  }, {
    key: "serialize",
    value: function serialize() {
      var _this$html;

      return {
        type: "m.room.message",
        content: _objectSpread(_objectSpread({}, this.serializeMMessageOnly()), {}, {
          body: this.text,
          msgtype: "m.text",
          format: this.html ? "org.matrix.custom.html" : undefined,
          formatted_body: (_this$html = this.html) !== null && _this$html !== void 0 ? _this$html : undefined
        })
      };
    }
    /**
     * Creates a new MessageEvent from text and HTML.
     * @param {string} text The text.
     * @param {string} html Optional HTML.
     * @returns {MessageEvent} The representative message event.
     */

  }], [{
    key: "from",
    value: function from(text, html) {
      var _content;

      return new MessageEvent({
        type: _message_types.M_MESSAGE.name,
        content: (_content = {}, _defineProperty(_content, _message_types.M_TEXT.name, text), _defineProperty(_content, _message_types.M_HTML.name, html), _content)
      });
    }
  }]);

  return MessageEvent;
}(_ExtensibleEvent2.ExtensibleEvent);

exports.MessageEvent = MessageEvent;