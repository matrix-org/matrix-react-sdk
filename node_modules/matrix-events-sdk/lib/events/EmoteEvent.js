"use strict";

function _typeof(obj) { "@babel/helpers - typeof"; return _typeof = "function" == typeof Symbol && "symbol" == typeof Symbol.iterator ? function (obj) { return typeof obj; } : function (obj) { return obj && "function" == typeof Symbol && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj; }, _typeof(obj); }

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.EmoteEvent = void 0;

var _MessageEvent2 = require("./MessageEvent");

var _message_types = require("./message_types");

var _events = require("../utility/events");

function _defineProperty(obj, key, value) { if (key in obj) { Object.defineProperty(obj, key, { value: value, enumerable: true, configurable: true, writable: true }); } else { obj[key] = value; } return obj; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } }

function _createClass(Constructor, protoProps, staticProps) { if (protoProps) _defineProperties(Constructor.prototype, protoProps); if (staticProps) _defineProperties(Constructor, staticProps); Object.defineProperty(Constructor, "prototype", { writable: false }); return Constructor; }

function _get() { if (typeof Reflect !== "undefined" && Reflect.get) { _get = Reflect.get; } else { _get = function _get(target, property, receiver) { var base = _superPropBase(target, property); if (!base) return; var desc = Object.getOwnPropertyDescriptor(base, property); if (desc.get) { return desc.get.call(arguments.length < 3 ? target : receiver); } return desc.value; }; } return _get.apply(this, arguments); }

function _superPropBase(object, property) { while (!Object.prototype.hasOwnProperty.call(object, property)) { object = _getPrototypeOf(object); if (object === null) break; } return object; }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function"); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, writable: true, configurable: true } }); Object.defineProperty(subClass, "prototype", { writable: false }); if (superClass) _setPrototypeOf(subClass, superClass); }

function _setPrototypeOf(o, p) { _setPrototypeOf = Object.setPrototypeOf || function _setPrototypeOf(o, p) { o.__proto__ = p; return o; }; return _setPrototypeOf(o, p); }

function _createSuper(Derived) { var hasNativeReflectConstruct = _isNativeReflectConstruct(); return function _createSuperInternal() { var Super = _getPrototypeOf(Derived), result; if (hasNativeReflectConstruct) { var NewTarget = _getPrototypeOf(this).constructor; result = Reflect.construct(Super, arguments, NewTarget); } else { result = Super.apply(this, arguments); } return _possibleConstructorReturn(this, result); }; }

function _possibleConstructorReturn(self, call) { if (call && (_typeof(call) === "object" || typeof call === "function")) { return call; } else if (call !== void 0) { throw new TypeError("Derived constructors may only return object or undefined"); } return _assertThisInitialized(self); }

function _assertThisInitialized(self) { if (self === void 0) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return self; }

function _isNativeReflectConstruct() { if (typeof Reflect === "undefined" || !Reflect.construct) return false; if (Reflect.construct.sham) return false; if (typeof Proxy === "function") return true; try { Boolean.prototype.valueOf.call(Reflect.construct(Boolean, [], function () {})); return true; } catch (e) { return false; } }

function _getPrototypeOf(o) { _getPrototypeOf = Object.setPrototypeOf ? Object.getPrototypeOf : function _getPrototypeOf(o) { return o.__proto__ || Object.getPrototypeOf(o); }; return _getPrototypeOf(o); }

// Emote events are just decorated message events

/**
 * Represents an emote. This is essentially a MessageEvent with
 * emote characteristics considered.
 */
var EmoteEvent = /*#__PURE__*/function (_MessageEvent) {
  _inherits(EmoteEvent, _MessageEvent);

  var _super = _createSuper(EmoteEvent);

  function EmoteEvent(wireFormat) {
    _classCallCheck(this, EmoteEvent);

    return _super.call(this, wireFormat);
  }

  _createClass(EmoteEvent, [{
    key: "isEmote",
    get: function get() {
      return true; // override
    }
  }, {
    key: "isEquivalentTo",
    value: function isEquivalentTo(primaryEventType) {
      return (0, _events.isEventTypeSame)(primaryEventType, _message_types.M_EMOTE) || _get(_getPrototypeOf(EmoteEvent.prototype), "isEquivalentTo", this).call(this, primaryEventType);
    }
  }, {
    key: "serialize",
    value: function serialize() {
      var message = _get(_getPrototypeOf(EmoteEvent.prototype), "serialize", this).call(this);

      message.content['msgtype'] = "m.emote";
      return message;
    }
    /**
     * Creates a new EmoteEvent from text and HTML.
     * @param {string} text The text.
     * @param {string} html Optional HTML.
     * @returns {MessageEvent} The representative message event.
     */

  }], [{
    key: "from",
    value: function from(text, html) {
      var _content;

      return new EmoteEvent({
        type: _message_types.M_EMOTE.name,
        content: (_content = {}, _defineProperty(_content, _message_types.M_TEXT.name, text), _defineProperty(_content, _message_types.M_HTML.name, html), _content)
      });
    }
  }]);

  return EmoteEvent;
}(_MessageEvent2.MessageEvent);

exports.EmoteEvent = EmoteEvent;