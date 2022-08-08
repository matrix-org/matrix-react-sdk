"use strict";

function _typeof(obj) { "@babel/helpers - typeof"; return _typeof = "function" == typeof Symbol && "symbol" == typeof Symbol.iterator ? function (obj) { return typeof obj; } : function (obj) { return obj && "function" == typeof Symbol && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj; }, _typeof(obj); }

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.UnstableValue = exports.NamespacedValue = void 0;

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function"); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, writable: true, configurable: true } }); Object.defineProperty(subClass, "prototype", { writable: false }); if (superClass) _setPrototypeOf(subClass, superClass); }

function _setPrototypeOf(o, p) { _setPrototypeOf = Object.setPrototypeOf || function _setPrototypeOf(o, p) { o.__proto__ = p; return o; }; return _setPrototypeOf(o, p); }

function _createSuper(Derived) { var hasNativeReflectConstruct = _isNativeReflectConstruct(); return function _createSuperInternal() { var Super = _getPrototypeOf(Derived), result; if (hasNativeReflectConstruct) { var NewTarget = _getPrototypeOf(this).constructor; result = Reflect.construct(Super, arguments, NewTarget); } else { result = Super.apply(this, arguments); } return _possibleConstructorReturn(this, result); }; }

function _possibleConstructorReturn(self, call) { if (call && (_typeof(call) === "object" || typeof call === "function")) { return call; } else if (call !== void 0) { throw new TypeError("Derived constructors may only return object or undefined"); } return _assertThisInitialized(self); }

function _assertThisInitialized(self) { if (self === void 0) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return self; }

function _isNativeReflectConstruct() { if (typeof Reflect === "undefined" || !Reflect.construct) return false; if (Reflect.construct.sham) return false; if (typeof Proxy === "function") return true; try { Boolean.prototype.valueOf.call(Reflect.construct(Boolean, [], function () {})); return true; } catch (e) { return false; } }

function _getPrototypeOf(o) { _getPrototypeOf = Object.setPrototypeOf ? Object.getPrototypeOf : function _getPrototypeOf(o) { return o.__proto__ || Object.getPrototypeOf(o); }; return _getPrototypeOf(o); }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } }

function _createClass(Constructor, protoProps, staticProps) { if (protoProps) _defineProperties(Constructor.prototype, protoProps); if (staticProps) _defineProperties(Constructor, staticProps); Object.defineProperty(Constructor, "prototype", { writable: false }); return Constructor; }

/*
Copyright 2021 - 2022 The Matrix.org Foundation C.I.C.

Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

    http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.
*/

/**
 * Represents a simple Matrix namespaced value. This will assume that if a stable prefix
 * is provided that the stable prefix should be used when representing the identifier.
 */
var NamespacedValue = /*#__PURE__*/function () {
  // Stable is optional, but one of the two parameters is required, hence the weird-looking types.
  // Goal is to have developers explicitly say there is no stable value (if applicable).
  function NamespacedValue(stable, unstable) {
    _classCallCheck(this, NamespacedValue);

    this.stable = stable;
    this.unstable = unstable;

    if (!this.unstable && !this.stable) {
      throw new Error("One of stable or unstable values must be supplied");
    }
  }

  _createClass(NamespacedValue, [{
    key: "name",
    get: function get() {
      if (this.stable) {
        return this.stable;
      }

      return this.unstable;
    }
  }, {
    key: "altName",
    get: function get() {
      if (!this.stable) {
        return null;
      }

      return this.unstable;
    }
  }, {
    key: "matches",
    value: function matches(val) {
      return !!this.name && this.name === val || !!this.altName && this.altName === val;
    } // this desperately wants https://github.com/microsoft/TypeScript/pull/26349 at the top level of the class
    // so we can instantiate `NamespacedValue<string, _, _>` as a default type for that namespace.

  }, {
    key: "findIn",
    value: function findIn(obj) {
      var val;

      if (this.name) {
        val = obj === null || obj === void 0 ? void 0 : obj[this.name];
      }

      if (!val && this.altName) {
        val = obj === null || obj === void 0 ? void 0 : obj[this.altName];
      }

      return val;
    }
  }, {
    key: "includedIn",
    value: function includedIn(arr) {
      var included = false;

      if (this.name) {
        included = arr.includes(this.name);
      }

      if (!included && this.altName) {
        included = arr.includes(this.altName);
      }

      return included;
    }
  }]);

  return NamespacedValue;
}();
/**
 * Represents a namespaced value which prioritizes the unstable value over the stable
 * value.
 */


exports.NamespacedValue = NamespacedValue;

var UnstableValue = /*#__PURE__*/function (_NamespacedValue) {
  _inherits(UnstableValue, _NamespacedValue);

  var _super = _createSuper(UnstableValue);

  // Note: Constructor difference is that `unstable` is *required*.
  function UnstableValue(stable, unstable) {
    var _this;

    _classCallCheck(this, UnstableValue);

    _this = _super.call(this, stable, unstable);

    if (!_this.unstable) {
      throw new Error("Unstable value must be supplied");
    }

    return _this;
  }

  _createClass(UnstableValue, [{
    key: "name",
    get: function get() {
      return this.unstable;
    }
  }, {
    key: "altName",
    get: function get() {
      return this.stable;
    }
  }]);

  return UnstableValue;
}(NamespacedValue);

exports.UnstableValue = UnstableValue;