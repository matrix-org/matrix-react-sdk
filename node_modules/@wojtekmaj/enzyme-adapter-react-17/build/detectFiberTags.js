"use strict";

function _typeof(obj) { "@babel/helpers - typeof"; return _typeof = "function" == typeof Symbol && "symbol" == typeof Symbol.iterator ? function (obj) { return typeof obj; } : function (obj) { return obj && "function" == typeof Symbol && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj; }, _typeof(obj); }

var _react = _interopRequireDefault(require("react"));

var _reactDom = _interopRequireDefault(require("react-dom"));

var _enzymeAdapterUtils = require("@wojtekmaj/enzyme-adapter-utils");

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

function getFiber(element) {
  var container = global.document.createElement('div');
  var inst = null;

  var Tester = /*#__PURE__*/function (_React$Component) {
    _inherits(Tester, _React$Component);

    var _super = _createSuper(Tester);

    function Tester() {
      _classCallCheck(this, Tester);

      return _super.apply(this, arguments);
    }

    _createClass(Tester, [{
      key: "render",
      value: function render() {
        inst = this;
        return element;
      }
    }]);

    return Tester;
  }(_react["default"].Component);

  _reactDom["default"].render( /*#__PURE__*/_react["default"].createElement(Tester), container);

  return inst._reactInternals.child;
}

function getLazyFiber(LazyComponent) {
  var container = global.document.createElement('div');
  var inst = null;

  var Tester = /*#__PURE__*/function (_React$Component2) {
    _inherits(Tester, _React$Component2);

    var _super2 = _createSuper(Tester);

    function Tester() {
      _classCallCheck(this, Tester);

      return _super2.apply(this, arguments);
    }

    _createClass(Tester, [{
      key: "render",
      value: function render() {
        inst = this;
        return /*#__PURE__*/_react["default"].createElement(LazyComponent);
      }
    }]);

    return Tester;
  }(_react["default"].Component);

  var SuspenseWrapper = /*#__PURE__*/function (_React$Component3) {
    _inherits(SuspenseWrapper, _React$Component3);

    var _super3 = _createSuper(SuspenseWrapper);

    function SuspenseWrapper() {
      _classCallCheck(this, SuspenseWrapper);

      return _super3.apply(this, arguments);
    }

    _createClass(SuspenseWrapper, [{
      key: "render",
      value: function render() {
        return /*#__PURE__*/_react["default"].createElement(_react["default"].Suspense, {
          fallback: false
        }, /*#__PURE__*/_react["default"].createElement(Tester));
      }
    }]);

    return SuspenseWrapper;
  }(_react["default"].Component);

  _reactDom["default"].render( /*#__PURE__*/_react["default"].createElement(SuspenseWrapper), container);

  return inst._reactInternals.child;
}

module.exports = function detectFiberTags() {
  function Fn() {
    return null;
  }

  var Cls = /*#__PURE__*/function (_React$Component4) {
    _inherits(Cls, _React$Component4);

    var _super4 = _createSuper(Cls);

    function Cls() {
      _classCallCheck(this, Cls);

      return _super4.apply(this, arguments);
    }

    _createClass(Cls, [{
      key: "render",
      value: function render() {
        return null;
      }
    }]);

    return Cls;
  }(_react["default"].Component);

  var Ctx = /*#__PURE__*/_react["default"].createContext(); // React will warn if we don't have both arguments.
  // eslint-disable-next-line no-unused-vars


  var FwdRef = /*#__PURE__*/_react["default"].forwardRef(function (props, ref) {
    return null;
  });

  var LazyComponent = /*#__PURE__*/_react["default"].lazy(function () {
    return (0, _enzymeAdapterUtils.fakeDynamicImport)(function () {
      return null;
    });
  });

  return {
    HostRoot: getFiber('test')["return"]["return"].tag,
    // Go two levels above to find the root
    ClassComponent: getFiber( /*#__PURE__*/_react["default"].createElement(Cls)).tag,
    Fragment: getFiber([['nested']]).tag,
    FunctionalComponent: getFiber( /*#__PURE__*/_react["default"].createElement(Fn)).tag,
    MemoSFC: getFiber( /*#__PURE__*/_react["default"].createElement( /*#__PURE__*/_react["default"].memo(Fn))).tag,
    MemoClass: getFiber( /*#__PURE__*/_react["default"].createElement( /*#__PURE__*/_react["default"].memo(Cls))).tag,
    HostPortal: getFiber( /*#__PURE__*/_reactDom["default"].createPortal(null, global.document.createElement('div'))).tag,
    HostComponent: getFiber( /*#__PURE__*/_react["default"].createElement('span')).tag,
    HostText: getFiber('text').tag,
    Mode: getFiber( /*#__PURE__*/_react["default"].createElement(_react["default"].StrictMode)).tag,
    ContextConsumer: getFiber( /*#__PURE__*/_react["default"].createElement(Ctx.Consumer, null, function () {
      return null;
    })).tag,
    ContextProvider: getFiber( /*#__PURE__*/_react["default"].createElement(Ctx.Provider, {
      value: null
    }, null)).tag,
    ForwardRef: getFiber( /*#__PURE__*/_react["default"].createElement(FwdRef)).tag,
    Profiler: getFiber( /*#__PURE__*/_react["default"].createElement(_react["default"].Profiler, {
      id: 'mock',
      onRender: function onRender() {}
    })).tag,
    Suspense: getFiber( /*#__PURE__*/_react["default"].createElement(_react["default"].Suspense, {
      fallback: false
    })).tag,
    Lazy: getLazyFiber(LazyComponent).tag,
    OffscreenComponent: getLazyFiber('div')["return"]["return"].tag // Go two levels above to find the root

  };
};
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uL3NyYy9kZXRlY3RGaWJlclRhZ3MuanMiXSwibmFtZXMiOlsiZ2V0RmliZXIiLCJlbGVtZW50IiwiY29udGFpbmVyIiwiZ2xvYmFsIiwiZG9jdW1lbnQiLCJjcmVhdGVFbGVtZW50IiwiaW5zdCIsIlRlc3RlciIsIlJlYWN0IiwiQ29tcG9uZW50IiwiUmVhY3RET00iLCJyZW5kZXIiLCJfcmVhY3RJbnRlcm5hbHMiLCJjaGlsZCIsImdldExhenlGaWJlciIsIkxhenlDb21wb25lbnQiLCJTdXNwZW5zZVdyYXBwZXIiLCJTdXNwZW5zZSIsImZhbGxiYWNrIiwibW9kdWxlIiwiZXhwb3J0cyIsImRldGVjdEZpYmVyVGFncyIsIkZuIiwiQ2xzIiwiQ3R4IiwiY3JlYXRlQ29udGV4dCIsIkZ3ZFJlZiIsImZvcndhcmRSZWYiLCJwcm9wcyIsInJlZiIsImxhenkiLCJIb3N0Um9vdCIsInRhZyIsIkNsYXNzQ29tcG9uZW50IiwiRnJhZ21lbnQiLCJGdW5jdGlvbmFsQ29tcG9uZW50IiwiTWVtb1NGQyIsIm1lbW8iLCJNZW1vQ2xhc3MiLCJIb3N0UG9ydGFsIiwiY3JlYXRlUG9ydGFsIiwiSG9zdENvbXBvbmVudCIsIkhvc3RUZXh0IiwiTW9kZSIsIlN0cmljdE1vZGUiLCJDb250ZXh0Q29uc3VtZXIiLCJDb25zdW1lciIsIkNvbnRleHRQcm92aWRlciIsIlByb3ZpZGVyIiwidmFsdWUiLCJGb3J3YXJkUmVmIiwiUHJvZmlsZXIiLCJpZCIsIm9uUmVuZGVyIiwiTGF6eSIsIk9mZnNjcmVlbkNvbXBvbmVudCJdLCJtYXBwaW5ncyI6Ijs7OztBQUFBOztBQUNBOztBQUNBOzs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7QUFFQSxTQUFTQSxRQUFULENBQWtCQyxPQUFsQixFQUEyQjtBQUN6QixNQUFNQyxTQUFTLEdBQUdDLE1BQU0sQ0FBQ0MsUUFBUCxDQUFnQkMsYUFBaEIsQ0FBOEIsS0FBOUIsQ0FBbEI7QUFDQSxNQUFJQyxJQUFJLEdBQUcsSUFBWDs7QUFGeUIsTUFHbkJDLE1BSG1CO0FBQUE7O0FBQUE7O0FBQUE7QUFBQTs7QUFBQTtBQUFBOztBQUFBO0FBQUE7QUFBQSxhQUl2QixrQkFBUztBQUNQRCxRQUFBQSxJQUFJLEdBQUcsSUFBUDtBQUNBLGVBQU9MLE9BQVA7QUFDRDtBQVBzQjs7QUFBQTtBQUFBLElBR0pPLGtCQUFNQyxTQUhGOztBQVN6QkMsdUJBQVNDLE1BQVQsZUFBZ0JILGtCQUFNSCxhQUFOLENBQW9CRSxNQUFwQixDQUFoQixFQUE2Q0wsU0FBN0M7O0FBQ0EsU0FBT0ksSUFBSSxDQUFDTSxlQUFMLENBQXFCQyxLQUE1QjtBQUNEOztBQUVELFNBQVNDLFlBQVQsQ0FBc0JDLGFBQXRCLEVBQXFDO0FBQ25DLE1BQU1iLFNBQVMsR0FBR0MsTUFBTSxDQUFDQyxRQUFQLENBQWdCQyxhQUFoQixDQUE4QixLQUE5QixDQUFsQjtBQUNBLE1BQUlDLElBQUksR0FBRyxJQUFYOztBQUZtQyxNQUk3QkMsTUFKNkI7QUFBQTs7QUFBQTs7QUFBQTtBQUFBOztBQUFBO0FBQUE7O0FBQUE7QUFBQTtBQUFBLGFBS2pDLGtCQUFTO0FBQ1BELFFBQUFBLElBQUksR0FBRyxJQUFQO0FBQ0EsNEJBQU9FLGtCQUFNSCxhQUFOLENBQW9CVSxhQUFwQixDQUFQO0FBQ0Q7QUFSZ0M7O0FBQUE7QUFBQSxJQUlkUCxrQkFBTUMsU0FKUTs7QUFBQSxNQVc3Qk8sZUFYNkI7QUFBQTs7QUFBQTs7QUFBQTtBQUFBOztBQUFBO0FBQUE7O0FBQUE7QUFBQTtBQUFBLGFBWWpDLGtCQUFTO0FBQ1AsNEJBQU9SLGtCQUFNSCxhQUFOLENBQW9CRyxrQkFBTVMsUUFBMUIsRUFBb0M7QUFBRUMsVUFBQUEsUUFBUSxFQUFFO0FBQVosU0FBcEMsZUFBeURWLGtCQUFNSCxhQUFOLENBQW9CRSxNQUFwQixDQUF6RCxDQUFQO0FBQ0Q7QUFkZ0M7O0FBQUE7QUFBQSxJQVdMQyxrQkFBTUMsU0FYRDs7QUFnQm5DQyx1QkFBU0MsTUFBVCxlQUFnQkgsa0JBQU1ILGFBQU4sQ0FBb0JXLGVBQXBCLENBQWhCLEVBQXNEZCxTQUF0RDs7QUFDQSxTQUFPSSxJQUFJLENBQUNNLGVBQUwsQ0FBcUJDLEtBQTVCO0FBQ0Q7O0FBRURNLE1BQU0sQ0FBQ0MsT0FBUCxHQUFpQixTQUFTQyxlQUFULEdBQTJCO0FBQzFDLFdBQVNDLEVBQVQsR0FBYztBQUNaLFdBQU8sSUFBUDtBQUNEOztBQUh5QyxNQUlwQ0MsR0FKb0M7QUFBQTs7QUFBQTs7QUFBQTtBQUFBOztBQUFBO0FBQUE7O0FBQUE7QUFBQTtBQUFBLGFBS3hDLGtCQUFTO0FBQ1AsZUFBTyxJQUFQO0FBQ0Q7QUFQdUM7O0FBQUE7QUFBQSxJQUl4QmYsa0JBQU1DLFNBSmtCOztBQVMxQyxNQUFJZSxHQUFHLGdCQUFHaEIsa0JBQU1pQixhQUFOLEVBQVYsQ0FUMEMsQ0FVMUM7QUFDQTs7O0FBQ0EsTUFBSUMsTUFBTSxnQkFBR2xCLGtCQUFNbUIsVUFBTixDQUFpQixVQUFDQyxLQUFELEVBQVFDLEdBQVI7QUFBQSxXQUFnQixJQUFoQjtBQUFBLEdBQWpCLENBQWI7O0FBQ0EsTUFBSWQsYUFBYSxnQkFBR1Asa0JBQU1zQixJQUFOLENBQVc7QUFBQSxXQUFNLDJDQUFrQjtBQUFBLGFBQU0sSUFBTjtBQUFBLEtBQWxCLENBQU47QUFBQSxHQUFYLENBQXBCOztBQUVBLFNBQU87QUFDTEMsSUFBQUEsUUFBUSxFQUFFL0IsUUFBUSxDQUFDLE1BQUQsQ0FBUixxQkFBK0JnQyxHQURwQztBQUN5QztBQUM5Q0MsSUFBQUEsY0FBYyxFQUFFakMsUUFBUSxlQUFDUSxrQkFBTUgsYUFBTixDQUFvQmtCLEdBQXBCLENBQUQsQ0FBUixDQUFtQ1MsR0FGOUM7QUFHTEUsSUFBQUEsUUFBUSxFQUFFbEMsUUFBUSxDQUFDLENBQUMsQ0FBQyxRQUFELENBQUQsQ0FBRCxDQUFSLENBQXVCZ0MsR0FINUI7QUFJTEcsSUFBQUEsbUJBQW1CLEVBQUVuQyxRQUFRLGVBQUNRLGtCQUFNSCxhQUFOLENBQW9CaUIsRUFBcEIsQ0FBRCxDQUFSLENBQWtDVSxHQUpsRDtBQUtMSSxJQUFBQSxPQUFPLEVBQUVwQyxRQUFRLGVBQUNRLGtCQUFNSCxhQUFOLGVBQW9CRyxrQkFBTTZCLElBQU4sQ0FBV2YsRUFBWCxDQUFwQixDQUFELENBQVIsQ0FBOENVLEdBTGxEO0FBTUxNLElBQUFBLFNBQVMsRUFBRXRDLFFBQVEsZUFBQ1Esa0JBQU1ILGFBQU4sZUFBb0JHLGtCQUFNNkIsSUFBTixDQUFXZCxHQUFYLENBQXBCLENBQUQsQ0FBUixDQUErQ1MsR0FOckQ7QUFPTE8sSUFBQUEsVUFBVSxFQUFFdkMsUUFBUSxlQUFDVSxxQkFBUzhCLFlBQVQsQ0FBc0IsSUFBdEIsRUFBNEJyQyxNQUFNLENBQUNDLFFBQVAsQ0FBZ0JDLGFBQWhCLENBQThCLEtBQTlCLENBQTVCLENBQUQsQ0FBUixDQUE0RTJCLEdBUG5GO0FBUUxTLElBQUFBLGFBQWEsRUFBRXpDLFFBQVEsZUFBQ1Esa0JBQU1ILGFBQU4sQ0FBb0IsTUFBcEIsQ0FBRCxDQUFSLENBQXNDMkIsR0FSaEQ7QUFTTFUsSUFBQUEsUUFBUSxFQUFFMUMsUUFBUSxDQUFDLE1BQUQsQ0FBUixDQUFpQmdDLEdBVHRCO0FBVUxXLElBQUFBLElBQUksRUFBRTNDLFFBQVEsZUFBQ1Esa0JBQU1ILGFBQU4sQ0FBb0JHLGtCQUFNb0MsVUFBMUIsQ0FBRCxDQUFSLENBQWdEWixHQVZqRDtBQVdMYSxJQUFBQSxlQUFlLEVBQUU3QyxRQUFRLGVBQUNRLGtCQUFNSCxhQUFOLENBQW9CbUIsR0FBRyxDQUFDc0IsUUFBeEIsRUFBa0MsSUFBbEMsRUFBd0M7QUFBQSxhQUFNLElBQU47QUFBQSxLQUF4QyxDQUFELENBQVIsQ0FBOERkLEdBWDFFO0FBWUxlLElBQUFBLGVBQWUsRUFBRS9DLFFBQVEsZUFBQ1Esa0JBQU1ILGFBQU4sQ0FBb0JtQixHQUFHLENBQUN3QixRQUF4QixFQUFrQztBQUFFQyxNQUFBQSxLQUFLLEVBQUU7QUFBVCxLQUFsQyxFQUFtRCxJQUFuRCxDQUFELENBQVIsQ0FBbUVqQixHQVovRTtBQWFMa0IsSUFBQUEsVUFBVSxFQUFFbEQsUUFBUSxlQUFDUSxrQkFBTUgsYUFBTixDQUFvQnFCLE1BQXBCLENBQUQsQ0FBUixDQUFzQ00sR0FiN0M7QUFjTG1CLElBQUFBLFFBQVEsRUFBRW5ELFFBQVEsZUFDaEJRLGtCQUFNSCxhQUFOLENBQW9CRyxrQkFBTTJDLFFBQTFCLEVBQW9DO0FBQ2xDQyxNQUFBQSxFQUFFLEVBQUUsTUFEOEI7QUFFbENDLE1BQUFBLFFBRmtDLHNCQUV2QixDQUFFO0FBRnFCLEtBQXBDLENBRGdCLENBQVIsQ0FLUnJCLEdBbkJHO0FBb0JMZixJQUFBQSxRQUFRLEVBQUVqQixRQUFRLGVBQUNRLGtCQUFNSCxhQUFOLENBQW9CRyxrQkFBTVMsUUFBMUIsRUFBb0M7QUFBRUMsTUFBQUEsUUFBUSxFQUFFO0FBQVosS0FBcEMsQ0FBRCxDQUFSLENBQW1FYyxHQXBCeEU7QUFxQkxzQixJQUFBQSxJQUFJLEVBQUV4QyxZQUFZLENBQUNDLGFBQUQsQ0FBWixDQUE0QmlCLEdBckI3QjtBQXNCTHVCLElBQUFBLGtCQUFrQixFQUFFekMsWUFBWSxDQUFDLEtBQUQsQ0FBWixxQkFBa0NrQixHQXRCakQsQ0FzQnNEOztBQXRCdEQsR0FBUDtBQXdCRCxDQXZDRCIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCBSZWFjdCBmcm9tICdyZWFjdCc7XG5pbXBvcnQgUmVhY3RET00gZnJvbSAncmVhY3QtZG9tJztcbmltcG9ydCB7IGZha2VEeW5hbWljSW1wb3J0IH0gZnJvbSAnQHdvanRla21hai9lbnp5bWUtYWRhcHRlci11dGlscyc7XG5cbmZ1bmN0aW9uIGdldEZpYmVyKGVsZW1lbnQpIHtcbiAgY29uc3QgY29udGFpbmVyID0gZ2xvYmFsLmRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ2RpdicpO1xuICBsZXQgaW5zdCA9IG51bGw7XG4gIGNsYXNzIFRlc3RlciBleHRlbmRzIFJlYWN0LkNvbXBvbmVudCB7XG4gICAgcmVuZGVyKCkge1xuICAgICAgaW5zdCA9IHRoaXM7XG4gICAgICByZXR1cm4gZWxlbWVudDtcbiAgICB9XG4gIH1cbiAgUmVhY3RET00ucmVuZGVyKFJlYWN0LmNyZWF0ZUVsZW1lbnQoVGVzdGVyKSwgY29udGFpbmVyKTtcbiAgcmV0dXJuIGluc3QuX3JlYWN0SW50ZXJuYWxzLmNoaWxkO1xufVxuXG5mdW5jdGlvbiBnZXRMYXp5RmliZXIoTGF6eUNvbXBvbmVudCkge1xuICBjb25zdCBjb250YWluZXIgPSBnbG9iYWwuZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnZGl2Jyk7XG4gIGxldCBpbnN0ID0gbnVsbDtcblxuICBjbGFzcyBUZXN0ZXIgZXh0ZW5kcyBSZWFjdC5Db21wb25lbnQge1xuICAgIHJlbmRlcigpIHtcbiAgICAgIGluc3QgPSB0aGlzO1xuICAgICAgcmV0dXJuIFJlYWN0LmNyZWF0ZUVsZW1lbnQoTGF6eUNvbXBvbmVudCk7XG4gICAgfVxuICB9XG5cbiAgY2xhc3MgU3VzcGVuc2VXcmFwcGVyIGV4dGVuZHMgUmVhY3QuQ29tcG9uZW50IHtcbiAgICByZW5kZXIoKSB7XG4gICAgICByZXR1cm4gUmVhY3QuY3JlYXRlRWxlbWVudChSZWFjdC5TdXNwZW5zZSwgeyBmYWxsYmFjazogZmFsc2UgfSwgUmVhY3QuY3JlYXRlRWxlbWVudChUZXN0ZXIpKTtcbiAgICB9XG4gIH1cbiAgUmVhY3RET00ucmVuZGVyKFJlYWN0LmNyZWF0ZUVsZW1lbnQoU3VzcGVuc2VXcmFwcGVyKSwgY29udGFpbmVyKTtcbiAgcmV0dXJuIGluc3QuX3JlYWN0SW50ZXJuYWxzLmNoaWxkO1xufVxuXG5tb2R1bGUuZXhwb3J0cyA9IGZ1bmN0aW9uIGRldGVjdEZpYmVyVGFncygpIHtcbiAgZnVuY3Rpb24gRm4oKSB7XG4gICAgcmV0dXJuIG51bGw7XG4gIH1cbiAgY2xhc3MgQ2xzIGV4dGVuZHMgUmVhY3QuQ29tcG9uZW50IHtcbiAgICByZW5kZXIoKSB7XG4gICAgICByZXR1cm4gbnVsbDtcbiAgICB9XG4gIH1cbiAgbGV0IEN0eCA9IFJlYWN0LmNyZWF0ZUNvbnRleHQoKTtcbiAgLy8gUmVhY3Qgd2lsbCB3YXJuIGlmIHdlIGRvbid0IGhhdmUgYm90aCBhcmd1bWVudHMuXG4gIC8vIGVzbGludC1kaXNhYmxlLW5leHQtbGluZSBuby11bnVzZWQtdmFyc1xuICBsZXQgRndkUmVmID0gUmVhY3QuZm9yd2FyZFJlZigocHJvcHMsIHJlZikgPT4gbnVsbCk7XG4gIGxldCBMYXp5Q29tcG9uZW50ID0gUmVhY3QubGF6eSgoKSA9PiBmYWtlRHluYW1pY0ltcG9ydCgoKSA9PiBudWxsKSk7XG5cbiAgcmV0dXJuIHtcbiAgICBIb3N0Um9vdDogZ2V0RmliZXIoJ3Rlc3QnKS5yZXR1cm4ucmV0dXJuLnRhZywgLy8gR28gdHdvIGxldmVscyBhYm92ZSB0byBmaW5kIHRoZSByb290XG4gICAgQ2xhc3NDb21wb25lbnQ6IGdldEZpYmVyKFJlYWN0LmNyZWF0ZUVsZW1lbnQoQ2xzKSkudGFnLFxuICAgIEZyYWdtZW50OiBnZXRGaWJlcihbWyduZXN0ZWQnXV0pLnRhZyxcbiAgICBGdW5jdGlvbmFsQ29tcG9uZW50OiBnZXRGaWJlcihSZWFjdC5jcmVhdGVFbGVtZW50KEZuKSkudGFnLFxuICAgIE1lbW9TRkM6IGdldEZpYmVyKFJlYWN0LmNyZWF0ZUVsZW1lbnQoUmVhY3QubWVtbyhGbikpKS50YWcsXG4gICAgTWVtb0NsYXNzOiBnZXRGaWJlcihSZWFjdC5jcmVhdGVFbGVtZW50KFJlYWN0Lm1lbW8oQ2xzKSkpLnRhZyxcbiAgICBIb3N0UG9ydGFsOiBnZXRGaWJlcihSZWFjdERPTS5jcmVhdGVQb3J0YWwobnVsbCwgZ2xvYmFsLmRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ2RpdicpKSkudGFnLFxuICAgIEhvc3RDb21wb25lbnQ6IGdldEZpYmVyKFJlYWN0LmNyZWF0ZUVsZW1lbnQoJ3NwYW4nKSkudGFnLFxuICAgIEhvc3RUZXh0OiBnZXRGaWJlcigndGV4dCcpLnRhZyxcbiAgICBNb2RlOiBnZXRGaWJlcihSZWFjdC5jcmVhdGVFbGVtZW50KFJlYWN0LlN0cmljdE1vZGUpKS50YWcsXG4gICAgQ29udGV4dENvbnN1bWVyOiBnZXRGaWJlcihSZWFjdC5jcmVhdGVFbGVtZW50KEN0eC5Db25zdW1lciwgbnVsbCwgKCkgPT4gbnVsbCkpLnRhZyxcbiAgICBDb250ZXh0UHJvdmlkZXI6IGdldEZpYmVyKFJlYWN0LmNyZWF0ZUVsZW1lbnQoQ3R4LlByb3ZpZGVyLCB7IHZhbHVlOiBudWxsIH0sIG51bGwpKS50YWcsXG4gICAgRm9yd2FyZFJlZjogZ2V0RmliZXIoUmVhY3QuY3JlYXRlRWxlbWVudChGd2RSZWYpKS50YWcsXG4gICAgUHJvZmlsZXI6IGdldEZpYmVyKFxuICAgICAgUmVhY3QuY3JlYXRlRWxlbWVudChSZWFjdC5Qcm9maWxlciwge1xuICAgICAgICBpZDogJ21vY2snLFxuICAgICAgICBvblJlbmRlcigpIHt9LFxuICAgICAgfSksXG4gICAgKS50YWcsXG4gICAgU3VzcGVuc2U6IGdldEZpYmVyKFJlYWN0LmNyZWF0ZUVsZW1lbnQoUmVhY3QuU3VzcGVuc2UsIHsgZmFsbGJhY2s6IGZhbHNlIH0pKS50YWcsXG4gICAgTGF6eTogZ2V0TGF6eUZpYmVyKExhenlDb21wb25lbnQpLnRhZyxcbiAgICBPZmZzY3JlZW5Db21wb25lbnQ6IGdldExhenlGaWJlcignZGl2JykucmV0dXJuLnJldHVybi50YWcsIC8vIEdvIHR3byBsZXZlbHMgYWJvdmUgdG8gZmluZCB0aGUgcm9vdFxuICB9O1xufTtcbiJdfQ==
//# sourceMappingURL=detectFiberTags.js.map