"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.Widget = void 0;

var _utils = require("./validation/utils");

var _ = require("..");

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } }

function _createClass(Constructor, protoProps, staticProps) { if (protoProps) _defineProperties(Constructor.prototype, protoProps); if (staticProps) _defineProperties(Constructor, staticProps); Object.defineProperty(Constructor, "prototype", { writable: false }); return Constructor; }

/**
 * Represents the barest form of widget.
 */
var Widget = /*#__PURE__*/function () {
  function Widget(definition) {
    _classCallCheck(this, Widget);

    this.definition = definition;
    if (!this.definition) throw new Error("Definition is required");
    (0, _utils.assertPresent)(definition, "id");
    (0, _utils.assertPresent)(definition, "creatorUserId");
    (0, _utils.assertPresent)(definition, "type");
    (0, _utils.assertPresent)(definition, "url");
  }
  /**
   * The user ID who created the widget.
   */


  _createClass(Widget, [{
    key: "creatorUserId",
    get: function get() {
      return this.definition.creatorUserId;
    }
    /**
     * The type of widget.
     */

  }, {
    key: "type",
    get: function get() {
      return this.definition.type;
    }
    /**
     * The ID of the widget.
     */

  }, {
    key: "id",
    get: function get() {
      return this.definition.id;
    }
    /**
     * The name of the widget, or null if not set.
     */

  }, {
    key: "name",
    get: function get() {
      return this.definition.name || null;
    }
    /**
     * The title for the widget, or null if not set.
     */

  }, {
    key: "title",
    get: function get() {
      return this.rawData.title || null;
    }
    /**
     * The templated URL for the widget.
     */

  }, {
    key: "templateUrl",
    get: function get() {
      return this.definition.url;
    }
    /**
     * The origin for this widget.
     */

  }, {
    key: "origin",
    get: function get() {
      return new URL(this.templateUrl).origin;
    }
    /**
     * Whether or not the client should wait for the iframe to load. Defaults
     * to true.
     */

  }, {
    key: "waitForIframeLoad",
    get: function get() {
      if (this.definition.waitForIframeLoad === false) return false;
      if (this.definition.waitForIframeLoad === true) return true;
      return true; // default true
    }
    /**
     * The raw data for the widget. This will always be defined, though
     * may be empty.
     */

  }, {
    key: "rawData",
    get: function get() {
      return this.definition.data || {};
    }
    /**
     * Gets a complete widget URL for the client to render.
     * @param {ITemplateParams} params The template parameters.
     * @returns {string} A templated URL.
     */

  }, {
    key: "getCompleteUrl",
    value: function getCompleteUrl(params) {
      return (0, _.runTemplate)(this.templateUrl, this.definition, params);
    }
  }]);

  return Widget;
}();

exports.Widget = Widget;