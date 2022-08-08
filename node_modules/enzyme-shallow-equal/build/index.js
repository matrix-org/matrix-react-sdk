"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports["default"] = shallowEqual;

var _objectIs = _interopRequireDefault(require("object-is"));

var _has = _interopRequireDefault(require("has"));

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { "default": obj }; }

function _typeof(obj) { "@babel/helpers - typeof"; if (typeof Symbol === "function" && typeof Symbol.iterator === "symbol") { _typeof = function _typeof(obj) { return typeof obj; }; } else { _typeof = function _typeof(obj) { return obj && typeof Symbol === "function" && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj; }; } return _typeof(obj); }

// adapted from https://github.com/facebook/react/blob/144328fe81719e916b946e22660479e31561bb0b/packages/shared/shallowEqual.js#L36-L68
function shallowEqual(objA, objB) {
  if ((0, _objectIs["default"])(objA, objB)) {
    return true;
  }

  if (!objA || !objB || _typeof(objA) !== 'object' || _typeof(objB) !== 'object') {
    return false;
  }

  var keysA = Object.keys(objA);
  var keysB = Object.keys(objB);

  if (keysA.length !== keysB.length) {
    return false;
  }

  keysA.sort();
  keysB.sort(); // Test for A's keys different from B.

  for (var i = 0; i < keysA.length; i += 1) {
    if (!(0, _has["default"])(objB, keysA[i]) || !(0, _objectIs["default"])(objA[keysA[i]], objB[keysA[i]])) {
      return false;
    }
  }

  return true;
}
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uL3NyYy9pbmRleC5qcyJdLCJuYW1lcyI6WyJzaGFsbG93RXF1YWwiLCJvYmpBIiwib2JqQiIsImtleXNBIiwiT2JqZWN0Iiwia2V5cyIsImtleXNCIiwibGVuZ3RoIiwic29ydCIsImkiXSwibWFwcGluZ3MiOiI7Ozs7Ozs7QUFBQTs7QUFDQTs7Ozs7O0FBRUE7QUFDZSxTQUFTQSxZQUFULENBQXNCQyxJQUF0QixFQUE0QkMsSUFBNUIsRUFBa0M7QUFDL0MsTUFBSSwwQkFBR0QsSUFBSCxFQUFTQyxJQUFULENBQUosRUFBb0I7QUFDbEIsV0FBTyxJQUFQO0FBQ0Q7O0FBRUQsTUFBSSxDQUFDRCxJQUFELElBQVMsQ0FBQ0MsSUFBVixJQUFrQixRQUFPRCxJQUFQLE1BQWdCLFFBQWxDLElBQThDLFFBQU9DLElBQVAsTUFBZ0IsUUFBbEUsRUFBNEU7QUFDMUUsV0FBTyxLQUFQO0FBQ0Q7O0FBRUQsTUFBTUMsS0FBSyxHQUFHQyxNQUFNLENBQUNDLElBQVAsQ0FBWUosSUFBWixDQUFkO0FBQ0EsTUFBTUssS0FBSyxHQUFHRixNQUFNLENBQUNDLElBQVAsQ0FBWUgsSUFBWixDQUFkOztBQUVBLE1BQUlDLEtBQUssQ0FBQ0ksTUFBTixLQUFpQkQsS0FBSyxDQUFDQyxNQUEzQixFQUFtQztBQUNqQyxXQUFPLEtBQVA7QUFDRDs7QUFFREosRUFBQUEsS0FBSyxDQUFDSyxJQUFOO0FBQ0FGLEVBQUFBLEtBQUssQ0FBQ0UsSUFBTixHQWpCK0MsQ0FtQi9DOztBQUNBLE9BQUssSUFBSUMsQ0FBQyxHQUFHLENBQWIsRUFBZ0JBLENBQUMsR0FBR04sS0FBSyxDQUFDSSxNQUExQixFQUFrQ0UsQ0FBQyxJQUFJLENBQXZDLEVBQTBDO0FBQ3hDLFFBQUksQ0FBQyxxQkFBSVAsSUFBSixFQUFVQyxLQUFLLENBQUNNLENBQUQsQ0FBZixDQUFELElBQXdCLENBQUMsMEJBQUdSLElBQUksQ0FBQ0UsS0FBSyxDQUFDTSxDQUFELENBQU4sQ0FBUCxFQUFtQlAsSUFBSSxDQUFDQyxLQUFLLENBQUNNLENBQUQsQ0FBTixDQUF2QixDQUE3QixFQUFpRTtBQUMvRCxhQUFPLEtBQVA7QUFDRDtBQUNGOztBQUVELFNBQU8sSUFBUDtBQUNEIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IGlzIGZyb20gJ29iamVjdC1pcyc7XG5pbXBvcnQgaGFzIGZyb20gJ2hhcyc7XG5cbi8vIGFkYXB0ZWQgZnJvbSBodHRwczovL2dpdGh1Yi5jb20vZmFjZWJvb2svcmVhY3QvYmxvYi8xNDQzMjhmZTgxNzE5ZTkxNmI5NDZlMjI2NjA0NzllMzE1NjFiYjBiL3BhY2thZ2VzL3NoYXJlZC9zaGFsbG93RXF1YWwuanMjTDM2LUw2OFxuZXhwb3J0IGRlZmF1bHQgZnVuY3Rpb24gc2hhbGxvd0VxdWFsKG9iakEsIG9iakIpIHtcbiAgaWYgKGlzKG9iakEsIG9iakIpKSB7XG4gICAgcmV0dXJuIHRydWU7XG4gIH1cblxuICBpZiAoIW9iakEgfHwgIW9iakIgfHwgdHlwZW9mIG9iakEgIT09ICdvYmplY3QnIHx8IHR5cGVvZiBvYmpCICE9PSAnb2JqZWN0Jykge1xuICAgIHJldHVybiBmYWxzZTtcbiAgfVxuXG4gIGNvbnN0IGtleXNBID0gT2JqZWN0LmtleXMob2JqQSk7XG4gIGNvbnN0IGtleXNCID0gT2JqZWN0LmtleXMob2JqQik7XG5cbiAgaWYgKGtleXNBLmxlbmd0aCAhPT0ga2V5c0IubGVuZ3RoKSB7XG4gICAgcmV0dXJuIGZhbHNlO1xuICB9XG5cbiAga2V5c0Euc29ydCgpO1xuICBrZXlzQi5zb3J0KCk7XG5cbiAgLy8gVGVzdCBmb3IgQSdzIGtleXMgZGlmZmVyZW50IGZyb20gQi5cbiAgZm9yIChsZXQgaSA9IDA7IGkgPCBrZXlzQS5sZW5ndGg7IGkgKz0gMSkge1xuICAgIGlmICghaGFzKG9iakIsIGtleXNBW2ldKSB8fCAhaXMob2JqQVtrZXlzQVtpXV0sIG9iakJba2V5c0FbaV1dKSkge1xuICAgICAgcmV0dXJuIGZhbHNlO1xuICAgIH1cbiAgfVxuXG4gIHJldHVybiB0cnVlO1xufVxuIl19
//# sourceMappingURL=index.js.map