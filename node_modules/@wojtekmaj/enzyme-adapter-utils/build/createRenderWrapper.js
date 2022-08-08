"use strict";

function _typeof(obj) { "@babel/helpers - typeof"; return _typeof = "function" == typeof Symbol && "symbol" == typeof Symbol.iterator ? function (obj) { return typeof obj; } : function (obj) { return obj && "function" == typeof Symbol && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj; }, _typeof(obj); }

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports["default"] = createRenderWrapper;

var _react = _interopRequireDefault(require("react"));

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { "default": obj }; }

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

function createRenderWrapper(node, context, childContextTypes) {
  var ContextWrapper = /*#__PURE__*/function (_React$Component) {
    _inherits(ContextWrapper, _React$Component);

    var _super = _createSuper(ContextWrapper);

    function ContextWrapper() {
      _classCallCheck(this, ContextWrapper);

      return _super.apply(this, arguments);
    }

    _createClass(ContextWrapper, [{
      key: "getChildContext",
      value: function getChildContext() {
        return context;
      }
    }, {
      key: "render",
      value: function render() {
        return node;
      }
    }]);

    return ContextWrapper;
  }(_react["default"].Component);

  ContextWrapper.childContextTypes = childContextTypes;
  return ContextWrapper;
}
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uL3NyYy9jcmVhdGVSZW5kZXJXcmFwcGVyLmpzeCJdLCJuYW1lcyI6WyJjcmVhdGVSZW5kZXJXcmFwcGVyIiwibm9kZSIsImNvbnRleHQiLCJjaGlsZENvbnRleHRUeXBlcyIsIkNvbnRleHRXcmFwcGVyIiwiUmVhY3QiLCJDb21wb25lbnQiXSwibWFwcGluZ3MiOiI7Ozs7Ozs7OztBQUFBOzs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7QUFFZSxTQUFTQSxtQkFBVCxDQUE2QkMsSUFBN0IsRUFBbUNDLE9BQW5DLEVBQTRDQyxpQkFBNUMsRUFBK0Q7QUFBQSxNQUN0RUMsY0FEc0U7QUFBQTs7QUFBQTs7QUFBQTtBQUFBOztBQUFBO0FBQUE7O0FBQUE7QUFBQTtBQUFBLGFBRTFFLDJCQUFrQjtBQUNoQixlQUFPRixPQUFQO0FBQ0Q7QUFKeUU7QUFBQTtBQUFBLGFBTTFFLGtCQUFTO0FBQ1AsZUFBT0QsSUFBUDtBQUNEO0FBUnlFOztBQUFBO0FBQUEsSUFDL0NJLGtCQUFNQyxTQUR5Qzs7QUFVNUVGLEVBQUFBLGNBQWMsQ0FBQ0QsaUJBQWYsR0FBbUNBLGlCQUFuQztBQUNBLFNBQU9DLGNBQVA7QUFDRCIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCBSZWFjdCBmcm9tICdyZWFjdCc7XG5cbmV4cG9ydCBkZWZhdWx0IGZ1bmN0aW9uIGNyZWF0ZVJlbmRlcldyYXBwZXIobm9kZSwgY29udGV4dCwgY2hpbGRDb250ZXh0VHlwZXMpIHtcbiAgY2xhc3MgQ29udGV4dFdyYXBwZXIgZXh0ZW5kcyBSZWFjdC5Db21wb25lbnQge1xuICAgIGdldENoaWxkQ29udGV4dCgpIHtcbiAgICAgIHJldHVybiBjb250ZXh0O1xuICAgIH1cblxuICAgIHJlbmRlcigpIHtcbiAgICAgIHJldHVybiBub2RlO1xuICAgIH1cbiAgfVxuICBDb250ZXh0V3JhcHBlci5jaGlsZENvbnRleHRUeXBlcyA9IGNoaWxkQ29udGV4dFR5cGVzO1xuICByZXR1cm4gQ29udGV4dFdyYXBwZXI7XG59XG4iXX0=
//# sourceMappingURL=createRenderWrapper.js.map