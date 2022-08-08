"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.NamespacedMap = void 0;

function _createForOfIteratorHelper(o, allowArrayLike) { var it = typeof Symbol !== "undefined" && o[Symbol.iterator] || o["@@iterator"]; if (!it) { if (Array.isArray(o) || (it = _unsupportedIterableToArray(o)) || allowArrayLike && o && typeof o.length === "number") { if (it) o = it; var i = 0; var F = function F() {}; return { s: F, n: function n() { if (i >= o.length) return { done: true }; return { done: false, value: o[i++] }; }, e: function e(_e) { throw _e; }, f: F }; } throw new TypeError("Invalid attempt to iterate non-iterable instance.\nIn order to be iterable, non-array objects must have a [Symbol.iterator]() method."); } var normalCompletion = true, didErr = false, err; return { s: function s() { it = it.call(o); }, n: function n() { var step = it.next(); normalCompletion = step.done; return step; }, e: function e(_e2) { didErr = true; err = _e2; }, f: function f() { try { if (!normalCompletion && it["return"] != null) it["return"](); } finally { if (didErr) throw err; } } }; }

function _unsupportedIterableToArray(o, minLen) { if (!o) return; if (typeof o === "string") return _arrayLikeToArray(o, minLen); var n = Object.prototype.toString.call(o).slice(8, -1); if (n === "Object" && o.constructor) n = o.constructor.name; if (n === "Map" || n === "Set") return Array.from(o); if (n === "Arguments" || /^(?:Ui|I)nt(?:8|16|32)(?:Clamped)?Array$/.test(n)) return _arrayLikeToArray(o, minLen); }

function _arrayLikeToArray(arr, len) { if (len == null || len > arr.length) len = arr.length; for (var i = 0, arr2 = new Array(len); i < len; i++) { arr2[i] = arr[i]; } return arr2; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } }

function _createClass(Constructor, protoProps, staticProps) { if (protoProps) _defineProperties(Constructor.prototype, protoProps); if (staticProps) _defineProperties(Constructor, staticProps); Object.defineProperty(Constructor, "prototype", { writable: false }); return Constructor; }

function _defineProperty(obj, key, value) { if (key in obj) { Object.defineProperty(obj, key, { value: value, enumerable: true, configurable: true, writable: true }); } else { obj[key] = value; } return obj; }

/**
 * A `Map` implementation which accepts a NamespacedValue as a key, and arbitrary value. The
 * namespaced value must be a string type.
 */
var NamespacedMap = /*#__PURE__*/function () {
  // protected to make tests happy for access

  /**
   * Creates a new map with optional seed data.
   * @param {Array<[NS, V]>} initial The seed data.
   */
  function NamespacedMap(initial) {
    _classCallCheck(this, NamespacedMap);

    _defineProperty(this, "internalMap", new Map());

    if (initial) {
      var _iterator = _createForOfIteratorHelper(initial),
          _step;

      try {
        for (_iterator.s(); !(_step = _iterator.n()).done;) {
          var val = _step.value;
          this.set(val[0], val[1]);
        }
      } catch (err) {
        _iterator.e(err);
      } finally {
        _iterator.f();
      }
    }
  }
  /**
   * Gets a value from the map. If the value does not exist under
   * either namespace option, falsy is returned.
   * @param {NS} key The key.
   * @returns {Optional<V>} The value, or falsy.
   */


  _createClass(NamespacedMap, [{
    key: "get",
    value: function get(key) {
      if (key.name && this.internalMap.has(key.name)) {
        return this.internalMap.get(key.name);
      }

      if (key.altName && this.internalMap.has(key.altName)) {
        return this.internalMap.get(key.altName);
      }

      return null;
    }
    /**
     * Sets a value in the map.
     * @param {NS} key The key.
     * @param {V} val The value.
     */

  }, {
    key: "set",
    value: function set(key, val) {
      if (key.name) {
        this.internalMap.set(key.name, val);
      }

      if (key.altName) {
        this.internalMap.set(key.altName, val);
      }
    }
    /**
     * Determines if any of the valid namespaced values are present
     * in the map.
     * @param {NS} key The key.
     * @returns {boolean} True if present.
     */

  }, {
    key: "has",
    value: function has(key) {
      return !!this.get(key);
    }
    /**
     * Removes all the namespaced values from the map.
     * @param {NS} key The key.
     */

  }, {
    key: "delete",
    value: function _delete(key) {
      if (key.name) {
        this.internalMap["delete"](key.name);
      }

      if (key.altName) {
        this.internalMap["delete"](key.altName);
      }
    }
    /**
     * Determines if the map contains a specific namespaced value
     * instead of the parent NS type.
     * @param {string} key The key.
     * @returns {boolean} True if present.
     */

  }, {
    key: "hasNamespaced",
    value: function hasNamespaced(key) {
      return this.internalMap.has(key);
    }
    /**
     * Gets a specific namespaced value from the map instead of the
     * parent NS type. Returns falsy if not found.
     * @param {string} key The key.
     * @returns {Optional<V>} The value, or falsy.
     */

  }, {
    key: "getNamespaced",
    value: function getNamespaced(key) {
      return this.internalMap.get(key);
    }
  }]);

  return NamespacedMap;
}();

exports.NamespacedMap = NamespacedMap;