"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.WidgetParser = void 0;

var _Widget = require("./Widget");

var _url = require("./validation/url");

function _createForOfIteratorHelper(o, allowArrayLike) { var it = typeof Symbol !== "undefined" && o[Symbol.iterator] || o["@@iterator"]; if (!it) { if (Array.isArray(o) || (it = _unsupportedIterableToArray(o)) || allowArrayLike && o && typeof o.length === "number") { if (it) o = it; var i = 0; var F = function F() {}; return { s: F, n: function n() { if (i >= o.length) return { done: true }; return { done: false, value: o[i++] }; }, e: function e(_e) { throw _e; }, f: F }; } throw new TypeError("Invalid attempt to iterate non-iterable instance.\nIn order to be iterable, non-array objects must have a [Symbol.iterator]() method."); } var normalCompletion = true, didErr = false, err; return { s: function s() { it = it.call(o); }, n: function n() { var step = it.next(); normalCompletion = step.done; return step; }, e: function e(_e2) { didErr = true; err = _e2; }, f: function f() { try { if (!normalCompletion && it["return"] != null) it["return"](); } finally { if (didErr) throw err; } } }; }

function _unsupportedIterableToArray(o, minLen) { if (!o) return; if (typeof o === "string") return _arrayLikeToArray(o, minLen); var n = Object.prototype.toString.call(o).slice(8, -1); if (n === "Object" && o.constructor) n = o.constructor.name; if (n === "Map" || n === "Set") return Array.from(o); if (n === "Arguments" || /^(?:Ui|I)nt(?:8|16|32)(?:Clamped)?Array$/.test(n)) return _arrayLikeToArray(o, minLen); }

function _arrayLikeToArray(arr, len) { if (len == null || len > arr.length) len = arr.length; for (var i = 0, arr2 = new Array(len); i < len; i++) { arr2[i] = arr[i]; } return arr2; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } }

function _createClass(Constructor, protoProps, staticProps) { if (protoProps) _defineProperties(Constructor.prototype, protoProps); if (staticProps) _defineProperties(Constructor, staticProps); Object.defineProperty(Constructor, "prototype", { writable: false }); return Constructor; }

var WidgetParser = /*#__PURE__*/function () {
  function WidgetParser() {// private constructor because this is a util class

    _classCallCheck(this, WidgetParser);
  }
  /**
   * Parses widgets from the "m.widgets" account data event. This will always
   * return an array, though may be empty if no valid widgets were found.
   * @param {IAccountDataWidgets} content The content of the "m.widgets" account data.
   * @returns {Widget[]} The widgets in account data, or an empty array.
   */


  _createClass(WidgetParser, null, [{
    key: "parseAccountData",
    value: function parseAccountData(content) {
      if (!content) return [];
      var result = [];

      for (var _i = 0, _Object$keys = Object.keys(content); _i < _Object$keys.length; _i++) {
        var _widgetId = _Object$keys[_i];
        var roughWidget = content[_widgetId];
        if (!roughWidget) continue;
        if (roughWidget.type !== "m.widget" && roughWidget.type !== "im.vector.modular.widgets") continue;
        if (!roughWidget.sender) continue;
        var probableWidgetId = roughWidget.state_key || roughWidget.id;
        if (probableWidgetId !== _widgetId) continue;
        var asStateEvent = {
          content: roughWidget.content,
          sender: roughWidget.sender,
          type: "m.widget",
          state_key: _widgetId,
          event_id: "$example",
          room_id: "!example",
          origin_server_ts: 1
        };
        var widget = WidgetParser.parseRoomWidget(asStateEvent);
        if (widget) result.push(widget);
      }

      return result;
    }
    /**
     * Parses all the widgets possible in the given array. This will always return
     * an array, though may be empty if no widgets could be parsed.
     * @param {IStateEvent[]} currentState The room state to parse.
     * @returns {Widget[]} The widgets in the state, or an empty array.
     */

  }, {
    key: "parseWidgetsFromRoomState",
    value: function parseWidgetsFromRoomState(currentState) {
      if (!currentState) return [];
      var result = [];

      var _iterator = _createForOfIteratorHelper(currentState),
          _step;

      try {
        for (_iterator.s(); !(_step = _iterator.n()).done;) {
          var state = _step.value;
          var widget = WidgetParser.parseRoomWidget(state);
          if (widget) result.push(widget);
        }
      } catch (err) {
        _iterator.e(err);
      } finally {
        _iterator.f();
      }

      return result;
    }
    /**
     * Parses a state event into a widget. If the state event does not represent
     * a widget (wrong event type, invalid widget, etc) then null is returned.
     * @param {IStateEvent} stateEvent The state event.
     * @returns {Widget|null} The widget, or null if invalid
     */

  }, {
    key: "parseRoomWidget",
    value: function parseRoomWidget(stateEvent) {
      if (!stateEvent) return null; // TODO: [Legacy] Remove legacy support

      if (stateEvent.type !== "m.widget" && stateEvent.type !== "im.vector.modular.widgets") {
        return null;
      } // Dev note: Throughout this function we have null safety to ensure that
      // if the caller did not supply something useful that we don't error. This
      // is done against the requirements of the interface because not everyone
      // will have an interface to validate against.


      var content = stateEvent.content || {}; // Form our best approximation of a widget with the information we have

      var estimatedWidget = {
        id: stateEvent.state_key,
        creatorUserId: content['creatorUserId'] || stateEvent.sender,
        name: content['name'],
        type: content['type'],
        url: content['url'],
        waitForIframeLoad: content['waitForIframeLoad'],
        data: content['data']
      }; // Finally, process that widget

      return WidgetParser.processEstimatedWidget(estimatedWidget);
    }
  }, {
    key: "processEstimatedWidget",
    value: function processEstimatedWidget(widget) {
      // Validate that the widget has the best chance of passing as a widget
      if (!widget.id || !widget.creatorUserId || !widget.type) {
        return null;
      }

      if (!(0, _url.isValidUrl)(widget.url)) {
        return null;
      } // TODO: Validate data for known widget types


      return new _Widget.Widget(widget);
    }
  }]);

  return WidgetParser;
}();

exports.WidgetParser = WidgetParser;