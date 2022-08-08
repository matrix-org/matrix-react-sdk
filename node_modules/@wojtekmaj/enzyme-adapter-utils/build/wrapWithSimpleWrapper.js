"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports["default"] = wrap;

var _react = _interopRequireDefault(require("react"));

var _propTypes = _interopRequireDefault(require("prop-types"));

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { "default": obj }; }

var propTypes = {
  children: _propTypes["default"].node
};
var defaultProps = {
  children: undefined
};
var Wrapper = Object.assign(function (_ref) {
  var children = _ref.children;
  return children;
}, {
  propTypes: propTypes,
  defaultProps: defaultProps
});

function wrap(element) {
  return /*#__PURE__*/_react["default"].createElement(Wrapper, null, element);
}
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uL3NyYy93cmFwV2l0aFNpbXBsZVdyYXBwZXIuanN4Il0sIm5hbWVzIjpbInByb3BUeXBlcyIsImNoaWxkcmVuIiwiUHJvcFR5cGVzIiwibm9kZSIsImRlZmF1bHRQcm9wcyIsInVuZGVmaW5lZCIsIldyYXBwZXIiLCJPYmplY3QiLCJhc3NpZ24iLCJ3cmFwIiwiZWxlbWVudCJdLCJtYXBwaW5ncyI6Ijs7Ozs7OztBQUFBOztBQUNBOzs7O0FBRUEsSUFBTUEsU0FBUyxHQUFHO0FBQ2hCQyxFQUFBQSxRQUFRLEVBQUVDLHNCQUFVQztBQURKLENBQWxCO0FBSUEsSUFBTUMsWUFBWSxHQUFHO0FBQ25CSCxFQUFBQSxRQUFRLEVBQUVJO0FBRFMsQ0FBckI7QUFJQSxJQUFNQyxPQUFPLEdBQUdDLE1BQU0sQ0FBQ0MsTUFBUCxDQUFjO0FBQUEsTUFBR1AsUUFBSCxRQUFHQSxRQUFIO0FBQUEsU0FBa0JBLFFBQWxCO0FBQUEsQ0FBZCxFQUEwQztBQUFFRCxFQUFBQSxTQUFTLEVBQVRBLFNBQUY7QUFBYUksRUFBQUEsWUFBWSxFQUFaQTtBQUFiLENBQTFDLENBQWhCOztBQUVlLFNBQVNLLElBQVQsQ0FBY0MsT0FBZCxFQUF1QjtBQUNwQyxzQkFBTyxnQ0FBQyxPQUFELFFBQVVBLE9BQVYsQ0FBUDtBQUNEIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IFJlYWN0IGZyb20gJ3JlYWN0JztcbmltcG9ydCBQcm9wVHlwZXMgZnJvbSAncHJvcC10eXBlcyc7XG5cbmNvbnN0IHByb3BUeXBlcyA9IHtcbiAgY2hpbGRyZW46IFByb3BUeXBlcy5ub2RlLFxufTtcblxuY29uc3QgZGVmYXVsdFByb3BzID0ge1xuICBjaGlsZHJlbjogdW5kZWZpbmVkLFxufTtcblxuY29uc3QgV3JhcHBlciA9IE9iamVjdC5hc3NpZ24oKHsgY2hpbGRyZW4gfSkgPT4gY2hpbGRyZW4sIHsgcHJvcFR5cGVzLCBkZWZhdWx0UHJvcHMgfSk7XG5cbmV4cG9ydCBkZWZhdWx0IGZ1bmN0aW9uIHdyYXAoZWxlbWVudCkge1xuICByZXR1cm4gPFdyYXBwZXI+e2VsZW1lbnR9PC9XcmFwcGVyPjtcbn1cbiJdfQ==
//# sourceMappingURL=wrapWithSimpleWrapper.js.map