"use strict";

var _react = _interopRequireDefault(require("react"));

var _reactDom = _interopRequireDefault(require("react-dom"));

var _server = _interopRequireDefault(require("react-dom/server"));

var _shallow = _interopRequireDefault(require("react-test-renderer/shallow"));

var _testUtils = _interopRequireDefault(require("react-dom/test-utils"));

var _checkPropTypes2 = _interopRequireDefault(require("prop-types/checkPropTypes"));

var _has = _interopRequireDefault(require("has"));

var _reactIs = require("react-is");

var _enzyme = require("enzyme");

var _Utils = require("enzyme/build/Utils");

var _enzymeShallowEqual = _interopRequireDefault(require("enzyme-shallow-equal"));

var _enzymeAdapterUtils = require("@wojtekmaj/enzyme-adapter-utils");

var _findCurrentFiberUsingSlowPath = _interopRequireDefault(require("./findCurrentFiberUsingSlowPath"));

var _detectFiberTags = _interopRequireDefault(require("./detectFiberTags"));

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { "default": obj }; }

function _typeof(obj) { "@babel/helpers - typeof"; return _typeof = "function" == typeof Symbol && "symbol" == typeof Symbol.iterator ? function (obj) { return typeof obj; } : function (obj) { return obj && "function" == typeof Symbol && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj; }, _typeof(obj); }

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

function ownKeys(object, enumerableOnly) { var keys = Object.keys(object); if (Object.getOwnPropertySymbols) { var symbols = Object.getOwnPropertySymbols(object); enumerableOnly && (symbols = symbols.filter(function (sym) { return Object.getOwnPropertyDescriptor(object, sym).enumerable; })), keys.push.apply(keys, symbols); } return keys; }

function _objectSpread(target) { for (var i = 1; i < arguments.length; i++) { var source = null != arguments[i] ? arguments[i] : {}; i % 2 ? ownKeys(Object(source), !0).forEach(function (key) { _defineProperty(target, key, source[key]); }) : Object.getOwnPropertyDescriptors ? Object.defineProperties(target, Object.getOwnPropertyDescriptors(source)) : ownKeys(Object(source)).forEach(function (key) { Object.defineProperty(target, key, Object.getOwnPropertyDescriptor(source, key)); }); } return target; }

function _defineProperty(obj, key, value) { if (key in obj) { Object.defineProperty(obj, key, { value: value, enumerable: true, configurable: true, writable: true }); } else { obj[key] = value; } return obj; }

// Lazily populated if DOM is available.
var FiberTags = null;

function nodeAndSiblingsArray(nodeWithSibling) {
  var array = [];
  var node = nodeWithSibling;

  while (node != null) {
    array.push(node);
    node = node.sibling;
  }

  return array;
}

function flatten(arr) {
  var result = [];
  var stack = [{
    i: 0,
    array: arr
  }];

  while (stack.length) {
    var n = stack.pop();

    while (n.i < n.array.length) {
      var el = n.array[n.i];
      n.i += 1;

      if (Array.isArray(el)) {
        stack.push(n);
        stack.push({
          i: 0,
          array: el
        });
        break;
      }

      result.push(el);
    }
  }

  return result;
}

function nodeTypeFromType(type) {
  if (type === _reactIs.Portal) {
    return 'portal';
  }

  return (0, _enzymeAdapterUtils.nodeTypeFromType)(type);
}

function isMemo(type) {
  return (0, _enzymeAdapterUtils.compareNodeTypeOf)(type, _reactIs.Memo);
}

function isLazy(type) {
  return (0, _enzymeAdapterUtils.compareNodeTypeOf)(type, _reactIs.Lazy);
}

function unmemoType(type) {
  return isMemo(type) ? type.type : type;
}

function checkIsSuspenseAndCloneElement(el, _ref) {
  var suspenseFallback = _ref.suspenseFallback;

  if (!(0, _reactIs.isSuspense)(el)) {
    return el;
  }

  var children = el.props.children;

  if (suspenseFallback) {
    var fallback = el.props.fallback;
    children = replaceLazyWithFallback(children, fallback);
  }

  var FakeSuspenseWrapper = function FakeSuspenseWrapper(props) {
    return /*#__PURE__*/_react["default"].createElement(el.type, _objectSpread(_objectSpread({}, el.props), props), children);
  };

  return /*#__PURE__*/_react["default"].createElement(FakeSuspenseWrapper, null, children);
}

function elementToTree(el) {
  if (!(0, _reactIs.isPortal)(el)) {
    return (0, _enzymeAdapterUtils.elementToTree)(el, elementToTree);
  }

  var children = el.children,
      containerInfo = el.containerInfo;
  var props = {
    children: children,
    containerInfo: containerInfo
  };
  return {
    nodeType: 'portal',
    type: _reactIs.Portal,
    props: props,
    key: (0, _enzymeAdapterUtils.ensureKeyOrUndefined)(el.key),
    ref: el.ref || null,
    instance: null,
    rendered: elementToTree(el.children)
  };
}

function _toTree(vnode) {
  if (vnode == null) {
    return null;
  } // TODO(lmr): I'm not really sure I understand whether or not this is what
  // i should be doing, or if this is a hack for something i'm doing wrong
  // somewhere else. Should talk to sebastian about this perhaps


  var node = (0, _findCurrentFiberUsingSlowPath["default"])(vnode);

  switch (node.tag) {
    case FiberTags.HostRoot:
      return childrenToTree(node.child);

    case FiberTags.HostPortal:
      {
        var containerInfo = node.stateNode.containerInfo,
            children = node.memoizedProps;
        var props = {
          containerInfo: containerInfo,
          children: children
        };
        return {
          nodeType: 'portal',
          type: _reactIs.Portal,
          props: props,
          key: (0, _enzymeAdapterUtils.ensureKeyOrUndefined)(node.key),
          ref: node.ref,
          instance: null,
          rendered: childrenToTree(node.child)
        };
      }

    case FiberTags.ClassComponent:
      return {
        nodeType: 'class',
        type: node.type,
        props: _objectSpread({}, node.memoizedProps),
        key: (0, _enzymeAdapterUtils.ensureKeyOrUndefined)(node.key),
        ref: node.ref,
        instance: node.stateNode,
        rendered: childrenToTree(node.child)
      };

    case FiberTags.FunctionalComponent:
      return {
        nodeType: 'function',
        type: node.type,
        props: _objectSpread({}, node.memoizedProps),
        key: (0, _enzymeAdapterUtils.ensureKeyOrUndefined)(node.key),
        ref: node.ref,
        instance: null,
        rendered: childrenToTree(node.child)
      };

    case FiberTags.MemoClass:
      return {
        nodeType: 'class',
        type: node.elementType.type,
        props: _objectSpread({}, node.memoizedProps),
        key: (0, _enzymeAdapterUtils.ensureKeyOrUndefined)(node.key),
        ref: node.ref,
        instance: node.stateNode,
        rendered: childrenToTree(node.child.child)
      };

    case FiberTags.MemoSFC:
      {
        var renderedNodes = flatten(nodeAndSiblingsArray(node.child).map(_toTree));

        if (renderedNodes.length === 0) {
          renderedNodes = [node.memoizedProps.children];
        }

        return {
          nodeType: 'function',
          type: node.elementType,
          props: _objectSpread({}, node.memoizedProps),
          key: (0, _enzymeAdapterUtils.ensureKeyOrUndefined)(node.key),
          ref: node.ref,
          instance: null,
          rendered: renderedNodes
        };
      }

    case FiberTags.HostComponent:
      {
        var _renderedNodes = flatten(nodeAndSiblingsArray(node.child).map(_toTree));

        if (_renderedNodes.length === 0) {
          _renderedNodes = [node.memoizedProps.children];
        }

        return {
          nodeType: 'host',
          type: node.type,
          props: _objectSpread({}, node.memoizedProps),
          key: (0, _enzymeAdapterUtils.ensureKeyOrUndefined)(node.key),
          ref: node.ref,
          instance: node.stateNode,
          rendered: _renderedNodes
        };
      }

    case FiberTags.HostText:
      return node.memoizedProps;

    case FiberTags.Fragment:
    case FiberTags.Mode:
    case FiberTags.ContextProvider:
    case FiberTags.ContextConsumer:
      return childrenToTree(node.child);

    case FiberTags.Profiler:
    case FiberTags.ForwardRef:
      {
        return {
          nodeType: 'function',
          type: node.type,
          props: _objectSpread({}, node.pendingProps),
          key: (0, _enzymeAdapterUtils.ensureKeyOrUndefined)(node.key),
          ref: node.ref,
          instance: null,
          rendered: childrenToTree(node.child)
        };
      }

    case FiberTags.Suspense:
      {
        return {
          nodeType: 'function',
          type: _reactIs.Suspense,
          props: _objectSpread({}, node.memoizedProps),
          key: (0, _enzymeAdapterUtils.ensureKeyOrUndefined)(node.key),
          ref: node.ref,
          instance: null,
          rendered: childrenToTree(node.child)
        };
      }

    case FiberTags.Lazy:
      return childrenToTree(node.child);

    case FiberTags.OffscreenComponent:
      return _toTree(node.child);

    default:
      throw new Error("Enzyme Internal Error: unknown node with tag ".concat(node.tag));
  }
}

function childrenToTree(node) {
  if (!node) {
    return null;
  }

  var children = nodeAndSiblingsArray(node);

  if (children.length === 0) {
    return null;
  }

  if (children.length === 1) {
    return _toTree(children[0]);
  }

  return flatten(children.map(_toTree));
}

function _nodeToHostNode(_node) {
  // NOTE(lmr): node could be a function component
  // which wont have an instance prop, but we can get the
  // host node associated with its return value at that point.
  // Although this breaks down if the return value is an array,
  // as is possible with React 16.
  var node = _node;

  while (node && !Array.isArray(node) && node.instance === null) {
    node = node.rendered;
  } // if the SFC returned null effectively, there is no host node.


  if (!node) {
    return null;
  }

  var mapper = function mapper(item) {
    if (item && item.instance) return _reactDom["default"].findDOMNode(item.instance);
    return null;
  };

  if (Array.isArray(node)) {
    return node.map(mapper);
  }

  if (Array.isArray(node.rendered) && node.nodeType === 'class') {
    return node.rendered.map(mapper);
  }

  return mapper(node);
}

function replaceLazyWithFallback(node, fallback) {
  if (!node) {
    return null;
  }

  if (Array.isArray(node)) {
    return node.map(function (el) {
      return replaceLazyWithFallback(el, fallback);
    });
  }

  if (isLazy(node.type)) {
    return fallback;
  }

  return _objectSpread(_objectSpread({}, node), {}, {
    props: _objectSpread(_objectSpread({}, node.props), {}, {
      children: replaceLazyWithFallback(node.props.children, fallback)
    })
  });
}

function getEmptyStateValue() {
  // this handles a bug in React 16.0 - 16.2
  // see https://github.com/facebook/react/commit/39be83565c65f9c522150e52375167568a2a1459
  // also see https://github.com/facebook/react/pull/11965
  var EmptyState = /*#__PURE__*/function (_React$Component) {
    _inherits(EmptyState, _React$Component);

    var _super = _createSuper(EmptyState);

    function EmptyState() {
      _classCallCheck(this, EmptyState);

      return _super.apply(this, arguments);
    }

    _createClass(EmptyState, [{
      key: "render",
      value: function render() {
        return null;
      }
    }]);

    return EmptyState;
  }(_react["default"].Component);

  var testRenderer = new _shallow["default"]();
  testRenderer.render( /*#__PURE__*/_react["default"].createElement(EmptyState));
  return testRenderer._instance.state;
}

function wrapAct(fn) {
  var returnVal;

  _testUtils["default"].act(function () {
    returnVal = fn();
  });

  return returnVal;
}

function getProviderDefaultValue(Provider) {
  // React stores references to the Provider's defaultValue differently across versions.
  if ('_defaultValue' in Provider._context) {
    return Provider._context._defaultValue;
  }

  if ('_currentValue' in Provider._context) {
    return Provider._context._currentValue;
  }

  throw new Error('Enzyme Internal Error: can’t figure out how to get Provider’s default value');
}

function makeFakeElement(type) {
  return {
    $$typeof: _reactIs.Element,
    type: type
  };
}

function isStateful(Component) {
  return Component.prototype && (Component.prototype.isReactComponent || Array.isArray(Component.__reactAutoBindPairs)) // fallback for createClass components
  ;
}

var ReactSeventeenAdapter = /*#__PURE__*/function (_EnzymeAdapter) {
  _inherits(ReactSeventeenAdapter, _EnzymeAdapter);

  var _super2 = _createSuper(ReactSeventeenAdapter);

  function ReactSeventeenAdapter() {
    var _this;

    _classCallCheck(this, ReactSeventeenAdapter);

    _this = _super2.call(this);
    var lifecycles = _this.options.lifecycles;
    _this.options = _objectSpread(_objectSpread({}, _this.options), {}, {
      enableComponentDidUpdateOnSetState: true,
      // TODO: remove, semver-major
      legacyContextMode: 'parent',
      lifecycles: _objectSpread(_objectSpread({}, lifecycles), {}, {
        componentDidUpdate: {
          onSetState: true
        },
        getDerivedStateFromProps: {
          hasShouldComponentUpdateBug: false
        },
        getSnapshotBeforeUpdate: true,
        setState: {
          skipsComponentDidUpdateOnNullish: true
        },
        getChildContext: {
          calledByRenderer: false
        },
        getDerivedStateFromError: true
      })
    });
    return _this;
  }

  _createClass(ReactSeventeenAdapter, [{
    key: "createMountRenderer",
    value: function createMountRenderer(options) {
      (0, _enzymeAdapterUtils.assertDomAvailable)('mount');

      if ((0, _has["default"])(options, 'suspenseFallback')) {
        throw new TypeError('`suspenseFallback` is not supported by the `mount` renderer');
      }

      if (FiberTags === null) {
        // Requires DOM.
        FiberTags = (0, _detectFiberTags["default"])();
      }

      var attachTo = options.attachTo,
          hydrateIn = options.hydrateIn,
          wrappingComponentProps = options.wrappingComponentProps;
      var domNode = hydrateIn || attachTo || global.document.createElement('div');
      var instance = null;
      var adapter = this;
      return {
        render: function render(el, context, callback) {
          return wrapAct(function () {
            if (instance === null) {
              var type = el.type,
                  props = el.props,
                  ref = el.ref;

              var wrapperProps = _objectSpread({
                Component: type,
                props: props,
                wrappingComponentProps: wrappingComponentProps,
                context: context
              }, ref && {
                refProp: ref
              });

              var ReactWrapperComponent = (0, _enzymeAdapterUtils.createMountWrapper)(el, _objectSpread(_objectSpread({}, options), {}, {
                adapter: adapter
              }));

              var wrappedEl = /*#__PURE__*/_react["default"].createElement(ReactWrapperComponent, wrapperProps);

              instance = hydrateIn ? _reactDom["default"].hydrate(wrappedEl, domNode) : _reactDom["default"].render(wrappedEl, domNode);

              if (typeof callback === 'function') {
                callback();
              }
            } else {
              instance.setChildProps(el.props, context, callback);
            }
          });
        },
        unmount: function unmount() {
          wrapAct(function () {
            _reactDom["default"].unmountComponentAtNode(domNode);
          });
          instance = null;
        },
        getNode: function getNode() {
          if (!instance) {
            return null;
          }

          return (0, _enzymeAdapterUtils.getNodeFromRootFinder)(adapter.isCustomComponent, _toTree(instance._reactInternals), options);
        },
        simulateError: function simulateError(nodeHierarchy, rootNode, error) {
          var isErrorBoundary = function isErrorBoundary(_ref2) {
            var elInstance = _ref2.instance,
                type = _ref2.type;

            if (type && type.getDerivedStateFromError) {
              return true;
            }

            return elInstance && elInstance.componentDidCatch;
          };

          var _ref3 = nodeHierarchy.find(isErrorBoundary) || {},
              catchingInstance = _ref3.instance,
              catchingType = _ref3.type;

          (0, _enzymeAdapterUtils.simulateError)(error, catchingInstance, rootNode, nodeHierarchy, nodeTypeFromType, adapter.displayNameOfNode, catchingType);
        },
        simulateEvent: function simulateEvent(node, event, mock) {
          var mappedEvent = (0, _enzymeAdapterUtils.mapNativeEventNames)(event);
          var eventFn = _testUtils["default"].Simulate[mappedEvent];

          if (!eventFn) {
            throw new TypeError("ReactWrapper::simulate() event '".concat(event, "' does not exist"));
          }

          wrapAct(function () {
            eventFn(adapter.nodeToHostNode(node), mock);
          });
        },
        batchedUpdates: function batchedUpdates(fn) {
          return fn(); // return ReactDOM.unstable_batchedUpdates(fn);
        },
        getWrappingComponentRenderer: function getWrappingComponentRenderer() {
          return _objectSpread(_objectSpread({}, this), (0, _enzymeAdapterUtils.getWrappingComponentMountRenderer)({
            toTree: function toTree(inst) {
              return _toTree(inst._reactInternals);
            },
            getMountWrapperInstance: function getMountWrapperInstance() {
              return instance;
            }
          }));
        },
        wrapInvoke: wrapAct
      };
    }
  }, {
    key: "createShallowRenderer",
    value: function createShallowRenderer() {
      var _this2 = this;

      var options = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : {};
      var adapter = this;
      var renderer = new _shallow["default"]();
      var suspenseFallback = options.suspenseFallback;

      if (typeof suspenseFallback !== 'undefined' && typeof suspenseFallback !== 'boolean') {
        throw TypeError('`options.suspenseFallback` should be boolean or undefined');
      }

      var isDOM = false;
      var cachedNode = null;
      var lastComponent = null;
      var wrappedComponent = null;
      var sentinel = {}; // wrap memo components with a PureComponent, or a class component with sCU

      var wrapPureComponent = function wrapPureComponent(Component, compare) {
        if (lastComponent !== Component) {
          if (isStateful(Component)) {
            wrappedComponent = /*#__PURE__*/function (_Component) {
              _inherits(wrappedComponent, _Component);

              var _super3 = _createSuper(wrappedComponent);

              function wrappedComponent() {
                _classCallCheck(this, wrappedComponent);

                return _super3.apply(this, arguments);
              }

              return _createClass(wrappedComponent);
            }(Component);

            if (compare) {
              wrappedComponent.prototype.shouldComponentUpdate = function (nextProps) {
                return !compare(_this2.props, nextProps);
              };
            } else {
              wrappedComponent.prototype.isPureReactComponent = true;
            }
          } else {
            var memoized = sentinel;
            var prevProps;

            wrappedComponent = function wrappedComponentFn(props) {
              var shouldUpdate = memoized === sentinel || (compare ? !compare(prevProps, props) : !(0, _enzymeShallowEqual["default"])(prevProps, props));

              if (shouldUpdate) {
                for (var _len = arguments.length, args = new Array(_len > 1 ? _len - 1 : 0), _key = 1; _key < _len; _key++) {
                  args[_key - 1] = arguments[_key];
                }

                memoized = Component.apply(void 0, [_objectSpread(_objectSpread({}, Component.defaultProps), props)].concat(args));
                prevProps = props;
              }

              return memoized;
            };
          }

          Object.assign(wrappedComponent, Component, {
            displayName: adapter.displayNameOfNode({
              type: Component
            })
          });
          lastComponent = Component;
        }

        return wrappedComponent;
      }; // Wrap functional components on versions prior to 16.5,
      // to avoid inadvertently pass a `this` instance to it.


      var wrapFunctionalComponent = function wrapFunctionalComponent(Component) {
        if ((0, _has["default"])(Component, 'defaultProps')) {
          if (lastComponent !== Component) {
            wrappedComponent = Object.assign(function (props) {
              for (var _len2 = arguments.length, args = new Array(_len2 > 1 ? _len2 - 1 : 0), _key2 = 1; _key2 < _len2; _key2++) {
                args[_key2 - 1] = arguments[_key2];
              }

              return Component.apply(void 0, [_objectSpread(_objectSpread({}, Component.defaultProps), props)].concat(args));
            }, Component, {
              displayName: adapter.displayNameOfNode({
                type: Component
              })
            });
            lastComponent = Component;
          }

          return wrappedComponent;
        }

        return Component;
      };

      var renderElement = function renderElement(elConfig) {
        for (var _len3 = arguments.length, rest = new Array(_len3 > 1 ? _len3 - 1 : 0), _key3 = 1; _key3 < _len3; _key3++) {
          rest[_key3 - 1] = arguments[_key3];
        }

        var renderedEl = renderer.render.apply(renderer, [elConfig].concat(rest));
        var typeIsExisted = !!(renderedEl && renderedEl.type);

        if (typeIsExisted) {
          var clonedEl = checkIsSuspenseAndCloneElement(renderedEl, {
            suspenseFallback: suspenseFallback
          });
          var elementIsChanged = clonedEl.type !== renderedEl.type;

          if (elementIsChanged) {
            return renderer.render.apply(renderer, [_objectSpread(_objectSpread({}, elConfig), {}, {
              type: clonedEl.type
            })].concat(rest));
          }
        }

        return renderedEl;
      };

      return {
        render: function render(el, unmaskedContext) {
          var _ref4 = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : {},
              _ref4$providerValues = _ref4.providerValues,
              providerValues = _ref4$providerValues === void 0 ? new Map() : _ref4$providerValues;

          cachedNode = el;

          if (typeof el.type === 'string') {
            isDOM = true;
          } else if ((0, _reactIs.isContextProvider)(el)) {
            providerValues.set(el.type, el.props.value);
            var MockProvider = Object.assign(function (props) {
              return props.children;
            }, el.type);
            return (0, _enzymeAdapterUtils.withSetStateAllowed)(function () {
              return renderElement(_objectSpread(_objectSpread({}, el), {}, {
                type: MockProvider
              }));
            });
          } else if ((0, _reactIs.isContextConsumer)(el)) {
            var Provider = adapter.getProviderFromConsumer(el.type);
            var value = providerValues.has(Provider) ? providerValues.get(Provider) : getProviderDefaultValue(Provider);
            var MockConsumer = Object.assign(function (props) {
              return props.children(value);
            }, el.type);
            return (0, _enzymeAdapterUtils.withSetStateAllowed)(function () {
              return renderElement(_objectSpread(_objectSpread({}, el), {}, {
                type: MockConsumer
              }));
            });
          } else {
            isDOM = false;
            var renderedEl = el;

            if (isLazy(renderedEl)) {
              throw TypeError('`React.lazy` is not supported by shallow rendering.');
            }

            renderedEl = checkIsSuspenseAndCloneElement(renderedEl, {
              suspenseFallback: suspenseFallback
            });
            var _renderedEl = renderedEl,
                Component = _renderedEl.type;
            var context = (0, _enzymeAdapterUtils.getMaskedContext)(Component.contextTypes, unmaskedContext);

            if (isMemo(el.type)) {
              var _el$type = el.type,
                  InnerComp = _el$type.type,
                  compare = _el$type.compare;
              return (0, _enzymeAdapterUtils.withSetStateAllowed)(function () {
                return renderElement(_objectSpread(_objectSpread({}, el), {}, {
                  type: wrapPureComponent(InnerComp, compare)
                }), context);
              });
            }

            var isComponentStateful = isStateful(Component);

            if (!isComponentStateful && typeof Component === 'function') {
              return (0, _enzymeAdapterUtils.withSetStateAllowed)(function () {
                return renderElement(_objectSpread(_objectSpread({}, renderedEl), {}, {
                  type: wrapFunctionalComponent(Component)
                }), context);
              });
            }

            if (isComponentStateful) {
              if (renderer._instance && el.props === renderer._instance.props && !(0, _enzymeShallowEqual["default"])(context, renderer._instance.context)) {
                var _spyMethod = (0, _enzymeAdapterUtils.spyMethod)(renderer, '_updateClassComponent', function (originalMethod) {
                  return function _updateClassComponent() {
                    var props = renderer._instance.props;

                    var clonedProps = _objectSpread({}, props);

                    renderer._instance.props = clonedProps;

                    for (var _len4 = arguments.length, args = new Array(_len4), _key4 = 0; _key4 < _len4; _key4++) {
                      args[_key4] = arguments[_key4];
                    }

                    var result = originalMethod.apply(renderer, args);
                    renderer._instance.props = props;
                    restore();
                    return result;
                  };
                }),
                    restore = _spyMethod.restore;
              } // fix react bug; see implementation of `getEmptyStateValue`


              var emptyStateValue = getEmptyStateValue();

              if (emptyStateValue) {
                Object.defineProperty(Component.prototype, 'state', {
                  configurable: true,
                  enumerable: true,
                  get: function get() {
                    return null;
                  },
                  set: function set(value) {
                    if (value !== emptyStateValue) {
                      Object.defineProperty(this, 'state', {
                        configurable: true,
                        enumerable: true,
                        value: value,
                        writable: true
                      });
                    }
                  }
                });
              }
            }

            return (0, _enzymeAdapterUtils.withSetStateAllowed)(function () {
              return renderElement(renderedEl, context);
            });
          }
        },
        unmount: function unmount() {
          renderer.unmount();
        },
        getNode: function getNode() {
          if (isDOM) {
            return elementToTree(cachedNode);
          }

          var output = renderer.getRenderOutput();
          return {
            nodeType: nodeTypeFromType(cachedNode.type),
            type: cachedNode.type,
            props: cachedNode.props,
            key: (0, _enzymeAdapterUtils.ensureKeyOrUndefined)(cachedNode.key),
            ref: cachedNode.ref,
            instance: renderer._instance,
            rendered: Array.isArray(output) ? flatten(output).map(function (el) {
              return elementToTree(el);
            }) : elementToTree(output)
          };
        },
        simulateError: function simulateError(nodeHierarchy, rootNode, error) {
          (0, _enzymeAdapterUtils.simulateError)(error, renderer._instance, cachedNode, nodeHierarchy.concat(cachedNode), nodeTypeFromType, adapter.displayNameOfNode, cachedNode.type);
        },
        simulateEvent: function simulateEvent(node, event) {
          for (var _len5 = arguments.length, args = new Array(_len5 > 2 ? _len5 - 2 : 0), _key5 = 2; _key5 < _len5; _key5++) {
            args[_key5 - 2] = arguments[_key5];
          }

          var handler = node.props[(0, _enzymeAdapterUtils.propFromEvent)(event)];

          if (handler) {
            (0, _enzymeAdapterUtils.withSetStateAllowed)(function () {
              // TODO(lmr): create/use synthetic events
              // TODO(lmr): emulate React's event propagation
              // ReactDOM.unstable_batchedUpdates(() => {
              handler.apply(void 0, args); // });
            });
          }
        },
        batchedUpdates: function batchedUpdates(fn) {
          return fn(); // return ReactDOM.unstable_batchedUpdates(fn);
        },
        checkPropTypes: function checkPropTypes(typeSpecs, values, location, hierarchy) {
          return (0, _checkPropTypes2["default"])(typeSpecs, values, location, (0, _enzymeAdapterUtils.displayNameOfNode)(cachedNode), function () {
            return (0, _enzymeAdapterUtils.getComponentStack)(hierarchy.concat([cachedNode]));
          });
        }
      };
    }
  }, {
    key: "createStringRenderer",
    value: function createStringRenderer(options) {
      if ((0, _has["default"])(options, 'suspenseFallback')) {
        throw new TypeError('`suspenseFallback` should not be specified in options of string renderer');
      }

      return {
        render: function render(el, context) {
          if (options.context && (el.type.contextTypes || options.childContextTypes)) {
            var childContextTypes = _objectSpread(_objectSpread({}, el.type.contextTypes || {}), options.childContextTypes);

            var ContextWrapper = (0, _enzymeAdapterUtils.createRenderWrapper)(el, context, childContextTypes);
            return _server["default"].renderToStaticMarkup( /*#__PURE__*/_react["default"].createElement(ContextWrapper));
          }

          return _server["default"].renderToStaticMarkup(el);
        }
      };
    } // Provided a bag of options, return an `EnzymeRenderer`. Some options can be implementation
    // specific, like `attach` etc. for React, but not part of this interface explicitly.

  }, {
    key: "createRenderer",
    value: function createRenderer(options) {
      switch (options.mode) {
        case _enzyme.EnzymeAdapter.MODES.MOUNT:
          return this.createMountRenderer(options);

        case _enzyme.EnzymeAdapter.MODES.SHALLOW:
          return this.createShallowRenderer(options);

        case _enzyme.EnzymeAdapter.MODES.STRING:
          return this.createStringRenderer(options);

        default:
          throw new Error("Enzyme Internal Error: Unrecognized mode: ".concat(options.mode));
      }
    }
  }, {
    key: "wrap",
    value: function wrap(element) {
      return (0, _enzymeAdapterUtils.wrap)(element);
    } // converts an RSTNode to the corresponding JSX Pragma Element. This will be needed
    // in order to implement the `Wrapper.mount()` and `Wrapper.shallow()` methods, but should
    // be pretty straightforward for people to implement.

  }, {
    key: "nodeToElement",
    value: function nodeToElement(node) {
      if (!node || _typeof(node) !== 'object') return null;
      var type = node.type;
      return /*#__PURE__*/_react["default"].createElement(unmemoType(type), (0, _enzymeAdapterUtils.propsWithKeysAndRef)(node));
    }
  }, {
    key: "matchesElementType",
    value: function matchesElementType(node, matchingType) {
      if (!node) {
        return node;
      }

      var type = node.type;
      return unmemoType(type) === unmemoType(matchingType);
    }
  }, {
    key: "elementToNode",
    value: function elementToNode(element) {
      return elementToTree(element);
    }
  }, {
    key: "nodeToHostNode",
    value: function nodeToHostNode(node) {
      var supportsArray = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : false;

      var nodes = _nodeToHostNode(node);

      if (Array.isArray(nodes) && !supportsArray) {
        // get the first non-null node
        return nodes.filter(Boolean)[0];
      }

      return nodes;
    }
  }, {
    key: "displayNameOfNode",
    value: function displayNameOfNode(node) {
      if (!node) return null;
      var type = node.type,
          $$typeof = node.$$typeof;
      var adapter = this;
      var nodeType = type || $$typeof; // newer node types may be undefined, so only test if the nodeType exists

      if (nodeType) {
        switch (nodeType) {
          case _reactIs.ConcurrentMode || NaN:
            return 'ConcurrentMode';

          case _reactIs.Fragment || NaN:
            return 'Fragment';

          case _reactIs.StrictMode || NaN:
            return 'StrictMode';

          case _reactIs.Profiler || NaN:
            return 'Profiler';

          case _reactIs.Portal || NaN:
            return 'Portal';

          case _reactIs.Suspense || NaN:
            return 'Suspense';

          default:
        }
      }

      var $$typeofType = type && type.$$typeof;

      switch ($$typeofType) {
        case _reactIs.ContextConsumer || NaN:
          return 'ContextConsumer';

        case _reactIs.ContextProvider || NaN:
          return 'ContextProvider';

        case _reactIs.Memo || NaN:
          {
            var nodeName = (0, _enzymeAdapterUtils.displayNameOfNode)(node);
            return typeof nodeName === 'string' ? nodeName : "Memo(".concat(adapter.displayNameOfNode(type), ")");
          }

        case _reactIs.ForwardRef || NaN:
          {
            if (type.displayName) {
              return type.displayName;
            }

            var name = adapter.displayNameOfNode({
              type: type.render
            });
            return name ? "ForwardRef(".concat(name, ")") : 'ForwardRef';
          }

        case _reactIs.Lazy || NaN:
          {
            return 'lazy';
          }

        default:
          return (0, _enzymeAdapterUtils.displayNameOfNode)(node);
      }
    }
  }, {
    key: "isValidElement",
    value: function isValidElement(element) {
      return (0, _reactIs.isElement)(element);
    }
  }, {
    key: "isValidElementType",
    value: function isValidElementType(object) {
      return !!object && (0, _reactIs.isValidElementType)(object);
    }
  }, {
    key: "isFragment",
    value: function isFragment(fragment) {
      return (0, _Utils.typeOfNode)(fragment) === _reactIs.Fragment;
    }
  }, {
    key: "isCustomComponent",
    value: function isCustomComponent(type) {
      var fakeElement = makeFakeElement(type);
      return !!type && (typeof type === 'function' || (0, _reactIs.isForwardRef)(fakeElement) || (0, _reactIs.isContextProvider)(fakeElement) || (0, _reactIs.isContextConsumer)(fakeElement) || (0, _reactIs.isSuspense)(fakeElement));
    }
  }, {
    key: "isContextConsumer",
    value: function isContextConsumer(type) {
      return !!type && (0, _reactIs.isContextConsumer)(makeFakeElement(type));
    }
  }, {
    key: "isCustomComponentElement",
    value: function isCustomComponentElement(inst) {
      if (!inst || !this.isValidElement(inst)) {
        return false;
      }

      return this.isCustomComponent(inst.type);
    }
  }, {
    key: "getProviderFromConsumer",
    value: function getProviderFromConsumer(Consumer) {
      // React stores references to the Provider on a Consumer differently across versions.
      if (Consumer) {
        var Provider;

        if (Consumer._context) {
          // check this first, to avoid a deprecation warning
          Provider = Consumer._context.Provider;
        } else if (Consumer.Provider) {
          Provider = Consumer.Provider;
        }

        if (Provider) {
          return Provider;
        }
      }

      throw new Error('Enzyme Internal Error: can’t figure out how to get Provider from Consumer');
    }
  }, {
    key: "createElement",
    value: function createElement() {
      return /*#__PURE__*/_react["default"].createElement.apply(_react["default"], arguments);
    }
  }, {
    key: "wrapWithWrappingComponent",
    value: function wrapWithWrappingComponent(node, options) {
      return {
        RootFinder: _enzymeAdapterUtils.RootFinder,
        node: (0, _enzymeAdapterUtils.wrapWithWrappingComponent)(_react["default"].createElement, node, options)
      };
    }
  }]);

  return ReactSeventeenAdapter;
}(_enzyme.EnzymeAdapter);

module.exports = ReactSeventeenAdapter;
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uL3NyYy9SZWFjdFNldmVudGVlbkFkYXB0ZXIuanMiXSwibmFtZXMiOlsiRmliZXJUYWdzIiwibm9kZUFuZFNpYmxpbmdzQXJyYXkiLCJub2RlV2l0aFNpYmxpbmciLCJhcnJheSIsIm5vZGUiLCJwdXNoIiwic2libGluZyIsImZsYXR0ZW4iLCJhcnIiLCJyZXN1bHQiLCJzdGFjayIsImkiLCJsZW5ndGgiLCJuIiwicG9wIiwiZWwiLCJBcnJheSIsImlzQXJyYXkiLCJub2RlVHlwZUZyb21UeXBlIiwidHlwZSIsIlBvcnRhbCIsImlzTWVtbyIsIk1lbW8iLCJpc0xhenkiLCJMYXp5IiwidW5tZW1vVHlwZSIsImNoZWNrSXNTdXNwZW5zZUFuZENsb25lRWxlbWVudCIsInN1c3BlbnNlRmFsbGJhY2siLCJjaGlsZHJlbiIsInByb3BzIiwiZmFsbGJhY2siLCJyZXBsYWNlTGF6eVdpdGhGYWxsYmFjayIsIkZha2VTdXNwZW5zZVdyYXBwZXIiLCJSZWFjdCIsImNyZWF0ZUVsZW1lbnQiLCJlbGVtZW50VG9UcmVlIiwiY29udGFpbmVySW5mbyIsIm5vZGVUeXBlIiwia2V5IiwicmVmIiwiaW5zdGFuY2UiLCJyZW5kZXJlZCIsInRvVHJlZSIsInZub2RlIiwidGFnIiwiSG9zdFJvb3QiLCJjaGlsZHJlblRvVHJlZSIsImNoaWxkIiwiSG9zdFBvcnRhbCIsInN0YXRlTm9kZSIsIm1lbW9pemVkUHJvcHMiLCJDbGFzc0NvbXBvbmVudCIsIkZ1bmN0aW9uYWxDb21wb25lbnQiLCJNZW1vQ2xhc3MiLCJlbGVtZW50VHlwZSIsIk1lbW9TRkMiLCJyZW5kZXJlZE5vZGVzIiwibWFwIiwiSG9zdENvbXBvbmVudCIsIkhvc3RUZXh0IiwiRnJhZ21lbnQiLCJNb2RlIiwiQ29udGV4dFByb3ZpZGVyIiwiQ29udGV4dENvbnN1bWVyIiwiUHJvZmlsZXIiLCJGb3J3YXJkUmVmIiwicGVuZGluZ1Byb3BzIiwiU3VzcGVuc2UiLCJPZmZzY3JlZW5Db21wb25lbnQiLCJFcnJvciIsIm5vZGVUb0hvc3ROb2RlIiwiX25vZGUiLCJtYXBwZXIiLCJpdGVtIiwiUmVhY3RET00iLCJmaW5kRE9NTm9kZSIsImdldEVtcHR5U3RhdGVWYWx1ZSIsIkVtcHR5U3RhdGUiLCJDb21wb25lbnQiLCJ0ZXN0UmVuZGVyZXIiLCJTaGFsbG93UmVuZGVyZXIiLCJyZW5kZXIiLCJfaW5zdGFuY2UiLCJzdGF0ZSIsIndyYXBBY3QiLCJmbiIsInJldHVyblZhbCIsIlRlc3RVdGlscyIsImFjdCIsImdldFByb3ZpZGVyRGVmYXVsdFZhbHVlIiwiUHJvdmlkZXIiLCJfY29udGV4dCIsIl9kZWZhdWx0VmFsdWUiLCJfY3VycmVudFZhbHVlIiwibWFrZUZha2VFbGVtZW50IiwiJCR0eXBlb2YiLCJFbGVtZW50IiwiaXNTdGF0ZWZ1bCIsInByb3RvdHlwZSIsImlzUmVhY3RDb21wb25lbnQiLCJfX3JlYWN0QXV0b0JpbmRQYWlycyIsIlJlYWN0U2V2ZW50ZWVuQWRhcHRlciIsImxpZmVjeWNsZXMiLCJvcHRpb25zIiwiZW5hYmxlQ29tcG9uZW50RGlkVXBkYXRlT25TZXRTdGF0ZSIsImxlZ2FjeUNvbnRleHRNb2RlIiwiY29tcG9uZW50RGlkVXBkYXRlIiwib25TZXRTdGF0ZSIsImdldERlcml2ZWRTdGF0ZUZyb21Qcm9wcyIsImhhc1Nob3VsZENvbXBvbmVudFVwZGF0ZUJ1ZyIsImdldFNuYXBzaG90QmVmb3JlVXBkYXRlIiwic2V0U3RhdGUiLCJza2lwc0NvbXBvbmVudERpZFVwZGF0ZU9uTnVsbGlzaCIsImdldENoaWxkQ29udGV4dCIsImNhbGxlZEJ5UmVuZGVyZXIiLCJnZXREZXJpdmVkU3RhdGVGcm9tRXJyb3IiLCJUeXBlRXJyb3IiLCJhdHRhY2hUbyIsImh5ZHJhdGVJbiIsIndyYXBwaW5nQ29tcG9uZW50UHJvcHMiLCJkb21Ob2RlIiwiZ2xvYmFsIiwiZG9jdW1lbnQiLCJhZGFwdGVyIiwiY29udGV4dCIsImNhbGxiYWNrIiwid3JhcHBlclByb3BzIiwicmVmUHJvcCIsIlJlYWN0V3JhcHBlckNvbXBvbmVudCIsIndyYXBwZWRFbCIsImh5ZHJhdGUiLCJzZXRDaGlsZFByb3BzIiwidW5tb3VudCIsInVubW91bnRDb21wb25lbnRBdE5vZGUiLCJnZXROb2RlIiwiaXNDdXN0b21Db21wb25lbnQiLCJfcmVhY3RJbnRlcm5hbHMiLCJzaW11bGF0ZUVycm9yIiwibm9kZUhpZXJhcmNoeSIsInJvb3ROb2RlIiwiZXJyb3IiLCJpc0Vycm9yQm91bmRhcnkiLCJlbEluc3RhbmNlIiwiY29tcG9uZW50RGlkQ2F0Y2giLCJmaW5kIiwiY2F0Y2hpbmdJbnN0YW5jZSIsImNhdGNoaW5nVHlwZSIsImRpc3BsYXlOYW1lT2ZOb2RlIiwic2ltdWxhdGVFdmVudCIsImV2ZW50IiwibW9jayIsIm1hcHBlZEV2ZW50IiwiZXZlbnRGbiIsIlNpbXVsYXRlIiwiYmF0Y2hlZFVwZGF0ZXMiLCJnZXRXcmFwcGluZ0NvbXBvbmVudFJlbmRlcmVyIiwiaW5zdCIsImdldE1vdW50V3JhcHBlckluc3RhbmNlIiwid3JhcEludm9rZSIsInJlbmRlcmVyIiwiaXNET00iLCJjYWNoZWROb2RlIiwibGFzdENvbXBvbmVudCIsIndyYXBwZWRDb21wb25lbnQiLCJzZW50aW5lbCIsIndyYXBQdXJlQ29tcG9uZW50IiwiY29tcGFyZSIsInNob3VsZENvbXBvbmVudFVwZGF0ZSIsIm5leHRQcm9wcyIsImlzUHVyZVJlYWN0Q29tcG9uZW50IiwibWVtb2l6ZWQiLCJwcmV2UHJvcHMiLCJ3cmFwcGVkQ29tcG9uZW50Rm4iLCJzaG91bGRVcGRhdGUiLCJhcmdzIiwiZGVmYXVsdFByb3BzIiwiT2JqZWN0IiwiYXNzaWduIiwiZGlzcGxheU5hbWUiLCJ3cmFwRnVuY3Rpb25hbENvbXBvbmVudCIsInJlbmRlckVsZW1lbnQiLCJlbENvbmZpZyIsInJlc3QiLCJyZW5kZXJlZEVsIiwidHlwZUlzRXhpc3RlZCIsImNsb25lZEVsIiwiZWxlbWVudElzQ2hhbmdlZCIsInVubWFza2VkQ29udGV4dCIsInByb3ZpZGVyVmFsdWVzIiwiTWFwIiwic2V0IiwidmFsdWUiLCJNb2NrUHJvdmlkZXIiLCJnZXRQcm92aWRlckZyb21Db25zdW1lciIsImhhcyIsImdldCIsIk1vY2tDb25zdW1lciIsImNvbnRleHRUeXBlcyIsIklubmVyQ29tcCIsImlzQ29tcG9uZW50U3RhdGVmdWwiLCJvcmlnaW5hbE1ldGhvZCIsIl91cGRhdGVDbGFzc0NvbXBvbmVudCIsImNsb25lZFByb3BzIiwiYXBwbHkiLCJyZXN0b3JlIiwiZW1wdHlTdGF0ZVZhbHVlIiwiZGVmaW5lUHJvcGVydHkiLCJjb25maWd1cmFibGUiLCJlbnVtZXJhYmxlIiwid3JpdGFibGUiLCJvdXRwdXQiLCJnZXRSZW5kZXJPdXRwdXQiLCJjb25jYXQiLCJoYW5kbGVyIiwiY2hlY2tQcm9wVHlwZXMiLCJ0eXBlU3BlY3MiLCJ2YWx1ZXMiLCJsb2NhdGlvbiIsImhpZXJhcmNoeSIsImNoaWxkQ29udGV4dFR5cGVzIiwiQ29udGV4dFdyYXBwZXIiLCJSZWFjdERPTVNlcnZlciIsInJlbmRlclRvU3RhdGljTWFya3VwIiwibW9kZSIsIkVuenltZUFkYXB0ZXIiLCJNT0RFUyIsIk1PVU5UIiwiY3JlYXRlTW91bnRSZW5kZXJlciIsIlNIQUxMT1ciLCJjcmVhdGVTaGFsbG93UmVuZGVyZXIiLCJTVFJJTkciLCJjcmVhdGVTdHJpbmdSZW5kZXJlciIsImVsZW1lbnQiLCJtYXRjaGluZ1R5cGUiLCJzdXBwb3J0c0FycmF5Iiwibm9kZXMiLCJmaWx0ZXIiLCJCb29sZWFuIiwiQ29uY3VycmVudE1vZGUiLCJOYU4iLCJTdHJpY3RNb2RlIiwiJCR0eXBlb2ZUeXBlIiwibm9kZU5hbWUiLCJuYW1lIiwib2JqZWN0IiwiZnJhZ21lbnQiLCJmYWtlRWxlbWVudCIsImlzVmFsaWRFbGVtZW50IiwiQ29uc3VtZXIiLCJSb290RmluZGVyIiwibW9kdWxlIiwiZXhwb3J0cyJdLCJtYXBwaW5ncyI6Ijs7QUFBQTs7QUFDQTs7QUFDQTs7QUFDQTs7QUFDQTs7QUFDQTs7QUFDQTs7QUFDQTs7QUFxQkE7O0FBQ0E7O0FBQ0E7O0FBQ0E7O0FB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eUJ5SSxJQUF6QixFQUErQjtBQUM3QixVQUFJLENBQUNBLElBQUQsSUFBUyxDQUFDLEtBQUsyRixjQUFMLENBQW9CM0YsSUFBcEIsQ0FBZCxFQUF5QztBQUN2QyxlQUFPLEtBQVA7QUFDRDs7QUFDRCxhQUFPLEtBQUtyQixpQkFBTCxDQUF1QnFCLElBQUksQ0FBQ3pJLElBQTVCLENBQVA7QUFDRDs7O1dBRUQsaUNBQXdCcU8sUUFBeEIsRUFBa0M7QUFDaEM7QUFDQSxVQUFJQSxRQUFKLEVBQWM7QUFDWixZQUFJOUosUUFBSjs7QUFDQSxZQUFJOEosUUFBUSxDQUFDN0osUUFBYixFQUF1QjtBQUNyQjtBQUNHRCxVQUFBQSxRQUZrQixHQUVMOEosUUFBUSxDQUFDN0osUUFGSixDQUVsQkQsUUFGa0I7QUFHdEIsU0FIRCxNQUdPLElBQUk4SixRQUFRLENBQUM5SixRQUFiLEVBQXVCO0FBQ3pCQSxVQUFBQSxRQUR5QixHQUNaOEosUUFEWSxDQUN6QjlKLFFBRHlCO0FBRTdCOztBQUNELFlBQUlBLFFBQUosRUFBYztBQUNaLGlCQUFPQSxRQUFQO0FBQ0Q7QUFDRjs7QUFDRCxZQUFNLElBQUlyQixLQUFKLENBQVUsMkVBQVYsQ0FBTjtBQUNEOzs7V0FFRCx5QkFBdUI7QUFDckIsMEJBQU9wQyxrQkFBTUMsYUFBTixvQ0FBUDtBQUNEOzs7V0FFRCxtQ0FBMEI5QixJQUExQixFQUFnQ21HLE9BQWhDLEVBQXlDO0FBQ3ZDLGFBQU87QUFDTGtKLFFBQUFBLFVBQVUsRUFBVkEsOEJBREs7QUFFTHJQLFFBQUFBLElBQUksRUFBRSxtREFBMEI2QixrQkFBTUMsYUFBaEMsRUFBK0M5QixJQUEvQyxFQUFxRG1HLE9BQXJEO0FBRkQsT0FBUDtBQUlEOzs7O0VBL2hCaUN5SCxxQjs7QUFraUJwQzBCLE1BQU0sQ0FBQ0MsT0FBUCxHQUFpQnRKLHFCQUFqQiIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCBSZWFjdCBmcm9tICdyZWFjdCc7XG5pbXBvcnQgUmVhY3RET00gZnJvbSAncmVhY3QtZG9tJztcbmltcG9ydCBSZWFjdERPTVNlcnZlciBmcm9tICdyZWFjdC1kb20vc2VydmVyJztcbmltcG9ydCBTaGFsbG93UmVuZGVyZXIgZnJvbSAncmVhY3QtdGVzdC1yZW5kZXJlci9zaGFsbG93JztcbmltcG9ydCBUZXN0VXRpbHMgZnJvbSAncmVhY3QtZG9tL3Rlc3QtdXRpbHMnO1xuaW1wb3J0IGNoZWNrUHJvcFR5cGVzIGZyb20gJ3Byb3AtdHlwZXMvY2hlY2tQcm9wVHlwZXMnO1xuaW1wb3J0IGhhcyBmcm9tICdoYXMnO1xuaW1wb3J0IHtcbiAgQ29uY3VycmVudE1vZGUsXG4gIENvbnRleHRDb25zdW1lcixcbiAgQ29udGV4dFByb3ZpZGVyLFxuICBFbGVtZW50LFxuICBGb3J3YXJkUmVmLFxuICBGcmFnbWVudCxcbiAgaXNDb250ZXh0Q29uc3VtZXIsXG4gIGlzQ29udGV4dFByb3ZpZGVyLFxuICBpc0VsZW1lbnQsXG4gIGlzRm9yd2FyZFJlZixcbiAgaXNQb3J0YWwsXG4gIGlzU3VzcGVuc2UsXG4gIGlzVmFsaWRFbGVtZW50VHlwZSxcbiAgTGF6eSxcbiAgTWVtbyxcbiAgUG9ydGFsLFxuICBQcm9maWxlcixcbiAgU3RyaWN0TW9kZSxcbiAgU3VzcGVuc2UsXG59IGZyb20gJ3JlYWN0LWlzJztcbmltcG9ydCB7IEVuenltZUFkYXB0ZXIgfSBmcm9tICdlbnp5bWUnO1xuaW1wb3J0IHsgdHlwZU9mTm9kZSB9IGZyb20gJ2VuenltZS9idWlsZC9VdGlscyc7XG5pbXBvcnQgc2hhbGxvd0VxdWFsIGZyb20gJ2VuenltZS1zaGFsbG93LWVxdWFsJztcbmltcG9ydCB7XG4gIGRpc3BsYXlOYW1lT2ZOb2RlLFxuICBlbGVtZW50VG9UcmVlIGFzIHV0aWxFbGVtZW50VG9UcmVlLFxuICBub2RlVHlwZUZyb21UeXBlIGFzIHV0aWxOb2RlVHlwZUZyb21UeXBlLFxuICBtYXBOYXRpdmVFdmVudE5hbWVzLFxuICBwcm9wRnJvbUV2ZW50LFxuICBhc3NlcnREb21BdmFpbGFibGUsXG4gIHdpdGhTZXRTdGF0ZUFsbG93ZWQsXG4gIGNyZWF0ZVJlbmRlcldyYXBwZXIsXG4gIGNyZWF0ZU1vdW50V3JhcHBlcixcbiAgcHJvcHNXaXRoS2V5c0FuZFJlZixcbiAgZW5zdXJlS2V5T3JVbmRlZmluZWQsXG4gIHNpbXVsYXRlRXJyb3IsXG4gIHdyYXAsXG4gIGdldE1hc2tlZENvbnRleHQsXG4gIGdldENvbXBvbmVudFN0YWNrLFxuICBSb290RmluZGVyLFxuICBnZXROb2RlRnJvbVJvb3RGaW5kZXIsXG4gIHdyYXBXaXRoV3JhcHBpbmdDb21wb25lbnQsXG4gIGdldFdyYXBwaW5nQ29tcG9uZW50TW91bnRSZW5kZXJlcixcbiAgY29tcGFyZU5vZGVUeXBlT2YsXG4gIHNweU1ldGhvZCxcbn0gZnJvbSAnQHdvanRla21hai9lbnp5bWUtYWRhcHRlci11dGlscyc7XG5pbXBvcnQgZmluZEN1cnJlbnRGaWJlclVzaW5nU2xvd1BhdGggZnJvbSAnLi9maW5kQ3VycmVudEZpYmVyVXNpbmdTbG93UGF0aCc7XG5pbXBvcnQgZGV0ZWN0RmliZXJUYWdzIGZyb20gJy4vZGV0ZWN0RmliZXJUYWdzJztcblxuLy8gTGF6aWx5IHBvcHVsYXRlZCBpZiBET00gaXMgYXZhaWxhYmxlLlxubGV0IEZpYmVyVGFncyA9IG51bGw7XG5cbmZ1bmN0aW9uIG5vZGVBbmRTaWJsaW5nc0FycmF5KG5vZGVXaXRoU2libGluZykge1xuICBjb25zdCBhcnJheSA9IFtdO1xuICBsZXQgbm9kZSA9IG5vZGVXaXRoU2libGluZztcbiAgd2hpbGUgKG5vZGUgIT0gbnVsbCkge1xuICAgIGFycmF5LnB1c2gobm9kZSk7XG4gICAgbm9kZSA9IG5vZGUuc2libGluZztcbiAgfVxuICByZXR1cm4gYXJyYXk7XG59XG5cbmZ1bmN0aW9uIGZsYXR0ZW4oYXJyKSB7XG4gIGNvbnN0IHJlc3VsdCA9IFtdO1xuICBjb25zdCBzdGFjayA9IFt7IGk6IDAsIGFycmF5OiBhcnIgfV07XG4gIHdoaWxlIChzdGFjay5sZW5ndGgpIHtcbiAgICBjb25zdCBuID0gc3RhY2sucG9wKCk7XG4gICAgd2hpbGUgKG4uaSA8IG4uYXJyYXkubGVuZ3RoKSB7XG4gICAgICBjb25zdCBlbCA9IG4uYXJyYXlbbi5pXTtcbiAgICAgIG4uaSArPSAxO1xuICAgICAgaWYgKEFycmF5LmlzQXJyYXkoZWwpKSB7XG4gICAgICAgIHN0YWNrLnB1c2gobik7XG4gICAgICAgIHN0YWNrLnB1c2goeyBpOiAwLCBhcnJheTogZWwgfSk7XG4gICAgICAgIGJyZWFrO1xuICAgICAgfVxuICAgICAgcmVzdWx0LnB1c2goZWwpO1xuICAgIH1cbiAgfVxuICByZXR1cm4gcmVzdWx0O1xufVxuXG5mdW5jdGlvbiBub2RlVHlwZUZyb21UeXBlKHR5cGUpIHtcbiAgaWYgKHR5cGUgPT09IFBvcnRhbCkge1xuICAgIHJldHVybiAncG9ydGFsJztcbiAgfVxuXG4gIHJldHVybiB1dGlsTm9kZVR5cGVGcm9tVHlwZSh0eXBlKTtcbn1cblxuZnVuY3Rpb24gaXNNZW1vKHR5cGUpIHtcbiAgcmV0dXJuIGNvbXBhcmVOb2RlVHlwZU9mKHR5cGUsIE1lbW8pO1xufVxuXG5mdW5jdGlvbiBpc0xhenkodHlwZSkge1xuICByZXR1cm4gY29tcGFyZU5vZGVUeXBlT2YodHlwZSwgTGF6eSk7XG59XG5cbmZ1bmN0aW9uIHVubWVtb1R5cGUodHlwZSkge1xuICByZXR1cm4gaXNNZW1vKHR5cGUpID8gdHlwZS50eXBlIDogdHlwZTtcbn1cblxuZnVuY3Rpb24gY2hlY2tJc1N1c3BlbnNlQW5kQ2xvbmVFbGVtZW50KGVsLCB7IHN1c3BlbnNlRmFsbGJhY2sgfSkge1xuICBpZiAoIWlzU3VzcGVuc2UoZWwpKSB7XG4gICAgcmV0dXJuIGVsO1xuICB9XG5cbiAgbGV0IHsgY2hpbGRyZW4gfSA9IGVsLnByb3BzO1xuXG4gIGlmIChzdXNwZW5zZUZhbGxiYWNrKSB7XG4gICAgY29uc3QgeyBmYWxsYmFjayB9ID0gZWwucHJvcHM7XG4gICAgY2hpbGRyZW4gPSByZXBsYWNlTGF6eVdpdGhGYWxsYmFjayhjaGlsZHJlbiwgZmFsbGJhY2spO1xuICB9XG5cbiAgY29uc3QgRmFrZVN1c3BlbnNlV3JhcHBlciA9IChwcm9wcykgPT5cbiAgICBSZWFjdC5jcmVhdGVFbGVtZW50KGVsLnR5cGUsIHsgLi4uZWwucHJvcHMsIC4uLnByb3BzIH0sIGNoaWxkcmVuKTtcbiAgcmV0dXJuIFJlYWN0LmNyZWF0ZUVsZW1lbnQoRmFrZVN1c3BlbnNlV3JhcHBlciwgbnVsbCwgY2hpbGRyZW4pO1xufVxuXG5mdW5jdGlvbiBlbGVtZW50VG9UcmVlKGVsKSB7XG4gIGlmICghaXNQb3J0YWwoZWwpKSB7XG4gICAgcmV0dXJuIHV0aWxFbGVtZW50VG9UcmVlKGVsLCBlbGVtZW50VG9UcmVlKTtcbiAgfVxuXG4gIGNvbnN0IHsgY2hpbGRyZW4sIGNvbnRhaW5lckluZm8gfSA9IGVsO1xuICBjb25zdCBwcm9wcyA9IHsgY2hpbGRyZW4sIGNvbnRhaW5lckluZm8gfTtcblxuICByZXR1cm4ge1xuICAgIG5vZGVUeXBlOiAncG9ydGFsJyxcbiAgICB0eXBlOiBQb3J0YWwsXG4gICAgcHJvcHMsXG4gICAga2V5OiBlbnN1cmVLZXlPclVuZGVmaW5lZChlbC5rZXkpLFxuICAgIHJlZjogZWwucmVmIHx8IG51bGwsXG4gICAgaW5zdGFuY2U6IG51bGwsXG4gICAgcmVuZGVyZWQ6IGVsZW1lbnRUb1RyZWUoZWwuY2hpbGRyZW4pLFxuICB9O1xufVxuXG5mdW5jdGlvbiB0b1RyZWUodm5vZGUpIHtcbiAgaWYgKHZub2RlID09IG51bGwpIHtcbiAgICByZXR1cm4gbnVsbDtcbiAgfVxuICAvLyBUT0RPKGxtcik6IEknbSBub3QgcmVhbGx5IHN1cmUgSSB1bmRlcnN0YW5kIHdoZXRoZXIgb3Igbm90IHRoaXMgaXMgd2hhdFxuICAvLyBpIHNob3VsZCBiZSBkb2luZywgb3IgaWYgdGhpcyBpcyBhIGhhY2sgZm9yIHNvbWV0aGluZyBpJ20gZG9pbmcgd3JvbmdcbiAgLy8gc29tZXdoZXJlIGVsc2UuIFNob3VsZCB0YWxrIHRvIHNlYmFzdGlhbiBhYm91dCB0aGlzIHBlcmhhcHNcbiAgY29uc3Qgbm9kZSA9IGZpbmRDdXJyZW50RmliZXJVc2luZ1Nsb3dQYXRoKHZub2RlKTtcbiAgc3dpdGNoIChub2RlLnRhZykge1xuICAgIGNhc2UgRmliZXJUYWdzLkhvc3RSb290OlxuICAgICAgcmV0dXJuIGNoaWxkcmVuVG9UcmVlKG5vZGUuY2hpbGQpO1xuICAgIGNhc2UgRmliZXJUYWdzLkhvc3RQb3J0YWw6IHtcbiAgICAgIGNvbnN0IHtcbiAgICAgICAgc3RhdGVOb2RlOiB7IGNvbnRhaW5lckluZm8gfSxcbiAgICAgICAgbWVtb2l6ZWRQcm9wczogY2hpbGRyZW4sXG4gICAgICB9ID0gbm9kZTtcbiAgICAgIGNvbnN0IHByb3BzID0geyBjb250YWluZXJJbmZvLCBjaGlsZHJlbiB9O1xuICAgICAgcmV0dXJuIHtcbiAgICAgICAgbm9kZVR5cGU6ICdwb3J0YWwnLFxuICAgICAgICB0eXBlOiBQb3J0YWwsXG4gICAgICAgIHByb3BzLFxuICAgICAgICBrZXk6IGVuc3VyZUtleU9yVW5kZWZpbmVkKG5vZGUua2V5KSxcbiAgICAgICAgcmVmOiBub2RlLnJlZixcbiAgICAgICAgaW5zdGFuY2U6IG51bGwsXG4gICAgICAgIHJlbmRlcmVkOiBjaGlsZHJlblRvVHJlZShub2RlLmNoaWxkKSxcbiAgICAgIH07XG4gICAgfVxuICAgIGNhc2UgRmliZXJUYWdzLkNsYXNzQ29tcG9uZW50OlxuICAgICAgcmV0dXJuIHtcbiAgICAgICAgbm9kZVR5cGU6ICdjbGFzcycsXG4gICAgICAgIHR5cGU6IG5vZGUudHlwZSxcbiAgICAgICAgcHJvcHM6IHsgLi4ubm9kZS5tZW1vaXplZFByb3BzIH0sXG4gICAgICAgIGtleTogZW5zdXJlS2V5T3JVbmRlZmluZWQobm9kZS5rZXkpLFxuICAgICAgICByZWY6IG5vZGUucmVmLFxuICAgICAgICBpbnN0YW5jZTogbm9kZS5zdGF0ZU5vZGUsXG4gICAgICAgIHJlbmRlcmVkOiBjaGlsZHJlblRvVHJlZShub2RlLmNoaWxkKSxcbiAgICAgIH07XG4gICAgY2FzZSBGaWJlclRhZ3MuRnVuY3Rpb25hbENvbXBvbmVudDpcbiAgICAgIHJldHVybiB7XG4gICAgICAgIG5vZGVUeXBlOiAnZnVuY3Rpb24nLFxuICAgICAgICB0eXBlOiBub2RlLnR5cGUsXG4gICAgICAgIHByb3BzOiB7IC4uLm5vZGUubWVtb2l6ZWRQcm9wcyB9LFxuICAgICAgICBrZXk6IGVuc3VyZUtleU9yVW5kZWZpbmVkKG5vZGUua2V5KSxcbiAgICAgICAgcmVmOiBub2RlLnJlZixcbiAgICAgICAgaW5zdGFuY2U6IG51bGwsXG4gICAgICAgIHJlbmRlcmVkOiBjaGlsZHJlblRvVHJlZShub2RlLmNoaWxkKSxcbiAgICAgIH07XG4gICAgY2FzZSBGaWJlclRhZ3MuTWVtb0NsYXNzOlxuICAgICAgcmV0dXJuIHtcbiAgICAgICAgbm9kZVR5cGU6ICdjbGFzcycsXG4gICAgICAgIHR5cGU6IG5vZGUuZWxlbWVudFR5cGUudHlwZSxcbiAgICAgICAgcHJvcHM6IHsgLi4ubm9kZS5tZW1vaXplZFByb3BzIH0sXG4gICAgICAgIGtleTogZW5zdXJlS2V5T3JVbmRlZmluZWQobm9kZS5rZXkpLFxuICAgICAgICByZWY6IG5vZGUucmVmLFxuICAgICAgICBpbnN0YW5jZTogbm9kZS5zdGF0ZU5vZGUsXG4gICAgICAgIHJlbmRlcmVkOiBjaGlsZHJlblRvVHJlZShub2RlLmNoaWxkLmNoaWxkKSxcbiAgICAgIH07XG4gICAgY2FzZSBGaWJlclRhZ3MuTWVtb1NGQzoge1xuICAgICAgbGV0IHJlbmRlcmVkTm9kZXMgPSBmbGF0dGVuKG5vZGVBbmRTaWJsaW5nc0FycmF5KG5vZGUuY2hpbGQpLm1hcCh0b1RyZWUpKTtcbiAgICAgIGlmIChyZW5kZXJlZE5vZGVzLmxlbmd0aCA9PT0gMCkge1xuICAgICAgICByZW5kZXJlZE5vZGVzID0gW25vZGUubWVtb2l6ZWRQcm9wcy5jaGlsZHJlbl07XG4gICAgICB9XG4gICAgICByZXR1cm4ge1xuICAgICAgICBub2RlVHlwZTogJ2Z1bmN0aW9uJyxcbiAgICAgICAgdHlwZTogbm9kZS5lbGVtZW50VHlwZSxcbiAgICAgICAgcHJvcHM6IHsgLi4ubm9kZS5tZW1vaXplZFByb3BzIH0sXG4gICAgICAgIGtleTogZW5zdXJlS2V5T3JVbmRlZmluZWQobm9kZS5rZXkpLFxuICAgICAgICByZWY6IG5vZGUucmVmLFxuICAgICAgICBpbnN0YW5jZTogbnVsbCxcbiAgICAgICAgcmVuZGVyZWQ6IHJlbmRlcmVkTm9kZXMsXG4gICAgICB9O1xuICAgIH1cbiAgICBjYXNlIEZpYmVyVGFncy5Ib3N0Q29tcG9uZW50OiB7XG4gICAgICBsZXQgcmVuZGVyZWROb2RlcyA9IGZsYXR0ZW4obm9kZUFuZFNpYmxpbmdzQXJyYXkobm9kZS5jaGlsZCkubWFwKHRvVHJlZSkpO1xuICAgICAgaWYgKHJlbmRlcmVkTm9kZXMubGVuZ3RoID09PSAwKSB7XG4gICAgICAgIHJlbmRlcmVkTm9kZXMgPSBbbm9kZS5tZW1vaXplZFByb3BzLmNoaWxkcmVuXTtcbiAgICAgIH1cbiAgICAgIHJldHVybiB7XG4gICAgICAgIG5vZGVUeXBlOiAnaG9zdCcsXG4gICAgICAgIHR5cGU6IG5vZGUudHlwZSxcbiAgICAgICAgcHJvcHM6IHsgLi4ubm9kZS5tZW1vaXplZFByb3BzIH0sXG4gICAgICAgIGtleTogZW5zdXJlS2V5T3JVbmRlZmluZWQobm9kZS5rZXkpLFxuICAgICAgICByZWY6IG5vZGUucmVmLFxuICAgICAgICBpbnN0YW5jZTogbm9kZS5zdGF0ZU5vZGUsXG4gICAgICAgIHJlbmRlcmVkOiByZW5kZXJlZE5vZGVzLFxuICAgICAgfTtcbiAgICB9XG4gICAgY2FzZSBGaWJlclRhZ3MuSG9zdFRleHQ6XG4gICAgICByZXR1cm4gbm9kZS5tZW1vaXplZFByb3BzO1xuICAgIGNhc2UgRmliZXJUYWdzLkZyYWdtZW50OlxuICAgIGNhc2UgRmliZXJUYWdzLk1vZGU6XG4gICAgY2FzZSBGaWJlclRhZ3MuQ29udGV4dFByb3ZpZGVyOlxuICAgIGNhc2UgRmliZXJUYWdzLkNvbnRleHRDb25zdW1lcjpcbiAgICAgIHJldHVybiBjaGlsZHJlblRvVHJlZShub2RlLmNoaWxkKTtcbiAgICBjYXNlIEZpYmVyVGFncy5Qcm9maWxlcjpcbiAgICBjYXNlIEZpYmVyVGFncy5Gb3J3YXJkUmVmOiB7XG4gICAgICByZXR1cm4ge1xuICAgICAgICBub2RlVHlwZTogJ2Z1bmN0aW9uJyxcbiAgICAgICAgdHlwZTogbm9kZS50eXBlLFxuICAgICAgICBwcm9wczogeyAuLi5ub2RlLnBlbmRpbmdQcm9wcyB9LFxuICAgICAgICBrZXk6IGVuc3VyZUtleU9yVW5kZWZpbmVkKG5vZGUua2V5KSxcbiAgICAgICAgcmVmOiBub2RlLnJlZixcbiAgICAgICAgaW5zdGFuY2U6IG51bGwsXG4gICAgICAgIHJlbmRlcmVkOiBjaGlsZHJlblRvVHJlZShub2RlLmNoaWxkKSxcbiAgICAgIH07XG4gICAgfVxuICAgIGNhc2UgRmliZXJUYWdzLlN1c3BlbnNlOiB7XG4gICAgICByZXR1cm4ge1xuICAgICAgICBub2RlVHlwZTogJ2Z1bmN0aW9uJyxcbiAgICAgICAgdHlwZTogU3VzcGVuc2UsXG4gICAgICAgIHByb3BzOiB7IC4uLm5vZGUubWVtb2l6ZWRQcm9wcyB9LFxuICAgICAgICBrZXk6IGVuc3VyZUtleU9yVW5kZWZpbmVkKG5vZGUua2V5KSxcbiAgICAgICAgcmVmOiBub2RlLnJlZixcbiAgICAgICAgaW5zdGFuY2U6IG51bGwsXG4gICAgICAgIHJlbmRlcmVkOiBjaGlsZHJlblRvVHJlZShub2RlLmNoaWxkKSxcbiAgICAgIH07XG4gICAgfVxuICAgIGNhc2UgRmliZXJUYWdzLkxhenk6XG4gICAgICByZXR1cm4gY2hpbGRyZW5Ub1RyZWUobm9kZS5jaGlsZCk7XG4gICAgY2FzZSBGaWJlclRhZ3MuT2Zmc2NyZWVuQ29tcG9uZW50OlxuICAgICAgcmV0dXJuIHRvVHJlZShub2RlLmNoaWxkKTtcbiAgICBkZWZhdWx0OlxuICAgICAgdGhyb3cgbmV3IEVycm9yKGBFbnp5bWUgSW50ZXJuYWwgRXJyb3I6IHVua25vd24gbm9kZSB3aXRoIHRhZyAke25vZGUudGFnfWApO1xuICB9XG59XG5cbmZ1bmN0aW9uIGNoaWxkcmVuVG9UcmVlKG5vZGUpIHtcbiAgaWYgKCFub2RlKSB7XG4gICAgcmV0dXJuIG51bGw7XG4gIH1cbiAgY29uc3QgY2hpbGRyZW4gPSBub2RlQW5kU2libGluZ3NBcnJheShub2RlKTtcbiAgaWYgKGNoaWxkcmVuLmxlbmd0aCA9PT0gMCkge1xuICAgIHJldHVybiBudWxsO1xuICB9XG4gIGlmIChjaGlsZHJlbi5sZW5ndGggPT09IDEpIHtcbiAgICByZXR1cm4gdG9UcmVlKGNoaWxkcmVuWzBdKTtcbiAgfVxuICByZXR1cm4gZmxhdHRlbihjaGlsZHJlbi5tYXAodG9UcmVlKSk7XG59XG5cbmZ1bmN0aW9uIG5vZGVUb0hvc3ROb2RlKF9ub2RlKSB7XG4gIC8vIE5PVEUobG1yKTogbm9kZSBjb3VsZCBiZSBhIGZ1bmN0aW9uIGNvbXBvbmVudFxuICAvLyB3aGljaCB3b250IGhhdmUgYW4gaW5zdGFuY2UgcHJvcCwgYnV0IHdlIGNhbiBnZXQgdGhlXG4gIC8vIGhvc3Qgbm9kZSBhc3NvY2lhdGVkIHdpdGggaXRzIHJldHVybiB2YWx1ZSBhdCB0aGF0IHBvaW50LlxuICAvLyBBbHRob3VnaCB0aGlzIGJyZWFrcyBkb3duIGlmIHRoZSByZXR1cm4gdmFsdWUgaXMgYW4gYXJyYXksXG4gIC8vIGFzIGlzIHBvc3NpYmxlIHdpdGggUmVhY3QgMTYuXG4gIGxldCBub2RlID0gX25vZGU7XG4gIHdoaWxlIChub2RlICYmICFBcnJheS5pc0FycmF5KG5vZGUpICYmIG5vZGUuaW5zdGFuY2UgPT09IG51bGwpIHtcbiAgICBub2RlID0gbm9kZS5yZW5kZXJlZDtcbiAgfVxuICAvLyBpZiB0aGUgU0ZDIHJldHVybmVkIG51bGwgZWZmZWN0aXZlbHksIHRoZXJlIGlzIG5vIGhvc3Qgbm9kZS5cbiAgaWYgKCFub2RlKSB7XG4gICAgcmV0dXJuIG51bGw7XG4gIH1cblxuICBjb25zdCBtYXBwZXIgPSAoaXRlbSkgPT4ge1xuICAgIGlmIChpdGVtICYmIGl0ZW0uaW5zdGFuY2UpIHJldHVybiBSZWFjdERPTS5maW5kRE9NTm9kZShpdGVtLmluc3RhbmNlKTtcbiAgICByZXR1cm4gbnVsbDtcbiAgfTtcbiAgaWYgKEFycmF5LmlzQXJyYXkobm9kZSkpIHtcbiAgICByZXR1cm4gbm9kZS5tYXAobWFwcGVyKTtcbiAgfVxuICBpZiAoQXJyYXkuaXNBcnJheShub2RlLnJlbmRlcmVkKSAmJiBub2RlLm5vZGVUeXBlID09PSAnY2xhc3MnKSB7XG4gICAgcmV0dXJuIG5vZGUucmVuZGVyZWQubWFwKG1hcHBlcik7XG4gIH1cbiAgcmV0dXJuIG1hcHBlcihub2RlKTtcbn1cblxuZnVuY3Rpb24gcmVwbGFjZUxhenlXaXRoRmFsbGJhY2sobm9kZSwgZmFsbGJhY2spIHtcbiAgaWYgKCFub2RlKSB7XG4gICAgcmV0dXJuIG51bGw7XG4gIH1cbiAgaWYgKEFycmF5LmlzQXJyYXkobm9kZSkpIHtcbiAgICByZXR1cm4gbm9kZS5tYXAoKGVsKSA9PiByZXBsYWNlTGF6eVdpdGhGYWxsYmFjayhlbCwgZmFsbGJhY2spKTtcbiAgfVxuICBpZiAoaXNMYXp5KG5vZGUudHlwZSkpIHtcbiAgICByZXR1cm4gZmFsbGJhY2s7XG4gIH1cbiAgcmV0dXJuIHtcbiAgICAuLi5ub2RlLFxuICAgIHByb3BzOiB7XG4gICAgICAuLi5ub2RlLnByb3BzLFxuICAgICAgY2hpbGRyZW46IHJlcGxhY2VMYXp5V2l0aEZhbGxiYWNrKG5vZGUucHJvcHMuY2hpbGRyZW4sIGZhbGxiYWNrKSxcbiAgICB9LFxuICB9O1xufVxuXG5mdW5jdGlvbiBnZXRFbXB0eVN0YXRlVmFsdWUoKSB7XG4gIC8vIHRoaXMgaGFuZGxlcyBhIGJ1ZyBpbiBSZWFjdCAxNi4wIC0gMTYuMlxuICAvLyBzZWUgaHR0cHM6Ly9naXRodWIuY29tL2ZhY2Vib29rL3JlYWN0L2NvbW1pdC8zOWJlODM1NjVjNjVmOWM1MjIxNTBlNTIzNzUxNjc1NjhhMmExNDU5XG4gIC8vIGFsc28gc2VlIGh0dHBzOi8vZ2l0aHViLmNvbS9mYWNlYm9vay9yZWFjdC9wdWxsLzExOTY1XG5cbiAgY2xhc3MgRW1wdHlTdGF0ZSBleHRlbmRzIFJlYWN0LkNvbXBvbmVudCB7XG4gICAgcmVuZGVyKCkge1xuICAgICAgcmV0dXJuIG51bGw7XG4gICAgfVxuICB9XG4gIGNvbnN0IHRlc3RSZW5kZXJlciA9IG5ldyBTaGFsbG93UmVuZGVyZXIoKTtcbiAgdGVzdFJlbmRlcmVyLnJlbmRlcihSZWFjdC5jcmVhdGVFbGVtZW50KEVtcHR5U3RhdGUpKTtcbiAgcmV0dXJuIHRlc3RSZW5kZXJlci5faW5zdGFuY2Uuc3RhdGU7XG59XG5cbmZ1bmN0aW9uIHdyYXBBY3QoZm4pIHtcbiAgbGV0IHJldHVyblZhbDtcbiAgVGVzdFV0aWxzLmFjdCgoKSA9PiB7XG4gICAgcmV0dXJuVmFsID0gZm4oKTtcbiAgfSk7XG4gIHJldHVybiByZXR1cm5WYWw7XG59XG5cbmZ1bmN0aW9uIGdldFByb3ZpZGVyRGVmYXVsdFZhbHVlKFByb3ZpZGVyKSB7XG4gIC8vIFJlYWN0IHN0b3JlcyByZWZlcmVuY2VzIHRvIHRoZSBQcm92aWRlcidzIGRlZmF1bHRWYWx1ZSBkaWZmZXJlbnRseSBhY3Jvc3MgdmVyc2lvbnMuXG4gIGlmICgnX2RlZmF1bHRWYWx1ZScgaW4gUHJvdmlkZXIuX2NvbnRleHQpIHtcbiAgICByZXR1cm4gUHJvdmlkZXIuX2NvbnRleHQuX2RlZmF1bHRWYWx1ZTtcbiAgfVxuICBpZiAoJ19jdXJyZW50VmFsdWUnIGluIFByb3ZpZGVyLl9jb250ZXh0KSB7XG4gICAgcmV0dXJuIFByb3ZpZGVyLl9jb250ZXh0Ll9jdXJyZW50VmFsdWU7XG4gIH1cbiAgdGhyb3cgbmV3IEVycm9yKCdFbnp5bWUgSW50ZXJuYWwgRXJyb3I6IGNhbuKAmXQgZmlndXJlIG91dCBob3cgdG8gZ2V0IFByb3ZpZGVy4oCZcyBkZWZhdWx0IHZhbHVlJyk7XG59XG5cbmZ1bmN0aW9uIG1ha2VGYWtlRWxlbWVudCh0eXBlKSB7XG4gIHJldHVybiB7ICQkdHlwZW9mOiBFbGVtZW50LCB0eXBlIH07XG59XG5cbmZ1bmN0aW9uIGlzU3RhdGVmdWwoQ29tcG9uZW50KSB7XG4gIHJldHVybiAoXG4gICAgQ29tcG9uZW50LnByb3RvdHlwZSAmJlxuICAgIChDb21wb25lbnQucHJvdG90eXBlLmlzUmVhY3RDb21wb25lbnQgfHwgQXJyYXkuaXNBcnJheShDb21wb25lbnQuX19yZWFjdEF1dG9CaW5kUGFpcnMpKSAvLyBmYWxsYmFjayBmb3IgY3JlYXRlQ2xhc3MgY29tcG9uZW50c1xuICApO1xufVxuXG5jbGFzcyBSZWFjdFNldmVudGVlbkFkYXB0ZXIgZXh0ZW5kcyBFbnp5bWVBZGFwdGVyIHtcbiAgY29uc3RydWN0b3IoKSB7XG4gICAgc3VwZXIoKTtcbiAgICBjb25zdCB7IGxpZmVjeWNsZXMgfSA9IHRoaXMub3B0aW9ucztcbiAgICB0aGlzLm9wdGlvbnMgPSB7XG4gICAgICAuLi50aGlzLm9wdGlvbnMsXG4gICAgICBlbmFibGVDb21wb25lbnREaWRVcGRhdGVPblNldFN0YXRlOiB0cnVlLCAvLyBUT0RPOiByZW1vdmUsIHNlbXZlci1tYWpvclxuICAgICAgbGVnYWN5Q29udGV4dE1vZGU6ICdwYXJlbnQnLFxuICAgICAgbGlmZWN5Y2xlczoge1xuICAgICAgICAuLi5saWZlY3ljbGVzLFxuICAgICAgICBjb21wb25lbnREaWRVcGRhdGU6IHtcbiAgICAgICAgICBvblNldFN0YXRlOiB0cnVlLFxuICAgICAgICB9LFxuICAgICAgICBnZXREZXJpdmVkU3RhdGVGcm9tUHJvcHM6IHtcbiAgICAgICAgICBoYXNTaG91bGRDb21wb25lbnRVcGRhdGVCdWc6IGZhbHNlLFxuICAgICAgICB9LFxuICAgICAgICBnZXRTbmFwc2hvdEJlZm9yZVVwZGF0ZTogdHJ1ZSxcbiAgICAgICAgc2V0U3RhdGU6IHtcbiAgICAgICAgICBza2lwc0NvbXBvbmVudERpZFVwZGF0ZU9uTnVsbGlzaDogdHJ1ZSxcbiAgICAgICAgfSxcbiAgICAgICAgZ2V0Q2hpbGRDb250ZXh0OiB7XG4gICAgICAgICAgY2FsbGVkQnlSZW5kZXJlcjogZmFsc2UsXG4gICAgICAgIH0sXG4gICAgICAgIGdldERlcml2ZWRTdGF0ZUZyb21FcnJvcjogdHJ1ZSxcbiAgICAgIH0sXG4gICAgfTtcbiAgfVxuXG4gIGNyZWF0ZU1vdW50UmVuZGVyZXIob3B0aW9ucykge1xuICAgIGFzc2VydERvbUF2YWlsYWJsZSgnbW91bnQnKTtcbiAgICBpZiAoaGFzKG9wdGlvbnMsICdzdXNwZW5zZUZhbGxiYWNrJykpIHtcbiAgICAgIHRocm93IG5ldyBUeXBlRXJyb3IoJ2BzdXNwZW5zZUZhbGxiYWNrYCBpcyBub3Qgc3VwcG9ydGVkIGJ5IHRoZSBgbW91bnRgIHJlbmRlcmVyJyk7XG4gICAgfVxuICAgIGlmIChGaWJlclRhZ3MgPT09IG51bGwpIHtcbiAgICAgIC8vIFJlcXVpcmVzIERPTS5cbiAgICAgIEZpYmVyVGFncyA9IGRldGVjdEZpYmVyVGFncygpO1xuICAgIH1cbiAgICBjb25zdCB7IGF0dGFjaFRvLCBoeWRyYXRlSW4sIHdyYXBwaW5nQ29tcG9uZW50UHJvcHMgfSA9IG9wdGlvbnM7XG4gICAgY29uc3QgZG9tTm9kZSA9IGh5ZHJhdGVJbiB8fCBhdHRhY2hUbyB8fCBnbG9iYWwuZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnZGl2Jyk7XG4gICAgbGV0IGluc3RhbmNlID0gbnVsbDtcbiAgICBjb25zdCBhZGFwdGVyID0gdGhpcztcbiAgICByZXR1cm4ge1xuICAgICAgcmVuZGVyKGVsLCBjb250ZXh0LCBjYWxsYmFjaykge1xuICAgICAgICByZXR1cm4gd3JhcEFjdCgoKSA9PiB7XG4gICAgICAgICAgaWYgKGluc3RhbmNlID09PSBudWxsKSB7XG4gICAgICAgICAgICBjb25zdCB7IHR5cGUsIHByb3BzLCByZWYgfSA9IGVsO1xuICAgICAgICAgICAgY29uc3Qgd3JhcHBlclByb3BzID0ge1xuICAgICAgICAgICAgICBDb21wb25lbnQ6IHR5cGUsXG4gICAgICAgICAgICAgIHByb3BzLFxuICAgICAgICAgICAgICB3cmFwcGluZ0NvbXBvbmVudFByb3BzLFxuICAgICAgICAgICAgICBjb250ZXh0LFxuICAgICAgICAgICAgICAuLi4ocmVmICYmIHsgcmVmUHJvcDogcmVmIH0pLFxuICAgICAgICAgICAgfTtcbiAgICAgICAgICAgIGNvbnN0IFJlYWN0V3JhcHBlckNvbXBvbmVudCA9IGNyZWF0ZU1vdW50V3JhcHBlcihlbCwgeyAuLi5vcHRpb25zLCBhZGFwdGVyIH0pO1xuICAgICAgICAgICAgY29uc3Qgd3JhcHBlZEVsID0gUmVhY3QuY3JlYXRlRWxlbWVudChSZWFjdFdyYXBwZXJDb21wb25lbnQsIHdyYXBwZXJQcm9wcyk7XG4gICAgICAgICAgICBpbnN0YW5jZSA9IGh5ZHJhdGVJblxuICAgICAgICAgICAgICA/IFJlYWN0RE9NLmh5ZHJhdGUod3JhcHBlZEVsLCBkb21Ob2RlKVxuICAgICAgICAgICAgICA6IFJlYWN0RE9NLnJlbmRlcih3cmFwcGVkRWwsIGRvbU5vZGUpO1xuICAgICAgICAgICAgaWYgKHR5cGVvZiBjYWxsYmFjayA9PT0gJ2Z1bmN0aW9uJykge1xuICAgICAgICAgICAgICBjYWxsYmFjaygpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBpbnN0YW5jZS5zZXRDaGlsZFByb3BzKGVsLnByb3BzLCBjb250ZXh0LCBjYWxsYmFjayk7XG4gICAgICAgICAgfVxuICAgICAgICB9KTtcbiAgICAgIH0sXG4gICAgICB1bm1vdW50KCkge1xuICAgICAgICB3cmFwQWN0KCgpID0+IHtcbiAgICAgICAgICBSZWFjdERPTS51bm1vdW50Q29tcG9uZW50QXROb2RlKGRvbU5vZGUpO1xuICAgICAgICB9KTtcbiAgICAgICAgaW5zdGFuY2UgPSBudWxsO1xuICAgICAgfSxcbiAgICAgIGdldE5vZGUoKSB7XG4gICAgICAgIGlmICghaW5zdGFuY2UpIHtcbiAgICAgICAgICByZXR1cm4gbnVsbDtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gZ2V0Tm9kZUZyb21Sb290RmluZGVyKFxuICAgICAgICAgIGFkYXB0ZXIuaXNDdXN0b21Db21wb25lbnQsXG4gICAgICAgICAgdG9UcmVlKGluc3RhbmNlLl9yZWFjdEludGVybmFscyksXG4gICAgICAgICAgb3B0aW9ucyxcbiAgICAgICAgKTtcbiAgICAgIH0sXG4gICAgICBzaW11bGF0ZUVycm9yKG5vZGVIaWVyYXJjaHksIHJvb3ROb2RlLCBlcnJvcikge1xuICAgICAgICBjb25zdCBpc0Vycm9yQm91bmRhcnkgPSAoeyBpbnN0YW5jZTogZWxJbnN0YW5jZSwgdHlwZSB9KSA9PiB7XG4gICAgICAgICAgaWYgKHR5cGUgJiYgdHlwZS5nZXREZXJpdmVkU3RhdGVGcm9tRXJyb3IpIHtcbiAgICAgICAgICAgIHJldHVybiB0cnVlO1xuICAgICAgICAgIH1cbiAgICAgICAgICByZXR1cm4gZWxJbnN0YW5jZSAmJiBlbEluc3RhbmNlLmNvbXBvbmVudERpZENhdGNoO1xuICAgICAgICB9O1xuXG4gICAgICAgIGNvbnN0IHsgaW5zdGFuY2U6IGNhdGNoaW5nSW5zdGFuY2UsIHR5cGU6IGNhdGNoaW5nVHlwZSB9ID1cbiAgICAgICAgICBub2RlSGllcmFyY2h5LmZpbmQoaXNFcnJvckJvdW5kYXJ5KSB8fCB7fTtcblxuICAgICAgICBzaW11bGF0ZUVycm9yKFxuICAgICAgICAgIGVycm9yLFxuICAgICAgICAgIGNhdGNoaW5nSW5zdGFuY2UsXG4gICAgICAgICAgcm9vdE5vZGUsXG4gICAgICAgICAgbm9kZUhpZXJhcmNoeSxcbiAgICAgICAgICBub2RlVHlwZUZyb21UeXBlLFxuICAgICAgICAgIGFkYXB0ZXIuZGlzcGxheU5hbWVPZk5vZGUsXG4gICAgICAgICAgY2F0Y2hpbmdUeXBlLFxuICAgICAgICApO1xuICAgICAgfSxcbiAgICAgIHNpbXVsYXRlRXZlbnQobm9kZSwgZXZlbnQsIG1vY2spIHtcbiAgICAgICAgY29uc3QgbWFwcGVkRXZlbnQgPSBtYXBOYXRpdmVFdmVudE5hbWVzKGV2ZW50KTtcbiAgICAgICAgY29uc3QgZXZlbnRGbiA9IFRlc3RVdGlscy5TaW11bGF0ZVttYXBwZWRFdmVudF07XG4gICAgICAgIGlmICghZXZlbnRGbikge1xuICAgICAgICAgIHRocm93IG5ldyBUeXBlRXJyb3IoYFJlYWN0V3JhcHBlcjo6c2ltdWxhdGUoKSBldmVudCAnJHtldmVudH0nIGRvZXMgbm90IGV4aXN0YCk7XG4gICAgICAgIH1cbiAgICAgICAgd3JhcEFjdCgoKSA9PiB7XG4gICAgICAgICAgZXZlbnRGbihhZGFwdGVyLm5vZGVUb0hvc3ROb2RlKG5vZGUpLCBtb2NrKTtcbiAgICAgICAgfSk7XG4gICAgICB9LFxuICAgICAgYmF0Y2hlZFVwZGF0ZXMoZm4pIHtcbiAgICAgICAgcmV0dXJuIGZuKCk7XG4gICAgICAgIC8vIHJldHVybiBSZWFjdERPTS51bnN0YWJsZV9iYXRjaGVkVXBkYXRlcyhmbik7XG4gICAgICB9LFxuICAgICAgZ2V0V3JhcHBpbmdDb21wb25lbnRSZW5kZXJlcigpIHtcbiAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAuLi50aGlzLFxuICAgICAgICAgIC4uLmdldFdyYXBwaW5nQ29tcG9uZW50TW91bnRSZW5kZXJlcih7XG4gICAgICAgICAgICB0b1RyZWU6IChpbnN0KSA9PiB0b1RyZWUoaW5zdC5fcmVhY3RJbnRlcm5hbHMpLFxuICAgICAgICAgICAgZ2V0TW91bnRXcmFwcGVySW5zdGFuY2U6ICgpID0+IGluc3RhbmNlLFxuICAgICAgICAgIH0pLFxuICAgICAgICB9O1xuICAgICAgfSxcbiAgICAgIHdyYXBJbnZva2U6IHdyYXBBY3QsXG4gICAgfTtcbiAgfVxuXG4gIGNyZWF0ZVNoYWxsb3dSZW5kZXJlcihvcHRpb25zID0ge30pIHtcbiAgICBjb25zdCBhZGFwdGVyID0gdGhpcztcbiAgICBjb25zdCByZW5kZXJlciA9IG5ldyBTaGFsbG93UmVuZGVyZXIoKTtcbiAgICBjb25zdCB7IHN1c3BlbnNlRmFsbGJhY2sgfSA9IG9wdGlvbnM7XG4gICAgaWYgKHR5cGVvZiBzdXNwZW5zZUZhbGxiYWNrICE9PSAndW5kZWZpbmVkJyAmJiB0eXBlb2Ygc3VzcGVuc2VGYWxsYmFjayAhPT0gJ2Jvb2xlYW4nKSB7XG4gICAgICB0aHJvdyBUeXBlRXJyb3IoJ2BvcHRpb25zLnN1c3BlbnNlRmFsbGJhY2tgIHNob3VsZCBiZSBib29sZWFuIG9yIHVuZGVmaW5lZCcpO1xuICAgIH1cbiAgICBsZXQgaXNET00gPSBmYWxzZTtcbiAgICBsZXQgY2FjaGVkTm9kZSA9IG51bGw7XG5cbiAgICBsZXQgbGFzdENvbXBvbmVudCA9IG51bGw7XG4gICAgbGV0IHdyYXBwZWRDb21wb25lbnQgPSBudWxsO1xuICAgIGNvbnN0IHNlbnRpbmVsID0ge307XG5cbiAgICAvLyB3cmFwIG1lbW8gY29tcG9uZW50cyB3aXRoIGEgUHVyZUNvbXBvbmVudCwgb3IgYSBjbGFzcyBjb21wb25lbnQgd2l0aCBzQ1VcbiAgICBjb25zdCB3cmFwUHVyZUNvbXBvbmVudCA9IChDb21wb25lbnQsIGNvbXBhcmUpID0+IHtcbiAgICAgIGlmIChsYXN0Q29tcG9uZW50ICE9PSBDb21wb25lbnQpIHtcbiAgICAgICAgaWYgKGlzU3RhdGVmdWwoQ29tcG9uZW50KSkge1xuICAgICAgICAgIHdyYXBwZWRDb21wb25lbnQgPSBjbGFzcyBleHRlbmRzIENvbXBvbmVudCB7fTtcbiAgICAgICAgICBpZiAoY29tcGFyZSkge1xuICAgICAgICAgICAgd3JhcHBlZENvbXBvbmVudC5wcm90b3R5cGUuc2hvdWxkQ29tcG9uZW50VXBkYXRlID0gKG5leHRQcm9wcykgPT5cbiAgICAgICAgICAgICAgIWNvbXBhcmUodGhpcy5wcm9wcywgbmV4dFByb3BzKTtcbiAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgd3JhcHBlZENvbXBvbmVudC5wcm90b3R5cGUuaXNQdXJlUmVhY3RDb21wb25lbnQgPSB0cnVlO1xuICAgICAgICAgIH1cbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICBsZXQgbWVtb2l6ZWQgPSBzZW50aW5lbDtcbiAgICAgICAgICBsZXQgcHJldlByb3BzO1xuICAgICAgICAgIHdyYXBwZWRDb21wb25lbnQgPSBmdW5jdGlvbiB3cmFwcGVkQ29tcG9uZW50Rm4ocHJvcHMsIC4uLmFyZ3MpIHtcbiAgICAgICAgICAgIGNvbnN0IHNob3VsZFVwZGF0ZSA9XG4gICAgICAgICAgICAgIG1lbW9pemVkID09PSBzZW50aW5lbCB8fFxuICAgICAgICAgICAgICAoY29tcGFyZSA/ICFjb21wYXJlKHByZXZQcm9wcywgcHJvcHMpIDogIXNoYWxsb3dFcXVhbChwcmV2UHJvcHMsIHByb3BzKSk7XG4gICAgICAgICAgICBpZiAoc2hvdWxkVXBkYXRlKSB7XG4gICAgICAgICAgICAgIG1lbW9pemVkID0gQ29tcG9uZW50KHsgLi4uQ29tcG9uZW50LmRlZmF1bHRQcm9wcywgLi4ucHJvcHMgfSwgLi4uYXJncyk7XG4gICAgICAgICAgICAgIHByZXZQcm9wcyA9IHByb3BzO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgcmV0dXJuIG1lbW9pemVkO1xuICAgICAgICAgIH07XG4gICAgICAgIH1cbiAgICAgICAgT2JqZWN0LmFzc2lnbih3cmFwcGVkQ29tcG9uZW50LCBDb21wb25lbnQsIHtcbiAgICAgICAgICBkaXNwbGF5TmFtZTogYWRhcHRlci5kaXNwbGF5TmFtZU9mTm9kZSh7IHR5cGU6IENvbXBvbmVudCB9KSxcbiAgICAgICAgfSk7XG4gICAgICAgIGxhc3RDb21wb25lbnQgPSBDb21wb25lbnQ7XG4gICAgICB9XG4gICAgICByZXR1cm4gd3JhcHBlZENvbXBvbmVudDtcbiAgICB9O1xuXG4gICAgLy8gV3JhcCBmdW5jdGlvbmFsIGNvbXBvbmVudHMgb24gdmVyc2lvbnMgcHJpb3IgdG8gMTYuNSxcbiAgICAvLyB0byBhdm9pZCBpbmFkdmVydGVudGx5IHBhc3MgYSBgdGhpc2AgaW5zdGFuY2UgdG8gaXQuXG4gICAgY29uc3Qgd3JhcEZ1bmN0aW9uYWxDb21wb25lbnQgPSAoQ29tcG9uZW50KSA9PiB7XG4gICAgICBpZiAoaGFzKENvbXBvbmVudCwgJ2RlZmF1bHRQcm9wcycpKSB7XG4gICAgICAgIGlmIChsYXN0Q29tcG9uZW50ICE9PSBDb21wb25lbnQpIHtcbiAgICAgICAgICB3cmFwcGVkQ29tcG9uZW50ID0gT2JqZWN0LmFzc2lnbihcbiAgICAgICAgICAgIChwcm9wcywgLi4uYXJncykgPT4gQ29tcG9uZW50KHsgLi4uQ29tcG9uZW50LmRlZmF1bHRQcm9wcywgLi4ucHJvcHMgfSwgLi4uYXJncyksXG4gICAgICAgICAgICBDb21wb25lbnQsXG4gICAgICAgICAgICB7IGRpc3BsYXlOYW1lOiBhZGFwdGVyLmRpc3BsYXlOYW1lT2ZOb2RlKHsgdHlwZTogQ29tcG9uZW50IH0pIH0sXG4gICAgICAgICAgKTtcbiAgICAgICAgICBsYXN0Q29tcG9uZW50ID0gQ29tcG9uZW50O1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiB3cmFwcGVkQ29tcG9uZW50O1xuICAgICAgfVxuXG4gICAgICByZXR1cm4gQ29tcG9uZW50O1xuICAgIH07XG5cbiAgICBjb25zdCByZW5kZXJFbGVtZW50ID0gKGVsQ29uZmlnLCAuLi5yZXN0KSA9PiB7XG4gICAgICBjb25zdCByZW5kZXJlZEVsID0gcmVuZGVyZXIucmVuZGVyKGVsQ29uZmlnLCAuLi5yZXN0KTtcblxuICAgICAgY29uc3QgdHlwZUlzRXhpc3RlZCA9ICEhKHJlbmRlcmVkRWwgJiYgcmVuZGVyZWRFbC50eXBlKTtcbiAgICAgIGlmICh0eXBlSXNFeGlzdGVkKSB7XG4gICAgICAgIGNvbnN0IGNsb25lZEVsID0gY2hlY2tJc1N1c3BlbnNlQW5kQ2xvbmVFbGVtZW50KHJlbmRlcmVkRWwsIHsgc3VzcGVuc2VGYWxsYmFjayB9KTtcblxuICAgICAgICBjb25zdCBlbGVtZW50SXNDaGFuZ2VkID0gY2xvbmVkRWwudHlwZSAhPT0gcmVuZGVyZWRFbC50eXBlO1xuICAgICAgICBpZiAoZWxlbWVudElzQ2hhbmdlZCkge1xuICAgICAgICAgIHJldHVybiByZW5kZXJlci5yZW5kZXIoeyAuLi5lbENvbmZpZywgdHlwZTogY2xvbmVkRWwudHlwZSB9LCAuLi5yZXN0KTtcbiAgICAgICAgfVxuICAgICAgfVxuXG4gICAgICByZXR1cm4gcmVuZGVyZWRFbDtcbiAgICB9O1xuXG4gICAgcmV0dXJuIHtcbiAgICAgIHJlbmRlcihlbCwgdW5tYXNrZWRDb250ZXh0LCB7IHByb3ZpZGVyVmFsdWVzID0gbmV3IE1hcCgpIH0gPSB7fSkge1xuICAgICAgICBjYWNoZWROb2RlID0gZWw7XG4gICAgICAgIGlmICh0eXBlb2YgZWwudHlwZSA9PT0gJ3N0cmluZycpIHtcbiAgICAgICAgICBpc0RPTSA9IHRydWU7XG4gICAgICAgIH0gZWxzZSBpZiAoaXNDb250ZXh0UHJvdmlkZXIoZWwpKSB7XG4gICAgICAgICAgcHJvdmlkZXJWYWx1ZXMuc2V0KGVsLnR5cGUsIGVsLnByb3BzLnZhbHVlKTtcbiAgICAgICAgICBjb25zdCBNb2NrUHJvdmlkZXIgPSBPYmplY3QuYXNzaWduKChwcm9wcykgPT4gcHJvcHMuY2hpbGRyZW4sIGVsLnR5cGUpO1xuICAgICAgICAgIHJldHVybiB3aXRoU2V0U3RhdGVBbGxvd2VkKCgpID0+IHJlbmRlckVsZW1lbnQoeyAuLi5lbCwgdHlwZTogTW9ja1Byb3ZpZGVyIH0pKTtcbiAgICAgICAgfSBlbHNlIGlmIChpc0NvbnRleHRDb25zdW1lcihlbCkpIHtcbiAgICAgICAgICBjb25zdCBQcm92aWRlciA9IGFkYXB0ZXIuZ2V0UHJvdmlkZXJGcm9tQ29uc3VtZXIoZWwudHlwZSk7XG4gICAgICAgICAgY29uc3QgdmFsdWUgPSBwcm92aWRlclZhbHVlcy5oYXMoUHJvdmlkZXIpXG4gICAgICAgICAgICA/IHByb3ZpZGVyVmFsdWVzLmdldChQcm92aWRlcilcbiAgICAgICAgICAgIDogZ2V0UHJvdmlkZXJEZWZhdWx0VmFsdWUoUHJvdmlkZXIpO1xuICAgICAgICAgIGNvbnN0IE1vY2tDb25zdW1lciA9IE9iamVjdC5hc3NpZ24oKHByb3BzKSA9PiBwcm9wcy5jaGlsZHJlbih2YWx1ZSksIGVsLnR5cGUpO1xuICAgICAgICAgIHJldHVybiB3aXRoU2V0U3RhdGVBbGxvd2VkKCgpID0+IHJlbmRlckVsZW1lbnQoeyAuLi5lbCwgdHlwZTogTW9ja0NvbnN1bWVyIH0pKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICBpc0RPTSA9IGZhbHNlO1xuICAgICAgICAgIGxldCByZW5kZXJlZEVsID0gZWw7XG4gICAgICAgICAgaWYgKGlzTGF6eShyZW5kZXJlZEVsKSkge1xuICAgICAgICAgICAgdGhyb3cgVHlwZUVycm9yKCdgUmVhY3QubGF6eWAgaXMgbm90IHN1cHBvcnRlZCBieSBzaGFsbG93IHJlbmRlcmluZy4nKTtcbiAgICAgICAgICB9XG5cbiAgICAgICAgICByZW5kZXJlZEVsID0gY2hlY2tJc1N1c3BlbnNlQW5kQ2xvbmVFbGVtZW50KHJlbmRlcmVkRWwsIHsgc3VzcGVuc2VGYWxsYmFjayB9KTtcbiAgICAgICAgICBjb25zdCB7IHR5cGU6IENvbXBvbmVudCB9ID0gcmVuZGVyZWRFbDtcblxuICAgICAgICAgIGNvbnN0IGNvbnRleHQgPSBnZXRNYXNrZWRDb250ZXh0KENvbXBvbmVudC5jb250ZXh0VHlwZXMsIHVubWFza2VkQ29udGV4dCk7XG5cbiAgICAgICAgICBpZiAoaXNNZW1vKGVsLnR5cGUpKSB7XG4gICAgICAgICAgICBjb25zdCB7IHR5cGU6IElubmVyQ29tcCwgY29tcGFyZSB9ID0gZWwudHlwZTtcblxuICAgICAgICAgICAgcmV0dXJuIHdpdGhTZXRTdGF0ZUFsbG93ZWQoKCkgPT5cbiAgICAgICAgICAgICAgcmVuZGVyRWxlbWVudCh7IC4uLmVsLCB0eXBlOiB3cmFwUHVyZUNvbXBvbmVudChJbm5lckNvbXAsIGNvbXBhcmUpIH0sIGNvbnRleHQpLFxuICAgICAgICAgICAgKTtcbiAgICAgICAgICB9XG5cbiAgICAgICAgICBjb25zdCBpc0NvbXBvbmVudFN0YXRlZnVsID0gaXNTdGF0ZWZ1bChDb21wb25lbnQpO1xuXG4gICAgICAgICAgaWYgKCFpc0NvbXBvbmVudFN0YXRlZnVsICYmIHR5cGVvZiBDb21wb25lbnQgPT09ICdmdW5jdGlvbicpIHtcbiAgICAgICAgICAgIHJldHVybiB3aXRoU2V0U3RhdGVBbGxvd2VkKCgpID0+XG4gICAgICAgICAgICAgIHJlbmRlckVsZW1lbnQoeyAuLi5yZW5kZXJlZEVsLCB0eXBlOiB3cmFwRnVuY3Rpb25hbENvbXBvbmVudChDb21wb25lbnQpIH0sIGNvbnRleHQpLFxuICAgICAgICAgICAgKTtcbiAgICAgICAgICB9XG5cbiAgICAgICAgICBpZiAoaXNDb21wb25lbnRTdGF0ZWZ1bCkge1xuICAgICAgICAgICAgaWYgKFxuICAgICAgICAgICAgICByZW5kZXJlci5faW5zdGFuY2UgJiZcbiAgICAgICAgICAgICAgZWwucHJvcHMgPT09IHJlbmRlcmVyLl9pbnN0YW5jZS5wcm9wcyAmJlxuICAgICAgICAgICAgICAhc2hhbGxvd0VxdWFsKGNvbnRleHQsIHJlbmRlcmVyLl9pbnN0YW5jZS5jb250ZXh0KVxuICAgICAgICAgICAgKSB7XG4gICAgICAgICAgICAgIGNvbnN0IHsgcmVzdG9yZSB9ID0gc3B5TWV0aG9kKFxuICAgICAgICAgICAgICAgIHJlbmRlcmVyLFxuICAgICAgICAgICAgICAgICdfdXBkYXRlQ2xhc3NDb21wb25lbnQnLFxuICAgICAgICAgICAgICAgIChvcmlnaW5hbE1ldGhvZCkgPT5cbiAgICAgICAgICAgICAgICAgIGZ1bmN0aW9uIF91cGRhdGVDbGFzc0NvbXBvbmVudCguLi5hcmdzKSB7XG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IHsgcHJvcHMgfSA9IHJlbmRlcmVyLl9pbnN0YW5jZTtcbiAgICAgICAgICAgICAgICAgICAgY29uc3QgY2xvbmVkUHJvcHMgPSB7IC4uLnByb3BzIH07XG4gICAgICAgICAgICAgICAgICAgIHJlbmRlcmVyLl9pbnN0YW5jZS5wcm9wcyA9IGNsb25lZFByb3BzO1xuXG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IHJlc3VsdCA9IG9yaWdpbmFsTWV0aG9kLmFwcGx5KHJlbmRlcmVyLCBhcmdzKTtcblxuICAgICAgICAgICAgICAgICAgICByZW5kZXJlci5faW5zdGFuY2UucHJvcHMgPSBwcm9wcztcbiAgICAgICAgICAgICAgICAgICAgcmVzdG9yZSgpO1xuXG4gICAgICAgICAgICAgICAgICAgIHJldHVybiByZXN1bHQ7XG4gICAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICApO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAvLyBmaXggcmVhY3QgYnVnOyBzZWUgaW1wbGVtZW50YXRpb24gb2YgYGdldEVtcHR5U3RhdGVWYWx1ZWBcbiAgICAgICAgICAgIGNvbnN0IGVtcHR5U3RhdGVWYWx1ZSA9IGdldEVtcHR5U3RhdGVWYWx1ZSgpO1xuICAgICAgICAgICAgaWYgKGVtcHR5U3RhdGVWYWx1ZSkge1xuICAgICAgICAgICAgICBPYmplY3QuZGVmaW5lUHJvcGVydHkoQ29tcG9uZW50LnByb3RvdHlwZSwgJ3N0YXRlJywge1xuICAgICAgICAgICAgICAgIGNvbmZpZ3VyYWJsZTogdHJ1ZSxcbiAgICAgICAgICAgICAgICBlbnVtZXJhYmxlOiB0cnVlLFxuICAgICAgICAgICAgICAgIGdldCgpIHtcbiAgICAgICAgICAgICAgICAgIHJldHVybiBudWxsO1xuICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgc2V0KHZhbHVlKSB7XG4gICAgICAgICAgICAgICAgICBpZiAodmFsdWUgIT09IGVtcHR5U3RhdGVWYWx1ZSkge1xuICAgICAgICAgICAgICAgICAgICBPYmplY3QuZGVmaW5lUHJvcGVydHkodGhpcywgJ3N0YXRlJywge1xuICAgICAgICAgICAgICAgICAgICAgIGNvbmZpZ3VyYWJsZTogdHJ1ZSxcbiAgICAgICAgICAgICAgICAgICAgICBlbnVtZXJhYmxlOiB0cnVlLFxuICAgICAgICAgICAgICAgICAgICAgIHZhbHVlLFxuICAgICAgICAgICAgICAgICAgICAgIHdyaXRhYmxlOiB0cnVlLFxuICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9XG4gICAgICAgICAgcmV0dXJuIHdpdGhTZXRTdGF0ZUFsbG93ZWQoKCkgPT4gcmVuZGVyRWxlbWVudChyZW5kZXJlZEVsLCBjb250ZXh0KSk7XG4gICAgICAgIH1cbiAgICAgIH0sXG4gICAgICB1bm1vdW50KCkge1xuICAgICAgICByZW5kZXJlci51bm1vdW50KCk7XG4gICAgICB9LFxuICAgICAgZ2V0Tm9kZSgpIHtcbiAgICAgICAgaWYgKGlzRE9NKSB7XG4gICAgICAgICAgcmV0dXJuIGVsZW1lbnRUb1RyZWUoY2FjaGVkTm9kZSk7XG4gICAgICAgIH1cbiAgICAgICAgY29uc3Qgb3V0cHV0ID0gcmVuZGVyZXIuZ2V0UmVuZGVyT3V0cHV0KCk7XG4gICAgICAgIHJldHVybiB7XG4gICAgICAgICAgbm9kZVR5cGU6IG5vZGVUeXBlRnJvbVR5cGUoY2FjaGVkTm9kZS50eXBlKSxcbiAgICAgICAgICB0eXBlOiBjYWNoZWROb2RlLnR5cGUsXG4gICAgICAgICAgcHJvcHM6IGNhY2hlZE5vZGUucHJvcHMsXG4gICAgICAgICAga2V5OiBlbnN1cmVLZXlPclVuZGVmaW5lZChjYWNoZWROb2RlLmtleSksXG4gICAgICAgICAgcmVmOiBjYWNoZWROb2RlLnJlZixcbiAgICAgICAgICBpbnN0YW5jZTogcmVuZGVyZXIuX2luc3RhbmNlLFxuICAgICAgICAgIHJlbmRlcmVkOiBBcnJheS5pc0FycmF5KG91dHB1dClcbiAgICAgICAgICAgID8gZmxhdHRlbihvdXRwdXQpLm1hcCgoZWwpID0+IGVsZW1lbnRUb1RyZWUoZWwpKVxuICAgICAgICAgICAgOiBlbGVtZW50VG9UcmVlKG91dHB1dCksXG4gICAgICAgIH07XG4gICAgICB9LFxuICAgICAgc2ltdWxhdGVFcnJvcihub2RlSGllcmFyY2h5LCByb290Tm9kZSwgZXJyb3IpIHtcbiAgICAgICAgc2ltdWxhdGVFcnJvcihcbiAgICAgICAgICBlcnJvcixcbiAgICAgICAgICByZW5kZXJlci5faW5zdGFuY2UsXG4gICAgICAgICAgY2FjaGVkTm9kZSxcbiAgICAgICAgICBub2RlSGllcmFyY2h5LmNvbmNhdChjYWNoZWROb2RlKSxcbiAgICAgICAgICBub2RlVHlwZUZyb21UeXBlLFxuICAgICAgICAgIGFkYXB0ZXIuZGlzcGxheU5hbWVPZk5vZGUsXG4gICAgICAgICAgY2FjaGVkTm9kZS50eXBlLFxuICAgICAgICApO1xuICAgICAgfSxcbiAgICAgIHNpbXVsYXRlRXZlbnQobm9kZSwgZXZlbnQsIC4uLmFyZ3MpIHtcbiAgICAgICAgY29uc3QgaGFuZGxlciA9IG5vZGUucHJvcHNbcHJvcEZyb21FdmVudChldmVudCldO1xuICAgICAgICBpZiAoaGFuZGxlcikge1xuICAgICAgICAgIHdpdGhTZXRTdGF0ZUFsbG93ZWQoKCkgPT4ge1xuICAgICAgICAgICAgLy8gVE9ETyhsbXIpOiBjcmVhdGUvdXNlIHN5bnRoZXRpYyBldmVudHNcbiAgICAgICAgICAgIC8vIFRPRE8obG1yKTogZW11bGF0ZSBSZWFjdCdzIGV2ZW50IHByb3BhZ2F0aW9uXG4gICAgICAgICAgICAvLyBSZWFjdERPTS51bnN0YWJsZV9iYXRjaGVkVXBkYXRlcygoKSA9PiB7XG4gICAgICAgICAgICBoYW5kbGVyKC4uLmFyZ3MpO1xuICAgICAgICAgICAgLy8gfSk7XG4gICAgICAgICAgfSk7XG4gICAgICAgIH1cbiAgICAgIH0sXG4gICAgICBiYXRjaGVkVXBkYXRlcyhmbikge1xuICAgICAgICByZXR1cm4gZm4oKTtcbiAgICAgICAgLy8gcmV0dXJuIFJlYWN0RE9NLnVuc3RhYmxlX2JhdGNoZWRVcGRhdGVzKGZuKTtcbiAgICAgIH0sXG4gICAgICBjaGVja1Byb3BUeXBlcyh0eXBlU3BlY3MsIHZhbHVlcywgbG9jYXRpb24sIGhpZXJhcmNoeSkge1xuICAgICAgICByZXR1cm4gY2hlY2tQcm9wVHlwZXModHlwZVNwZWNzLCB2YWx1ZXMsIGxvY2F0aW9uLCBkaXNwbGF5TmFtZU9mTm9kZShjYWNoZWROb2RlKSwgKCkgPT5cbiAgICAgICAgICBnZXRDb21wb25lbnRTdGFjayhoaWVyYXJjaHkuY29uY2F0KFtjYWNoZWROb2RlXSkpLFxuICAgICAgICApO1xuICAgICAgfSxcbiAgICB9O1xuICB9XG5cbiAgY3JlYXRlU3RyaW5nUmVuZGVyZXIob3B0aW9ucykge1xuICAgIGlmIChoYXMob3B0aW9ucywgJ3N1c3BlbnNlRmFsbGJhY2snKSkge1xuICAgICAgdGhyb3cgbmV3IFR5cGVFcnJvcihcbiAgICAgICAgJ2BzdXNwZW5zZUZhbGxiYWNrYCBzaG91bGQgbm90IGJlIHNwZWNpZmllZCBpbiBvcHRpb25zIG9mIHN0cmluZyByZW5kZXJlcicsXG4gICAgICApO1xuICAgIH1cbiAgICByZXR1cm4ge1xuICAgICAgcmVuZGVyKGVsLCBjb250ZXh0KSB7XG4gICAgICAgIGlmIChvcHRpb25zLmNvbnRleHQgJiYgKGVsLnR5cGUuY29udGV4dFR5cGVzIHx8IG9wdGlvbnMuY2hpbGRDb250ZXh0VHlwZXMpKSB7XG4gICAgICAgICAgY29uc3QgY2hpbGRDb250ZXh0VHlwZXMgPSB7XG4gICAgICAgICAgICAuLi4oZWwudHlwZS5jb250ZXh0VHlwZXMgfHwge30pLFxuICAgICAgICAgICAgLi4ub3B0aW9ucy5jaGlsZENvbnRleHRUeXBlcyxcbiAgICAgICAgICB9O1xuICAgICAgICAgIGNvbnN0IENvbnRleHRXcmFwcGVyID0gY3JlYXRlUmVuZGVyV3JhcHBlcihlbCwgY29udGV4dCwgY2hpbGRDb250ZXh0VHlwZXMpO1xuICAgICAgICAgIHJldHVybiBSZWFjdERPTVNlcnZlci5yZW5kZXJUb1N0YXRpY01hcmt1cChSZWFjdC5jcmVhdGVFbGVtZW50KENvbnRleHRXcmFwcGVyKSk7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIFJlYWN0RE9NU2VydmVyLnJlbmRlclRvU3RhdGljTWFya3VwKGVsKTtcbiAgICAgIH0sXG4gICAgfTtcbiAgfVxuXG4gIC8vIFByb3ZpZGVkIGEgYmFnIG9mIG9wdGlvbnMsIHJldHVybiBhbiBgRW56eW1lUmVuZGVyZXJgLiBTb21lIG9wdGlvbnMgY2FuIGJlIGltcGxlbWVudGF0aW9uXG4gIC8vIHNwZWNpZmljLCBsaWtlIGBhdHRhY2hgIGV0Yy4gZm9yIFJlYWN0LCBidXQgbm90IHBhcnQgb2YgdGhpcyBpbnRlcmZhY2UgZXhwbGljaXRseS5cbiAgY3JlYXRlUmVuZGVyZXIob3B0aW9ucykge1xuICAgIHN3aXRjaCAob3B0aW9ucy5tb2RlKSB7XG4gICAgICBjYXNlIEVuenltZUFkYXB0ZXIuTU9ERVMuTU9VTlQ6XG4gICAgICAgIHJldHVybiB0aGlzLmNyZWF0ZU1vdW50UmVuZGVyZXIob3B0aW9ucyk7XG4gICAgICBjYXNlIEVuenltZUFkYXB0ZXIuTU9ERVMuU0hBTExPVzpcbiAgICAgICAgcmV0dXJuIHRoaXMuY3JlYXRlU2hhbGxvd1JlbmRlcmVyKG9wdGlvbnMpO1xuICAgICAgY2FzZSBFbnp5bWVBZGFwdGVyLk1PREVTLlNUUklORzpcbiAgICAgICAgcmV0dXJuIHRoaXMuY3JlYXRlU3RyaW5nUmVuZGVyZXIob3B0aW9ucyk7XG4gICAgICBkZWZhdWx0OlxuICAgICAgICB0aHJvdyBuZXcgRXJyb3IoYEVuenltZSBJbnRlcm5hbCBFcnJvcjogVW5yZWNvZ25pemVkIG1vZGU6ICR7b3B0aW9ucy5tb2RlfWApO1xuICAgIH1cbiAgfVxuXG4gIHdyYXAoZWxlbWVudCkge1xuICAgIHJldHVybiB3cmFwKGVsZW1lbnQpO1xuICB9XG5cbiAgLy8gY29udmVydHMgYW4gUlNUTm9kZSB0byB0aGUgY29ycmVzcG9uZGluZyBKU1ggUHJhZ21hIEVsZW1lbnQuIFRoaXMgd2lsbCBiZSBuZWVkZWRcbiAgLy8gaW4gb3JkZXIgdG8gaW1wbGVtZW50IHRoZSBgV3JhcHBlci5tb3VudCgpYCBhbmQgYFdyYXBwZXIuc2hhbGxvdygpYCBtZXRob2RzLCBidXQgc2hvdWxkXG4gIC8vIGJlIHByZXR0eSBzdHJhaWdodGZvcndhcmQgZm9yIHBlb3BsZSB0byBpbXBsZW1lbnQuXG4gIG5vZGVUb0VsZW1lbnQobm9kZSkge1xuICAgIGlmICghbm9kZSB8fCB0eXBlb2Ygbm9kZSAhPT0gJ29iamVjdCcpIHJldHVybiBudWxsO1xuICAgIGNvbnN0IHsgdHlwZSB9ID0gbm9kZTtcbiAgICByZXR1cm4gUmVhY3QuY3JlYXRlRWxlbWVudCh1bm1lbW9UeXBlKHR5cGUpLCBwcm9wc1dpdGhLZXlzQW5kUmVmKG5vZGUpKTtcbiAgfVxuXG4gIG1hdGNoZXNFbGVtZW50VHlwZShub2RlLCBtYXRjaGluZ1R5cGUpIHtcbiAgICBpZiAoIW5vZGUpIHtcbiAgICAgIHJldHVybiBub2RlO1xuICAgIH1cbiAgICBjb25zdCB7IHR5cGUgfSA9IG5vZGU7XG4gICAgcmV0dXJuIHVubWVtb1R5cGUodHlwZSkgPT09IHVubWVtb1R5cGUobWF0Y2hpbmdUeXBlKTtcbiAgfVxuXG4gIGVsZW1lbnRUb05vZGUoZWxlbWVudCkge1xuICAgIHJldHVybiBlbGVtZW50VG9UcmVlKGVsZW1lbnQpO1xuICB9XG5cbiAgbm9kZVRvSG9zdE5vZGUobm9kZSwgc3VwcG9ydHNBcnJheSA9IGZhbHNlKSB7XG4gICAgY29uc3Qgbm9kZXMgPSBub2RlVG9Ib3N0Tm9kZShub2RlKTtcbiAgICBpZiAoQXJyYXkuaXNBcnJheShub2RlcykgJiYgIXN1cHBvcnRzQXJyYXkpIHtcbiAgICAgIC8vIGdldCB0aGUgZmlyc3Qgbm9uLW51bGwgbm9kZVxuICAgICAgcmV0dXJuIG5vZGVzLmZpbHRlcihCb29sZWFuKVswXTtcbiAgICB9XG4gICAgcmV0dXJuIG5vZGVzO1xuICB9XG5cbiAgZGlzcGxheU5hbWVPZk5vZGUobm9kZSkge1xuICAgIGlmICghbm9kZSkgcmV0dXJuIG51bGw7XG4gICAgY29uc3QgeyB0eXBlLCAkJHR5cGVvZiB9ID0gbm9kZTtcbiAgICBjb25zdCBhZGFwdGVyID0gdGhpcztcblxuICAgIGNvbnN0IG5vZGVUeXBlID0gdHlwZSB8fCAkJHR5cGVvZjtcblxuICAgIC8vIG5ld2VyIG5vZGUgdHlwZXMgbWF5IGJlIHVuZGVmaW5lZCwgc28gb25seSB0ZXN0IGlmIHRoZSBub2RlVHlwZSBleGlzdHNcbiAgICBpZiAobm9kZVR5cGUpIHtcbiAgICAgIHN3aXRjaCAobm9kZVR5cGUpIHtcbiAgICAgICAgY2FzZSBDb25jdXJyZW50TW9kZSB8fCBOYU46XG4gICAgICAgICAgcmV0dXJuICdDb25jdXJyZW50TW9kZSc7XG4gICAgICAgIGNhc2UgRnJhZ21lbnQgfHwgTmFOOlxuICAgICAgICAgIHJldHVybiAnRnJhZ21lbnQnO1xuICAgICAgICBjYXNlIFN0cmljdE1vZGUgfHwgTmFOOlxuICAgICAgICAgIHJldHVybiAnU3RyaWN0TW9kZSc7XG4gICAgICAgIGNhc2UgUHJvZmlsZXIgfHwgTmFOOlxuICAgICAgICAgIHJldHVybiAnUHJvZmlsZXInO1xuICAgICAgICBjYXNlIFBvcnRhbCB8fCBOYU46XG4gICAgICAgICAgcmV0dXJuICdQb3J0YWwnO1xuICAgICAgICBjYXNlIFN1c3BlbnNlIHx8IE5hTjpcbiAgICAgICAgICByZXR1cm4gJ1N1c3BlbnNlJztcbiAgICAgICAgZGVmYXVsdDpcbiAgICAgIH1cbiAgICB9XG5cbiAgICBjb25zdCAkJHR5cGVvZlR5cGUgPSB0eXBlICYmIHR5cGUuJCR0eXBlb2Y7XG5cbiAgICBzd2l0Y2ggKCQkdHlwZW9mVHlwZSkge1xuICAgICAgY2FzZSBDb250ZXh0Q29uc3VtZXIgfHwgTmFOOlxuICAgICAgICByZXR1cm4gJ0NvbnRleHRDb25zdW1lcic7XG4gICAgICBjYXNlIENvbnRleHRQcm92aWRlciB8fCBOYU46XG4gICAgICAgIHJldHVybiAnQ29udGV4dFByb3ZpZGVyJztcbiAgICAgIGNhc2UgTWVtbyB8fCBOYU46IHtcbiAgICAgICAgY29uc3Qgbm9kZU5hbWUgPSBkaXNwbGF5TmFtZU9mTm9kZShub2RlKTtcbiAgICAgICAgcmV0dXJuIHR5cGVvZiBub2RlTmFtZSA9PT0gJ3N0cmluZycgPyBub2RlTmFtZSA6IGBNZW1vKCR7YWRhcHRlci5kaXNwbGF5TmFtZU9mTm9kZSh0eXBlKX0pYDtcbiAgICAgIH1cbiAgICAgIGNhc2UgRm9yd2FyZFJlZiB8fCBOYU46IHtcbiAgICAgICAgaWYgKHR5cGUuZGlzcGxheU5hbWUpIHtcbiAgICAgICAgICByZXR1cm4gdHlwZS5kaXNwbGF5TmFtZTtcbiAgICAgICAgfVxuICAgICAgICBjb25zdCBuYW1lID0gYWRhcHRlci5kaXNwbGF5TmFtZU9mTm9kZSh7IHR5cGU6IHR5cGUucmVuZGVyIH0pO1xuICAgICAgICByZXR1cm4gbmFtZSA/IGBGb3J3YXJkUmVmKCR7bmFtZX0pYCA6ICdGb3J3YXJkUmVmJztcbiAgICAgIH1cbiAgICAgIGNhc2UgTGF6eSB8fCBOYU46IHtcbiAgICAgICAgcmV0dXJuICdsYXp5JztcbiAgICAgIH1cbiAgICAgIGRlZmF1bHQ6XG4gICAgICAgIHJldHVybiBkaXNwbGF5TmFtZU9mTm9kZShub2RlKTtcbiAgICB9XG4gIH1cblxuICBpc1ZhbGlkRWxlbWVudChlbGVtZW50KSB7XG4gICAgcmV0dXJuIGlzRWxlbWVudChlbGVtZW50KTtcbiAgfVxuXG4gIGlzVmFsaWRFbGVtZW50VHlwZShvYmplY3QpIHtcbiAgICByZXR1cm4gISFvYmplY3QgJiYgaXNWYWxpZEVsZW1lbnRUeXBlKG9iamVjdCk7XG4gIH1cblxuICBpc0ZyYWdtZW50KGZyYWdtZW50KSB7XG4gICAgcmV0dXJuIHR5cGVPZk5vZGUoZnJhZ21lbnQpID09PSBGcmFnbWVudDtcbiAgfVxuXG4gIGlzQ3VzdG9tQ29tcG9uZW50KHR5cGUpIHtcbiAgICBjb25zdCBmYWtlRWxlbWVudCA9IG1ha2VGYWtlRWxlbWVudCh0eXBlKTtcbiAgICByZXR1cm4gKFxuICAgICAgISF0eXBlICYmXG4gICAgICAodHlwZW9mIHR5cGUgPT09ICdmdW5jdGlvbicgfHxcbiAgICAgICAgaXNGb3J3YXJkUmVmKGZha2VFbGVtZW50KSB8fFxuICAgICAgICBpc0NvbnRleHRQcm92aWRlcihmYWtlRWxlbWVudCkgfHxcbiAgICAgICAgaXNDb250ZXh0Q29uc3VtZXIoZmFrZUVsZW1lbnQpIHx8XG4gICAgICAgIGlzU3VzcGVuc2UoZmFrZUVsZW1lbnQpKVxuICAgICk7XG4gIH1cblxuICBpc0NvbnRleHRDb25zdW1lcih0eXBlKSB7XG4gICAgcmV0dXJuICEhdHlwZSAmJiBpc0NvbnRleHRDb25zdW1lcihtYWtlRmFrZUVsZW1lbnQodHlwZSkpO1xuICB9XG5cbiAgaXNDdXN0b21Db21wb25lbnRFbGVtZW50KGluc3QpIHtcbiAgICBpZiAoIWluc3QgfHwgIXRoaXMuaXNWYWxpZEVsZW1lbnQoaW5zdCkpIHtcbiAgICAgIHJldHVybiBmYWxzZTtcbiAgICB9XG4gICAgcmV0dXJuIHRoaXMuaXNDdXN0b21Db21wb25lbnQoaW5zdC50eXBlKTtcbiAgfVxuXG4gIGdldFByb3ZpZGVyRnJvbUNvbnN1bWVyKENvbnN1bWVyKSB7XG4gICAgLy8gUmVhY3Qgc3RvcmVzIHJlZmVyZW5jZXMgdG8gdGhlIFByb3ZpZGVyIG9uIGEgQ29uc3VtZXIgZGlmZmVyZW50bHkgYWNyb3NzIHZlcnNpb25zLlxuICAgIGlmIChDb25zdW1lcikge1xuICAgICAgbGV0IFByb3ZpZGVyO1xuICAgICAgaWYgKENvbnN1bWVyLl9jb250ZXh0KSB7XG4gICAgICAgIC8vIGNoZWNrIHRoaXMgZmlyc3QsIHRvIGF2b2lkIGEgZGVwcmVjYXRpb24gd2FybmluZ1xuICAgICAgICAoeyBQcm92aWRlciB9ID0gQ29uc3VtZXIuX2NvbnRleHQpO1xuICAgICAgfSBlbHNlIGlmIChDb25zdW1lci5Qcm92aWRlcikge1xuICAgICAgICAoeyBQcm92aWRlciB9ID0gQ29uc3VtZXIpO1xuICAgICAgfVxuICAgICAgaWYgKFByb3ZpZGVyKSB7XG4gICAgICAgIHJldHVybiBQcm92aWRlcjtcbiAgICAgIH1cbiAgICB9XG4gICAgdGhyb3cgbmV3IEVycm9yKCdFbnp5bWUgSW50ZXJuYWwgRXJyb3I6IGNhbuKAmXQgZmlndXJlIG91dCBob3cgdG8gZ2V0IFByb3ZpZGVyIGZyb20gQ29uc3VtZXInKTtcbiAgfVxuXG4gIGNyZWF0ZUVsZW1lbnQoLi4uYXJncykge1xuICAgIHJldHVybiBSZWFjdC5jcmVhdGVFbGVtZW50KC4uLmFyZ3MpO1xuICB9XG5cbiAgd3JhcFdpdGhXcmFwcGluZ0NvbXBvbmVudChub2RlLCBvcHRpb25zKSB7XG4gICAgcmV0dXJuIHtcbiAgICAgIFJvb3RGaW5kZXIsXG4gICAgICBub2RlOiB3cmFwV2l0aFdyYXBwaW5nQ29tcG9uZW50KFJlYWN0LmNyZWF0ZUVsZW1lbnQsIG5vZGUsIG9wdGlvbnMpLFxuICAgIH07XG4gIH1cbn1cblxubW9kdWxlLmV4cG9ydHMgPSBSZWFjdFNldmVudGVlbkFkYXB0ZXI7XG4iXX0=
//# sourceMappingURL=ReactSeventeenAdapter.js.map