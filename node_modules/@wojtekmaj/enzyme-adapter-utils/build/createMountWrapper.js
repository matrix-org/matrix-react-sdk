"use strict";

function _typeof(obj) { "@babel/helpers - typeof"; return _typeof = "function" == typeof Symbol && "symbol" == typeof Symbol.iterator ? function (obj) { return typeof obj; } : function (obj) { return obj && "function" == typeof Symbol && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj; }, _typeof(obj); }

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports["default"] = createMountWrapper;

var _react = _interopRequireDefault(require("react"));

var _propTypes = _interopRequireDefault(require("prop-types"));

var _RootFinder = _interopRequireDefault(require("./RootFinder"));

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { "default": obj }; }

function _extends() { _extends = Object.assign || function (target) { for (var i = 1; i < arguments.length; i++) { var source = arguments[i]; for (var key in source) { if (Object.prototype.hasOwnProperty.call(source, key)) { target[key] = source[key]; } } } return target; }; return _extends.apply(this, arguments); }

function ownKeys(object, enumerableOnly) { var keys = Object.keys(object); if (Object.getOwnPropertySymbols) { var symbols = Object.getOwnPropertySymbols(object); enumerableOnly && (symbols = symbols.filter(function (sym) { return Object.getOwnPropertyDescriptor(object, sym).enumerable; })), keys.push.apply(keys, symbols); } return keys; }

function _objectSpread(target) { for (var i = 1; i < arguments.length; i++) { var source = null != arguments[i] ? arguments[i] : {}; i % 2 ? ownKeys(Object(source), !0).forEach(function (key) { _defineProperty(target, key, source[key]); }) : Object.getOwnPropertyDescriptors ? Object.defineProperties(target, Object.getOwnPropertyDescriptors(source)) : ownKeys(Object(source)).forEach(function (key) { Object.defineProperty(target, key, Object.getOwnPropertyDescriptor(source, key)); }); } return target; }

function _defineProperty(obj, key, value) { if (key in obj) { Object.defineProperty(obj, key, { value: value, enumerable: true, configurable: true, writable: true }); } else { obj[key] = value; } return obj; }

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

var stringOrFunction = _propTypes["default"].oneOfType([_propTypes["default"].func, _propTypes["default"].string]);

var makeValidElementType = function makeValidElementType(adapter) {
  if (!adapter) {
    return stringOrFunction;
  }

  function validElementTypeRequired(props, propName) {
    if (!adapter.isValidElementType) {
      for (var _len = arguments.length, args = new Array(_len > 2 ? _len - 2 : 0), _key = 2; _key < _len; _key++) {
        args[_key - 2] = arguments[_key];
      }

      return stringOrFunction.isRequired.apply(stringOrFunction, [props, propName].concat(args));
    }

    var propValue = props[propName];

    if (adapter.isValidElementType(propValue)) {
      return null;
    }

    return new TypeError("".concat(propName, " must be a valid element type!"));
  }

  function validElementType(props, propName) {
    var propValue = props[propName];

    if (propValue == null) {
      return null;
    }

    for (var _len2 = arguments.length, args = new Array(_len2 > 2 ? _len2 - 2 : 0), _key2 = 2; _key2 < _len2; _key2++) {
      args[_key2 - 2] = arguments[_key2];
    }

    return validElementTypeRequired.apply(void 0, [props, propName].concat(args));
  }

  validElementType.isRequired = validElementTypeRequired;
  return validElementType;
};
/**
 * This is a utility component to wrap around the nodes we are
 * passing in to `mount()`. Theoretically, you could do everything
 * we are doing without this, but this makes it easier since
 * `renderIntoDocument()` doesn't really pass back a reference to
 * the DOM node it rendered to, so we can't really "re-render" to
 * pass new props in.
 */


function createMountWrapper(node) {
  var options = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : {};
  var adapter = options.adapter,
      WrappingComponent = options.wrappingComponent;

  var WrapperComponent = /*#__PURE__*/function (_React$Component) {
    _inherits(WrapperComponent, _React$Component);

    var _super = _createSuper(WrapperComponent);

    function WrapperComponent() {
      var _this;

      _classCallCheck(this, WrapperComponent);

      for (var _len3 = arguments.length, args = new Array(_len3), _key3 = 0; _key3 < _len3; _key3++) {
        args[_key3] = arguments[_key3];
      }

      _this = _super.call.apply(_super, [this].concat(args));
      var _this$props = _this.props,
          props = _this$props.props,
          wrappingComponentProps = _this$props.wrappingComponentProps,
          context = _this$props.context;
      _this.state = {
        mount: true,
        props: props,
        wrappingComponentProps: wrappingComponentProps,
        context: context
      };
      return _this;
    }

    _createClass(WrapperComponent, [{
      key: "setChildProps",
      value: function setChildProps(newProps, newContext) {
        var callback = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : undefined;
        var _this$state = this.state,
            oldProps = _this$state.props,
            oldContext = _this$state.context;

        var props = _objectSpread(_objectSpread({}, oldProps), newProps);

        var context = _objectSpread(_objectSpread({}, oldContext), newContext);

        this.setState({
          props: props,
          context: context
        }, callback);
      }
    }, {
      key: "setWrappingComponentProps",
      value: function setWrappingComponentProps(props) {
        var callback = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : undefined;
        this.setState({
          wrappingComponentProps: props
        }, callback);
      }
    }, {
      key: "render",
      value: function render() {
        var _this$props2 = this.props,
            Component = _this$props2.Component,
            refProp = _this$props2.refProp;
        var _this$state2 = this.state,
            mount = _this$state2.mount,
            props = _this$state2.props,
            wrappingComponentProps = _this$state2.wrappingComponentProps;
        if (!mount) return null;

        var component = /*#__PURE__*/_react["default"].createElement(Component, _extends({
          ref: refProp
        }, props));

        if (WrappingComponent) {
          return /*#__PURE__*/_react["default"].createElement(WrappingComponent, wrappingComponentProps, /*#__PURE__*/_react["default"].createElement(_RootFinder["default"], null, component));
        }

        return component;
      }
    }]);

    return WrapperComponent;
  }(_react["default"].Component);

  WrapperComponent.propTypes = {
    Component: makeValidElementType(adapter).isRequired,
    context: _propTypes["default"].object,
    props: _propTypes["default"].object.isRequired,
    refProp: _propTypes["default"].oneOfType([_propTypes["default"].string, _propTypes["default"].func, _propTypes["default"].shape({
      current: _propTypes["default"].any
    })]),
    wrappingComponentProps: _propTypes["default"].object
  };
  WrapperComponent.defaultProps = {
    refProp: null,
    context: null,
    wrappingComponentProps: null
  };

  if (options.context && (node.type.contextTypes || options.childContextTypes)) {
    // For full rendering, we are using this wrapper component to provide context if it is
    // specified in both the options AND the child component defines `contextTypes` statically
    // OR the merged context types for all children (the node component or deeper children) are
    // specified in options parameter under childContextTypes.
    // In that case, we define both a `getChildContext()` function and a `childContextTypes` prop.
    var childContextTypes = _objectSpread(_objectSpread({}, node.type.contextTypes), options.childContextTypes);

    WrapperComponent.prototype.getChildContext = function getChildContext() {
      return this.state.context;
    };

    WrapperComponent.childContextTypes = childContextTypes;
  }

  return WrapperComponent;
}
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uL3NyYy9jcmVhdGVNb3VudFdyYXBwZXIuanN4Il0sIm5hbWVzIjpbInN0cmluZ09yRnVuY3Rpb24iLCJQcm9wVHlwZXMiLCJvbmVPZlR5cGUiLCJmdW5jIiwic3RyaW5nIiwibWFrZVZhbGlkRWxlbWVudFR5cGUiLCJhZGFwdGVyIiwidmFsaWRFbGVtZW50VHlwZVJlcXVpcmVkIiwicHJvcHMiLCJwcm9wTmFtZSIsImlzVmFsaWRFbGVtZW50VHlwZSIsImFyZ3MiLCJpc1JlcXVpcmVkIiwicHJvcFZhbHVlIiwiVHlwZUVycm9yIiwidmFsaWRFbGVtZW50VHlwZSIsImNyZWF0ZU1vdW50V3JhcHBlciIsIm5vZGUiLCJvcHRpb25zIiwiV3JhcHBpbmdDb21wb25lbnQiLCJ3cmFwcGluZ0NvbXBvbmVudCIsIldyYXBwZXJDb21wb25lbnQiLCJ3cmFwcGluZ0NvbXBvbmVudFByb3BzIiwiY29udGV4dCIsInN0YXRlIiwibW91bnQiLCJuZXdQcm9wcyIsIm5ld0NvbnRleHQiLCJjYWxsYmFjayIsInVuZGVmaW5lZCIsIm9sZFByb3BzIiwib2xkQ29udGV4dCIsInNldFN0YXRlIiwiQ29tcG9uZW50IiwicmVmUHJvcCIsImNvbXBvbmVudCIsIlJlYWN0IiwicHJvcFR5cGVzIiwib2JqZWN0Iiwic2hhcGUiLCJjdXJyZW50IiwiYW55IiwiZGVmYXVsdFByb3BzIiwidHlwZSIsImNvbnRleHRUeXBlcyIsImNoaWxkQ29udGV4dFR5cGVzIiwicHJvdG90eXBlIiwiZ2V0Q2hpbGRDb250ZXh0Il0sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7QUFBQTs7QUFDQTs7QUFDQTs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7QUFFQSxJQUFNQSxnQkFBZ0IsR0FBR0Msc0JBQVVDLFNBQVYsQ0FBb0IsQ0FBQ0Qsc0JBQVVFLElBQVgsRUFBaUJGLHNCQUFVRyxNQUEzQixDQUFwQixDQUF6Qjs7QUFDQSxJQUFNQyxvQkFBb0IsR0FBRyxTQUF2QkEsb0JBQXVCLENBQUNDLE9B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LE1BQUFBLE9BQU8sRUFBRXZDLHNCQUFVd0M7QUFETCxLQUFoQixDQUgyQixDQUFwQixDQUprQjtBQVczQm5CLElBQUFBLHNCQUFzQixFQUFFckIsc0JBQVVxQztBQVhQLEdBQTdCO0FBYUFqQixFQUFBQSxnQkFBZ0IsQ0FBQ3FCLFlBQWpCLEdBQWdDO0FBQzlCUixJQUFBQSxPQUFPLEVBQUUsSUFEcUI7QUFFOUJYLElBQUFBLE9BQU8sRUFBRSxJQUZxQjtBQUc5QkQsSUFBQUEsc0JBQXNCLEVBQUU7QUFITSxHQUFoQzs7QUFNQSxNQUFJSixPQUFPLENBQUNLLE9BQVIsS0FBb0JOLElBQUksQ0FBQzBCLElBQUwsQ0FBVUMsWUFBVixJQUEwQjFCLE9BQU8sQ0FBQzJCLGlCQUF0RCxDQUFKLEVBQThFO0FBQzVFO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSxRQUFNQSxpQkFBaUIsbUNBQ2xCNUIsSUFBSSxDQUFDMEIsSUFBTCxDQUFVQyxZQURRLEdBRWxCMUIsT0FBTyxDQUFDMkIsaUJBRlUsQ0FBdkI7O0FBS0F4QixJQUFBQSxnQkFBZ0IsQ0FBQ3lCLFNBQWpCLENBQTJCQyxlQUEzQixHQUE2QyxTQUFTQSxlQUFULEdBQTJCO0FBQ3RFLGFBQU8sS0FBS3ZCLEtBQUwsQ0FBV0QsT0FBbEI7QUFDRCxLQUZEOztBQUdBRixJQUFBQSxnQkFBZ0IsQ0FBQ3dCLGlCQUFqQixHQUFxQ0EsaUJBQXJDO0FBQ0Q7O0FBQ0QsU0FBT3hCLGdCQUFQO0FBQ0QiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgUmVhY3QgZnJvbSAncmVhY3QnO1xuaW1wb3J0IFByb3BUeXBlcyBmcm9tICdwcm9wLXR5cGVzJztcbmltcG9ydCBSb290RmluZGVyIGZyb20gJy4vUm9vdEZpbmRlcic7XG5cbmNvbnN0IHN0cmluZ09yRnVuY3Rpb24gPSBQcm9wVHlwZXMub25lT2ZUeXBlKFtQcm9wVHlwZXMuZnVuYywgUHJvcFR5cGVzLnN0cmluZ10pO1xuY29uc3QgbWFrZVZhbGlkRWxlbWVudFR5cGUgPSAoYWRhcHRlcikgPT4ge1xuICBpZiAoIWFkYXB0ZXIpIHtcbiAgICByZXR1cm4gc3RyaW5nT3JGdW5jdGlvbjtcbiAgfVxuXG4gIGZ1bmN0aW9uIHZhbGlkRWxlbWVudFR5cGVSZXF1aXJlZChwcm9wcywgcHJvcE5hbWUsIC4uLmFyZ3MpIHtcbiAgICBpZiAoIWFkYXB0ZXIuaXNWYWxpZEVsZW1lbnRUeXBlKSB7XG4gICAgICByZXR1cm4gc3RyaW5nT3JGdW5jdGlvbi5pc1JlcXVpcmVkKHByb3BzLCBwcm9wTmFtZSwgLi4uYXJncyk7XG4gICAgfVxuICAgIGNvbnN0IHByb3BWYWx1ZSA9IHByb3BzW3Byb3BOYW1lXTtcbiAgICBpZiAoYWRhcHRlci5pc1ZhbGlkRWxlbWVudFR5cGUocHJvcFZhbHVlKSkge1xuICAgICAgcmV0dXJuIG51bGw7XG4gICAgfVxuICAgIHJldHVybiBuZXcgVHlwZUVycm9yKGAke3Byb3BOYW1lfSBtdXN0IGJlIGEgdmFsaWQgZWxlbWVudCB0eXBlIWApO1xuICB9XG5cbiAgZnVuY3Rpb24gdmFsaWRFbGVtZW50VHlwZShwcm9wcywgcHJvcE5hbWUsIC4uLmFyZ3MpIHtcbiAgICBjb25zdCBwcm9wVmFsdWUgPSBwcm9wc1twcm9wTmFtZV07XG4gICAgaWYgKHByb3BWYWx1ZSA9PSBudWxsKSB7XG4gICAgICByZXR1cm4gbnVsbDtcbiAgICB9XG4gICAgcmV0dXJuIHZhbGlkRWxlbWVudFR5cGVSZXF1aXJlZChwcm9wcywgcHJvcE5hbWUsIC4uLmFyZ3MpO1xuICB9XG4gIHZhbGlkRWxlbWVudFR5cGUuaXNSZXF1aXJlZCA9IHZhbGlkRWxlbWVudFR5cGVSZXF1aXJlZDtcblxuICByZXR1cm4gdmFsaWRFbGVtZW50VHlwZTtcbn07XG5cbi8qKlxuICogVGhpcyBpcyBhIHV0aWxpdHkgY29tcG9uZW50IHRvIHdyYXAgYXJvdW5kIHRoZSBub2RlcyB3ZSBhcmVcbiAqIHBhc3NpbmcgaW4gdG8gYG1vdW50KClgLiBUaGVvcmV0aWNhbGx5LCB5b3UgY291bGQgZG8gZXZlcnl0aGluZ1xuICogd2UgYXJlIGRvaW5nIHdpdGhvdXQgdGhpcywgYnV0IHRoaXMgbWFrZXMgaXQgZWFzaWVyIHNpbmNlXG4gKiBgcmVuZGVySW50b0RvY3VtZW50KClgIGRvZXNuJ3QgcmVhbGx5IHBhc3MgYmFjayBhIHJlZmVyZW5jZSB0b1xuICogdGhlIERPTSBub2RlIGl0IHJlbmRlcmVkIHRvLCBzbyB3ZSBjYW4ndCByZWFsbHkgXCJyZS1yZW5kZXJcIiB0b1xuICogcGFzcyBuZXcgcHJvcHMgaW4uXG4gKi9cbmV4cG9ydCBkZWZhdWx0IGZ1bmN0aW9uIGNyZWF0ZU1vdW50V3JhcHBlcihub2RlLCBvcHRpb25zID0ge30pIHtcbiAgY29uc3QgeyBhZGFwdGVyLCB3cmFwcGluZ0NvbXBvbmVudDogV3JhcHBpbmdDb21wb25lbnQgfSA9IG9wdGlvbnM7XG5cbiAgY2xhc3MgV3JhcHBlckNvbXBvbmVudCBleHRlbmRzIFJlYWN0LkNvbXBvbmVudCB7XG4gICAgY29uc3RydWN0b3IoLi4uYXJncykge1xuICAgICAgc3VwZXIoLi4uYXJncyk7XG4gICAgICBjb25zdCB7IHByb3BzLCB3cmFwcGluZ0NvbXBvbmVudFByb3BzLCBjb250ZXh0IH0gPSB0aGlzLnByb3BzO1xuICAgICAgdGhpcy5zdGF0ZSA9IHtcbiAgICAgICAgbW91bnQ6IHRydWUsXG4gICAgICAgIHByb3BzLFxuICAgICAgICB3cmFwcGluZ0NvbXBvbmVudFByb3BzLFxuICAgICAgICBjb250ZXh0LFxuICAgICAgfTtcbiAgICB9XG5cbiAgICBzZXRDaGlsZFByb3BzKG5ld1Byb3BzLCBuZXdDb250ZXh0LCBjYWxsYmFjayA9IHVuZGVmaW5lZCkge1xuICAgICAgY29uc3QgeyBwcm9wczogb2xkUHJvcHMsIGNvbnRleHQ6IG9sZENvbnRleHQgfSA9IHRoaXMuc3RhdGU7XG4gICAgICBjb25zdCBwcm9wcyA9IHsgLi4ub2xkUHJvcHMsIC4uLm5ld1Byb3BzIH07XG4gICAgICBjb25zdCBjb250ZXh0ID0geyAuLi5vbGRDb250ZXh0LCAuLi5uZXdDb250ZXh0IH07XG4gICAgICB0aGlzLnNldFN0YXRlKHsgcHJvcHMsIGNvbnRleHQgfSwgY2FsbGJhY2spO1xuICAgIH1cblxuICAgIHNldFdyYXBwaW5nQ29tcG9uZW50UHJvcHMocHJvcHMsIGNhbGxiYWNrID0gdW5kZWZpbmVkKSB7XG4gICAgICB0aGlzLnNldFN0YXRlKHsgd3JhcHBpbmdDb21wb25lbnRQcm9wczogcHJvcHMgfSwgY2FsbGJhY2spO1xuICAgIH1cblxuICAgIHJlbmRlcigpIHtcbiAgICAgIGNvbnN0IHsgQ29tcG9uZW50LCByZWZQcm9wIH0gPSB0aGlzLnByb3BzO1xuICAgICAgY29uc3QgeyBtb3VudCwgcHJvcHMsIHdyYXBwaW5nQ29tcG9uZW50UHJvcHMgfSA9IHRoaXMuc3RhdGU7XG4gICAgICBpZiAoIW1vdW50KSByZXR1cm4gbnVsbDtcbiAgICAgIGNvbnN0IGNvbXBvbmVudCA9IDxDb21wb25lbnQgcmVmPXtyZWZQcm9wfSB7Li4ucHJvcHN9IC8+O1xuICAgICAgaWYgKFdyYXBwaW5nQ29tcG9uZW50KSB7XG4gICAgICAgIHJldHVybiAoXG4gICAgICAgICAgPFdyYXBwaW5nQ29tcG9uZW50IHsuLi53cmFwcGluZ0NvbXBvbmVudFByb3BzfT5cbiAgICAgICAgICAgIDxSb290RmluZGVyPntjb21wb25lbnR9PC9Sb290RmluZGVyPlxuICAgICAgICAgIDwvV3JhcHBpbmdDb21wb25lbnQ+XG4gICAgICAgICk7XG4gICAgICB9XG4gICAgICByZXR1cm4gY29tcG9uZW50O1xuICAgIH1cbiAgfVxuICBXcmFwcGVyQ29tcG9uZW50LnByb3BUeXBlcyA9IHtcbiAgICBDb21wb25lbnQ6IG1ha2VWYWxpZEVsZW1lbnRUeXBlKGFkYXB0ZXIpLmlzUmVxdWlyZWQsXG4gICAgY29udGV4dDogUHJvcFR5cGVzLm9iamVjdCxcbiAgICBwcm9wczogUHJvcFR5cGVzLm9iamVjdC5pc1JlcXVpcmVkLFxuICAgIHJlZlByb3A6IFByb3BUeXBlcy5vbmVPZlR5cGUoW1xuICAgICAgUHJvcFR5cGVzLnN0cmluZyxcbiAgICAgIFByb3BUeXBlcy5mdW5jLFxuICAgICAgUHJvcFR5cGVzLnNoYXBlKHtcbiAgICAgICAgY3VycmVudDogUHJvcFR5cGVzLmFueSxcbiAgICAgIH0pLFxuICAgIF0pLFxuICAgIHdyYXBwaW5nQ29tcG9uZW50UHJvcHM6IFByb3BUeXBlcy5vYmplY3QsXG4gIH07XG4gIFdyYXBwZXJDb21wb25lbnQuZGVmYXVsdFByb3BzID0ge1xuICAgIHJlZlByb3A6IG51bGwsXG4gICAgY29udGV4dDogbnVsbCxcbiAgICB3cmFwcGluZ0NvbXBvbmVudFByb3BzOiBudWxsLFxuICB9O1xuXG4gIGlmIChvcHRpb25zLmNvbnRleHQgJiYgKG5vZGUudHlwZS5jb250ZXh0VHlwZXMgfHwgb3B0aW9ucy5jaGlsZENvbnRleHRUeXBlcykpIHtcbiAgICAvLyBGb3IgZnVsbCByZW5kZXJpbmcsIHdlIGFyZSB1c2luZyB0aGlzIHdyYXBwZXIgY29tcG9uZW50IHRvIHByb3ZpZGUgY29udGV4dCBpZiBpdCBpc1xuICAgIC8vIHNwZWNpZmllZCBpbiBib3RoIHRoZSBvcHRpb25zIEFORCB0aGUgY2hpbGQgY29tcG9uZW50IGRlZmluZXMgYGNvbnRleHRUeXBlc2Agc3RhdGljYWxseVxuICAgIC8vIE9SIHRoZSBtZXJnZWQgY29udGV4dCB0eXBlcyBmb3IgYWxsIGNoaWxkcmVuICh0aGUgbm9kZSBjb21wb25lbnQgb3IgZGVlcGVyIGNoaWxkcmVuKSBhcmVcbiAgICAvLyBzcGVjaWZpZWQgaW4gb3B0aW9ucyBwYXJhbWV0ZXIgdW5kZXIgY2hpbGRDb250ZXh0VHlwZXMuXG4gICAgLy8gSW4gdGhhdCBjYXNlLCB3ZSBkZWZpbmUgYm90aCBhIGBnZXRDaGlsZENvbnRleHQoKWAgZnVuY3Rpb24gYW5kIGEgYGNoaWxkQ29udGV4dFR5cGVzYCBwcm9wLlxuICAgIGNvbnN0IGNoaWxkQ29udGV4dFR5cGVzID0ge1xuICAgICAgLi4ubm9kZS50eXBlLmNvbnRleHRUeXBlcyxcbiAgICAgIC4uLm9wdGlvbnMuY2hpbGRDb250ZXh0VHlwZXMsXG4gICAgfTtcblxuICAgIFdyYXBwZXJDb21wb25lbnQucHJvdG90eXBlLmdldENoaWxkQ29udGV4dCA9IGZ1bmN0aW9uIGdldENoaWxkQ29udGV4dCgpIHtcbiAgICAgIHJldHVybiB0aGlzLnN0YXRlLmNvbnRleHQ7XG4gICAgfTtcbiAgICBXcmFwcGVyQ29tcG9uZW50LmNoaWxkQ29udGV4dFR5cGVzID0gY2hpbGRDb250ZXh0VHlwZXM7XG4gIH1cbiAgcmV0dXJuIFdyYXBwZXJDb21wb25lbnQ7XG59XG4iXX0=
//# sourceMappingURL=createMountWrapper.js.map