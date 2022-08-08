"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
Object.defineProperty(exports, "RootFinder", {
  enumerable: true,
  get: function get() {
    return _RootFinder["default"];
  }
});
exports.assertDomAvailable = assertDomAvailable;
exports.compareNodeTypeOf = compareNodeTypeOf;
Object.defineProperty(exports, "createMountWrapper", {
  enumerable: true,
  get: function get() {
    return _createMountWrapper["default"];
  }
});
Object.defineProperty(exports, "createRenderWrapper", {
  enumerable: true,
  get: function get() {
    return _createRenderWrapper["default"];
  }
});
exports.displayNameOfNode = displayNameOfNode;
exports.elementToTree = elementToTree;
exports.ensureKeyOrUndefined = ensureKeyOrUndefined;
exports.fakeDynamicImport = fakeDynamicImport;
exports.findElement = findElement;
exports.flatten = flatten;
exports.getComponentStack = getComponentStack;
exports.getMaskedContext = getMaskedContext;
exports.getNodeFromRootFinder = getNodeFromRootFinder;
exports.getWrappingComponentMountRenderer = getWrappingComponentMountRenderer;
exports.isArrayLike = isArrayLike;
exports.mapNativeEventNames = mapNativeEventNames;
exports.nodeTypeFromType = nodeTypeFromType;
exports.propFromEvent = propFromEvent;
exports.propsWithKeysAndRef = propsWithKeysAndRef;
exports.simulateError = simulateError;
exports.spyMethod = spyMethod;
exports.spyProperty = spyProperty;
exports.withSetStateAllowed = withSetStateAllowed;
Object.defineProperty(exports, "wrap", {
  enumerable: true,
  get: function get() {
    return _wrapWithSimpleWrapper["default"];
  }
});
exports.wrapWithWrappingComponent = wrapWithWrappingComponent;

var _functionPrototype = _interopRequireDefault(require("function.prototype.name"));

var _object = _interopRequireDefault(require("object.fromentries"));

var _has = _interopRequireDefault(require("has"));

var _createMountWrapper = _interopRequireDefault(require("./createMountWrapper"));

var _createRenderWrapper = _interopRequireDefault(require("./createRenderWrapper"));

var _wrapWithSimpleWrapper = _interopRequireDefault(require("./wrapWithSimpleWrapper"));

var _RootFinder = _interopRequireDefault(require("./RootFinder"));

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { "default": obj }; }

function _slicedToArray(arr, i) { return _arrayWithHoles(arr) || _iterableToArrayLimit(arr, i) || _unsupportedIterableToArray(arr, i) || _nonIterableRest(); }

function _nonIterableRest() { throw new TypeError("Invalid attempt to destructure non-iterable instance.\nIn order to be iterable, non-array objects must have a [Symbol.iterator]() method."); }

function _unsupportedIterableToArray(o, minLen) { if (!o) return; if (typeof o === "string") return _arrayLikeToArray(o, minLen); var n = Object.prototype.toString.call(o).slice(8, -1); if (n === "Object" && o.constructor) n = o.constructor.name; if (n === "Map" || n === "Set") return Array.from(o); if (n === "Arguments" || /^(?:Ui|I)nt(?:8|16|32)(?:Clamped)?Array$/.test(n)) return _arrayLikeToArray(o, minLen); }

function _arrayLikeToArray(arr, len) { if (len == null || len > arr.length) len = arr.length; for (var i = 0, arr2 = new Array(len); i < len; i++) { arr2[i] = arr[i]; } return arr2; }

function _iterableToArrayLimit(arr, i) { var _i = arr == null ? null : typeof Symbol !== "undefined" && arr[Symbol.iterator] || arr["@@iterator"]; if (_i == null) return; var _arr = []; var _n = true; var _d = false; var _s, _e; try { for (_i = _i.call(arr); !(_n = (_s = _i.next()).done); _n = true) { _arr.push(_s.value); if (i && _arr.length === i) break; } } catch (err) { _d = true; _e = err; } finally { try { if (!_n && _i["return"] != null) _i["return"](); } finally { if (_d) throw _e; } } return _arr; }

function _arrayWithHoles(arr) { if (Array.isArray(arr)) return arr; }

function ownKeys(object, enumerableOnly) { var keys = Object.keys(object); if (Object.getOwnPropertySymbols) { var symbols = Object.getOwnPropertySymbols(object); enumerableOnly && (symbols = symbols.filter(function (sym) { return Object.getOwnPropertyDescriptor(object, sym).enumerable; })), keys.push.apply(keys, symbols); } return keys; }

function _objectSpread(target) { for (var i = 1; i < arguments.length; i++) { var source = null != arguments[i] ? arguments[i] : {}; i % 2 ? ownKeys(Object(source), !0).forEach(function (key) { _defineProperty(target, key, source[key]); }) : Object.getOwnPropertyDescriptors ? Object.defineProperties(target, Object.getOwnPropertyDescriptors(source)) : ownKeys(Object(source)).forEach(function (key) { Object.defineProperty(target, key, Object.getOwnPropertyDescriptor(source, key)); }); } return target; }

function _defineProperty(obj, key, value) { if (key in obj) { Object.defineProperty(obj, key, { value: value, enumerable: true, configurable: true, writable: true }); } else { obj[key] = value; } return obj; }

function _typeof(obj) { "@babel/helpers - typeof"; return _typeof = "function" == typeof Symbol && "symbol" == typeof Symbol.iterator ? function (obj) { return typeof obj; } : function (obj) { return obj && "function" == typeof Symbol && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj; }, _typeof(obj); }

function mapNativeEventNames(event) {
  var nativeToReactEventMap = {
    compositionend: 'compositionEnd',
    compositionstart: 'compositionStart',
    compositionupdate: 'compositionUpdate',
    keydown: 'keyDown',
    keyup: 'keyUp',
    keypress: 'keyPress',
    contextmenu: 'contextMenu',
    dblclick: 'doubleClick',
    doubleclick: 'doubleClick',
    // kept for legacy. TODO: remove with next major.
    dragend: 'dragEnd',
    dragenter: 'dragEnter',
    dragexist: 'dragExit',
    dragleave: 'dragLeave',
    dragover: 'dragOver',
    dragstart: 'dragStart',
    mousedown: 'mouseDown',
    mousemove: 'mouseMove',
    mouseout: 'mouseOut',
    mouseover: 'mouseOver',
    mouseup: 'mouseUp',
    touchcancel: 'touchCancel',
    touchend: 'touchEnd',
    touchmove: 'touchMove',
    touchstart: 'touchStart',
    canplay: 'canPlay',
    canplaythrough: 'canPlayThrough',
    durationchange: 'durationChange',
    loadeddata: 'loadedData',
    loadedmetadata: 'loadedMetadata',
    loadstart: 'loadStart',
    ratechange: 'rateChange',
    timeupdate: 'timeUpdate',
    volumechange: 'volumeChange',
    beforeinput: 'beforeInput',
    mouseenter: 'mouseEnter',
    mouseleave: 'mouseLeave',
    transitionend: 'transitionEnd',
    animationstart: 'animationStart',
    animationiteration: 'animationIteration',
    animationend: 'animationEnd',
    pointerdown: 'pointerDown',
    pointermove: 'pointerMove',
    pointerup: 'pointerUp',
    pointercancel: 'pointerCancel',
    gotpointercapture: 'gotPointerCapture',
    lostpointercapture: 'lostPointerCapture',
    pointerenter: 'pointerEnter',
    pointerleave: 'pointerLeave',
    pointerover: 'pointerOver',
    pointerout: 'pointerOut',
    auxclick: 'auxClick'
  };
  return nativeToReactEventMap[event] || event;
} // 'click' => 'onClick'
// 'mouseEnter' => 'onMouseEnter'


function propFromEvent(event) {
  var nativeEvent = mapNativeEventNames(event);
  return "on".concat(nativeEvent[0].toUpperCase()).concat(nativeEvent.slice(1));
}

function withSetStateAllowed(fn) {
  // NOTE(lmr):
  // this is currently here to circumvent a React bug where `setState()` is
  // not allowed without global being defined.
  var cleanup = false;

  if (typeof global.document === 'undefined') {
    cleanup = true;
    global.document = {};
  }

  var result = fn();

  if (cleanup) {
    // This works around a bug in node/jest in that developers aren't able to
    // delete things from global when running in a node vm.
    global.document = undefined;
    delete global.document;
  }

  return result;
}

function assertDomAvailable(feature) {
  if (!global || !global.document || !global.document.createElement) {
    throw new Error("Enzyme's ".concat(feature, " expects a DOM environment to be loaded, but found none"));
  }
}

function displayNameOfNode(node) {
  if (!node) return null;
  var type = node.type;
  if (!type) return null;
  return type.displayName || (typeof type === 'function' ? (0, _functionPrototype["default"])(type) : type.name || type);
}

function nodeTypeFromType(type) {
  if (typeof type === 'string') {
    return 'host';
  }

  if (type && type.prototype && type.prototype.isReactComponent) {
    return 'class';
  }

  return 'function';
}

function getIteratorFn(obj) {
  var iteratorFn = obj && (typeof Symbol === 'function' && _typeof(Symbol.iterator) === 'symbol' && obj[Symbol.iterator] || obj['@@iterator']);

  if (typeof iteratorFn === 'function') {
    return iteratorFn;
  }

  return undefined;
}

function isIterable(obj) {
  return !!getIteratorFn(obj);
}

function isArrayLike(obj) {
  return Array.isArray(obj) || typeof obj !== 'string' && isIterable(obj);
}

function flatten(arrs) {
  // optimize for the most common case
  if (Array.isArray(arrs)) {
    return arrs.reduce(function (flatArrs, item) {
      return flatArrs.concat(isArrayLike(item) ? flatten(item) : item);
    }, []);
  } // fallback for arbitrary iterable children


  var flatArrs = [];
  var iteratorFn = getIteratorFn(arrs);
  var iterator = iteratorFn.call(arrs);
  var step = iterator.next();

  while (!step.done) {
    var item = step.value;
    var flatItem = void 0;

    if (isArrayLike(item)) {
      flatItem = flatten(item);
    } else {
      flatItem = item;
    }

    flatArrs = flatArrs.concat(flatItem);
    step = iterator.next();
  }

  return flatArrs;
}

function ensureKeyOrUndefined(key) {
  return key || (key === '' ? '' : undefined);
}

function elementToTree(el) {
  var recurse = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : elementToTree;

  if (typeof recurse !== 'function' && arguments.length === 3) {
    // special case for backwards compat for `.map(elementToTree)`
    recurse = elementToTree;
  }

  if (el === null || _typeof(el) !== 'object' || !('type' in el)) {
    return el;
  }

  var type = el.type,
      props = el.props,
      key = el.key,
      ref = el.ref;
  var children = props.children;
  var rendered = null;

  if (isArrayLike(children)) {
    rendered = flatten(children).map(function (x) {
      return recurse(x);
    });
  } else if (typeof children !== 'undefined') {
    rendered = recurse(children);
  }

  var nodeType = nodeTypeFromType(type);

  if (nodeType === 'host' && props.dangerouslySetInnerHTML) {
    if (props.children != null) {
      var error = new Error('Can only set one of `children` or `props.dangerouslySetInnerHTML`.');
      error.name = 'Invariant Violation';
      throw error;
    }
  }

  return {
    nodeType: nodeType,
    type: type,
    props: props,
    key: ensureKeyOrUndefined(key),
    ref: ref,
    instance: null,
    rendered: rendered
  };
}

function mapFind(arraylike, mapper, finder) {
  var found;
  var isFound = Array.prototype.find.call(arraylike, function (item) {
    found = mapper(item);
    return finder(found);
  });
  return isFound ? found : undefined;
}

function findElement(el, predicate) {
  if (el === null || _typeof(el) !== 'object' || !('type' in el)) {
    return undefined;
  }

  if (predicate(el)) {
    return el;
  }

  var rendered = el.rendered;

  if (isArrayLike(rendered)) {
    return mapFind(rendered, function (x) {
      return findElement(x, predicate);
    }, function (x) {
      return typeof x !== 'undefined';
    });
  }

  return findElement(rendered, predicate);
}

function propsWithKeysAndRef(node) {
  if (node.ref !== null || node.key !== null) {
    return _objectSpread(_objectSpread({}, node.props), {}, {
      key: node.key,
      ref: node.ref
    });
  }

  return node.props;
}

function getComponentStack(hierarchy) {
  var getNodeType = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : nodeTypeFromType;
  var getDisplayName = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : displayNameOfNode;
  var tuples = hierarchy.filter(function (node) {
    return node.type !== _RootFinder["default"];
  }).map(function (x) {
    return [getNodeType(x.type), getDisplayName(x)];
  }).concat([['class', 'WrapperComponent']]);
  return tuples.map(function (_ref, i, arr) {
    var _ref2 = _slicedToArray(_ref, 2),
        name = _ref2[1];

    var _ref3 = arr.slice(i + 1).find(function (_ref5) {
      var _ref6 = _slicedToArray(_ref5, 1),
          nodeType = _ref6[0];

      return nodeType !== 'host';
    }) || [],
        _ref4 = _slicedToArray(_ref3, 2),
        closestComponent = _ref4[1];

    return "\n    in ".concat(name).concat(closestComponent ? " (created by ".concat(closestComponent, ")") : '');
  }).join('');
}

function simulateError(error, catchingInstance, rootNode, // TODO: remove `rootNode` next semver-major
hierarchy) {
  var getNodeType = arguments.length > 4 && arguments[4] !== undefined ? arguments[4] : nodeTypeFromType;
  var getDisplayName = arguments.length > 5 && arguments[5] !== undefined ? arguments[5] : displayNameOfNode;
  var catchingType = arguments.length > 6 && arguments[6] !== undefined ? arguments[6] : {};
  var instance = catchingInstance || {};
  var componentDidCatch = instance.componentDidCatch;
  var getDerivedStateFromError = catchingType.getDerivedStateFromError;

  if (!componentDidCatch && !getDerivedStateFromError) {
    throw error;
  }

  if (getDerivedStateFromError) {
    var stateUpdate = getDerivedStateFromError.call(catchingType, error);
    instance.setState(stateUpdate);
  }

  if (componentDidCatch) {
    var componentStack = getComponentStack(hierarchy, getNodeType, getDisplayName);
    componentDidCatch.call(instance, error, {
      componentStack: componentStack
    });
  }
}

function getMaskedContext(contextTypes, unmaskedContext) {
  if (!contextTypes || !unmaskedContext) {
    return {};
  }

  return (0, _object["default"])(Object.keys(contextTypes).map(function (key) {
    return [key, unmaskedContext[key]];
  }));
}

function getNodeFromRootFinder(isCustomComponent, tree, options) {
  if (!isCustomComponent(options.wrappingComponent)) {
    return tree.rendered;
  }

  var rootFinder = findElement(tree, function (node) {
    return node.type === _RootFinder["default"];
  });

  if (!rootFinder) {
    throw new Error('`wrappingComponent` must render its children!');
  }

  return rootFinder.rendered;
}

function wrapWithWrappingComponent(createElement, node, options) {
  var wrappingComponent = options.wrappingComponent,
      wrappingComponentProps = options.wrappingComponentProps;

  if (!wrappingComponent) {
    return node;
  }

  return createElement(wrappingComponent, wrappingComponentProps, createElement(_RootFinder["default"], null, node));
}

function getWrappingComponentMountRenderer(_ref7) {
  var toTree = _ref7.toTree,
      getMountWrapperInstance = _ref7.getMountWrapperInstance;
  return {
    getNode: function getNode() {
      var instance = getMountWrapperInstance();
      return instance ? toTree(instance).rendered : null;
    },
    render: function render(el, context, callback) {
      var instance = getMountWrapperInstance();

      if (!instance) {
        throw new Error('The wrapping component may not be updated if the root is unmounted.');
      }

      return instance.setWrappingComponentProps(el.props, callback);
    }
  };
}

function fakeDynamicImport(moduleToImport) {
  return Promise.resolve({
    "default": moduleToImport
  });
}

function compareNodeTypeOf(node, matchingTypeOf) {
  if (!node) {
    return false;
  }

  return node.$$typeof === matchingTypeOf;
} // TODO: when enzyme v3.12.0 is required, delete this


function spyMethod(instance, methodName) {
  var getStub = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : function () {};
  var lastReturnValue;
  var originalMethod = instance[methodName];
  var hasOwn = (0, _has["default"])(instance, methodName);
  var descriptor;

  if (hasOwn) {
    descriptor = Object.getOwnPropertyDescriptor(instance, methodName);
  }

  Object.defineProperty(instance, methodName, {
    configurable: true,
    enumerable: !descriptor || !!descriptor.enumerable,
    value: getStub(originalMethod) || function spied() {
      for (var _len = arguments.length, args = new Array(_len), _key = 0; _key < _len; _key++) {
        args[_key] = arguments[_key];
      }

      var result = originalMethod.apply(this, args);
      lastReturnValue = result;
      return result;
    }
  });
  return {
    restore: function restore() {
      if (hasOwn) {
        if (descriptor) {
          Object.defineProperty(instance, methodName, descriptor);
        } else {
          instance[methodName] = originalMethod;
        }
      } else {
        delete instance[methodName];
      }
    },
    getLastReturnValue: function getLastReturnValue() {
      return lastReturnValue;
    }
  };
} // TODO: when enzyme v3.12.0 is required, delete this


function spyProperty(instance, propertyName) {
  var handlers = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : {};
  var originalValue = instance[propertyName];
  var hasOwn = (0, _has["default"])(instance, propertyName);
  var descriptor;

  if (hasOwn) {
    descriptor = Object.getOwnPropertyDescriptor(instance, propertyName);
  }

  var _wasAssigned = false;
  var holder = originalValue;
  var getV = handlers.get ? function () {
    var value = descriptor && descriptor.get ? descriptor.get.call(instance) : holder;
    return handlers.get.call(instance, value);
  } : function () {
    return holder;
  };
  var set = handlers.set ? function (newValue) {
    _wasAssigned = true;
    var handlerNewValue = handlers.set.call(instance, holder, newValue);
    holder = handlerNewValue;

    if (descriptor && descriptor.set) {
      descriptor.set.call(instance, holder);
    }
  } : function (v) {
    _wasAssigned = true;
    holder = v;
  };
  Object.defineProperty(instance, propertyName, {
    configurable: true,
    enumerable: !descriptor || !!descriptor.enumerable,
    get: getV,
    set: set
  });
  return {
    restore: function restore() {
      if (hasOwn) {
        if (descriptor) {
          Object.defineProperty(instance, propertyName, descriptor);
        } else {
          instance[propertyName] = holder;
        }
      } else {
        delete instance[propertyName];
      }
    },
    wasAssigned: function wasAssigned() {
      return _wasAssigned;
    }
  };
}
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uL3NyYy9VdGlscy5qcyJdLCJuYW1lcyI6WyJtYXBOYXRpdmVFdmVudE5hbWVzIiwiZXZlbnQiLCJuYXRpdmVUb1JlYWN0RXZlbnRNYXAiLCJjb21wb3NpdGlvbmVuZCIsImNvbXBvc2l0aW9uc3RhcnQiLCJjb21wb3NpdGlvbnVwZGF0ZSIsImtleWRvd24iLCJrZXl1cCIsImtleXByZXNzIiwiY29udGV4dG1lbnUiLCJkYmxjbGljayIsImRvdWJsZWNsaWNrIiwiZHJhZ2VuZCIsImRyYWdlbnRlciIsImRyYWdleGlzdCIsImRyYWdsZWF2ZSIsImRyYWdvdmVyIiwiZHJhZ3N0YXJ0IiwibW91c2Vkb3duIiwibW91c2Vtb3ZlIiwibW91c2VvdXQiLCJtb3VzZW92ZXIiLCJtb3VzZXVwIiwidG91Y2hjYW5jZWwiLCJ0b3VjaGVuZCIsInRvdWNobW92ZSIsInRvdWNoc3RhcnQiLCJjYW5wbGF5IiwiY2FucGxheXRocm91Z2giLCJkdXJhdGlvbmNoYW5nZSIsImxvYWRlZGRhdGEiLCJsb2FkZWRtZXRhZGF0YSIsImxvYWRzdGFydCIsInJhdGVjaGFuZ2UiLCJ0aW1ldXBkYXRlIiwidm9sdW1lY2hhbmdlIiwiYmVmb3JlaW5wdXQiLCJtb3VzZWVudGVyIiwibW91c2VsZWF2ZSIsInRyYW5zaXRpb25lbmQiLCJhbmltYXRpb25zdGFydCIsImFuaW1hdGlvbml0ZXJhdGlvbiIsImFuaW1hdGlvbmVuZCIsInBvaW50ZXJkb3duIiwicG9pbnRlcm1vdmUiLCJwb2ludGVydXAiLCJwb2ludGVyY2FuY2VsIiwiZ290cG9pbnRlcmNhcHR1cmUiLCJsb3N0cG9pbnRlcmNhcHR1cmUiLCJwb2ludGVyZW50ZXIiLCJwb2ludGVybGVhdmUiLCJwb2ludGVyb3ZlciIsInBvaW50ZXJvdXQiLCJhdXhjbGljayIsInByb3BGcm9tRXZlbnQiLCJuYXRpdmVFdmVudCIsInRvVXBwZXJDYXNlIiwic2xpY2UiLCJ3aXRoU2V0U3RhdGVBbGxvd2VkIiwiZm4iLCJjbGVhbnVwIiwiZ2xvYmFsIiwiZG9jdW1lbnQiLCJyZXN1bHQiLCJ1bmRlZmluZWQiLCJhc3NlcnREb21BdmFpbGFibGUiLCJmZWF0dXJlIiwiY3JlYXRlRWxlbWVudCIsIkVycm9yIiwiZGlzcGxheU5hbWVPZk5vZGUiLCJub2RlIiwidHlwZSIsImRpc3BsYXlOYW1lIiwibmFtZSIsIm5vZGVUeXBlRnJvbVR5cGUiLCJwcm90b3R5cGUiLCJpc1JlYWN0Q29tcG9uZW50IiwiZ2V0SXRlcmF0b3JGbiIsIm9iaiIsIml0ZXJhdG9yRm4iLCJTeW1ib2wiLCJpdGVyYXRvciIsImlzSXRlcmFibGUiLCJpc0FycmF5TGlrZSIsIkFycmF5IiwiaXNBcnJheSIsImZsYXR0ZW4iLCJhcnJzIiwicmVkdWNlIiwiZmxhdEFycnMiLCJpdGVtIiwiY29uY2F0IiwiY2FsbCIsInN0ZXAiLCJuZXh0IiwiZG9uZSIsInZhbHVlIiwiZmxhdEl0ZW0iLCJlbnN1cmVLZXlPclVuZGVmaW5lZCIsImtleSIsImVsZW1lbnRUb1RyZWUiLCJlbCIsInJlY3Vyc2UiLCJhcmd1bWVudHMiLCJsZW5ndGgiLCJwcm9wcyIsInJlZiIsImNoaWxkcmVuIiwicmVuZGVyZWQiLCJtYXAiLCJ4Iiwibm9kZVR5cGUiLCJkYW5nZXJvdXNseVNldElubmVySFRNTCIsImVycm9yIiwiaW5zdGFuY2UiLCJtYXBGaW5kIiwiYXJyYXlsaWtlIiwibWFwcGVyIiwiZmluZGVyIiwiZm91bmQiLCJpc0ZvdW5kIiwiZmluZCIsImZpbmRFbGVtZW50IiwicHJlZGljYXRlIiwicHJvcHNXaXRoS2V5c0FuZFJlZiIsImdldENvbXBvbmVudFN0YWNrIiwiaGllcmFyY2h5IiwiZ2V0Tm9kZVR5cGUiLCJnZXREaXNwbGF5TmFtZSIsInR1cGxlcyIsImZpbHRlciIsIlJvb3RGaW5kZXIiLCJpIiwiYXJyIiwiY2xvc2VzdENvbXBvbmVudCIsImpvaW4iLCJzaW11bGF0ZUVycm9yIiwiY2F0Y2hpbmdJbnN0YW5jZSIsInJvb3ROb2RlIiwiY2F0Y2hpbmdUeXBlIiwiY29tcG9uZW50RGlkQ2F0Y2giLCJnZXREZXJpdmVkU3RhdGVGcm9tRXJyb3IiLCJzdGF0ZVVwZGF0ZSIsInNldFN0YXRlIiwiY29tcG9uZW50U3RhY2siLCJnZXRNYXNrZWRDb250ZXh0IiwiY29udGV4dFR5cGVzIiwidW5tYXNrZWRDb250ZXh0IiwiT2JqZWN0Iiwia2V5cyIsImdldE5vZGVGcm9tUm9vdEZpbmRlciIsImlzQ3VzdG9tQ29tcG9uZW50IiwidHJlZSIsIm9wdGlvbnMiLCJ3cmFwcGluZ0NvbXBvbmVudCIsInJvb3RGaW5kZXIiLCJ3cmFwV2l0aFdyYXBwaW5nQ29tcG9uZW50Iiwid3JhcHBpbmdDb21wb25lbnRQcm9wcyIsImdldFdyYXBwaW5nQ29tcG9uZW50TW91bnRSZW5kZXJlciIsInRvVHJlZSIsImdldE1vdW50V3JhcHBlckluc3RhbmNlIiwiZ2V0Tm9kZSIsInJlbmRlciIsImNvbnRleHQiLCJjYWxsYmFjayIsInNldFdyYXBwaW5nQ29tcG9uZW50UHJvcHMiLCJmYWtlRHluYW1pY0ltcG9ydCIsIm1vZHVsZVRvSW1wb3J0IiwiUHJvbWlzZSIsInJlc29sdmUiLCJjb21wYXJlTm9kZVR5cGVPZiIsIm1hdGNoaW5nVHlwZU9mIiwiJCR0eXBlb2YiLCJzcHlNZXRob2QiLCJtZXRob2ROYW1lIiwiZ2V0U3R1YiIsImxhc3RSZXR1cm5WYWx1ZSIsIm9yaWdpbmFsTWV0aG9kIiwiaGFzT3duIiwiZGVzY3JpcHRvciIsImdldE93blByb3BlcnR5RGVzY3JpcHRvciIsImRlZmluZVByb3BlcnR5IiwiY29uZmlndXJhYmxlIiwiZW51bWVyYWJsZSIsInNwaWVkIiwiYXJncyIsImFwcGx5IiwicmVzdG9yZSIsImdldExhc3RSZXR1cm5WYWx1ZSIsInNweVByb3BlcnR5IiwicHJvcGVydHlOYW1lIiwiaGFuZGxlcnMiLCJvcmlnaW5hbFZhbHVlIiwid2FzQXNzaWduZWQiLCJob2xkZXIiLCJnZXRWIiwiZ2V0Iiwic2V0IiwibmV3VmFsdWUiLCJoYW5kbGVyTmV3VmFsdWUiLCJ2Il0sIm1hcHBpbmdzIjoiOzs7Ozs7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QyxFQUE4Q1gsVUFBOUM7QUFDRCxTQUZELE1BRU87QUFDTGpFLFVBQUFBLFFBQVEsQ0FBQzRFLFlBQUQsQ0FBUixHQUF5QkksTUFBekI7QUFDRDtBQUNGLE9BTkQsTUFNTztBQUNMLGVBQU9oRixRQUFRLENBQUM0RSxZQUFELENBQWY7QUFDRDtBQUNGLEtBWEk7QUFZTEcsSUFBQUEsV0FaSyx5QkFZUztBQUNaLGFBQU9BLFlBQVA7QUFDRDtBQWRJLEdBQVA7QUFnQkQiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgZnVuY3Rpb25OYW1lIGZyb20gJ2Z1bmN0aW9uLnByb3RvdHlwZS5uYW1lJztcbmltcG9ydCBmcm9tRW50cmllcyBmcm9tICdvYmplY3QuZnJvbWVudHJpZXMnO1xuaW1wb3J0IGhhcyBmcm9tICdoYXMnO1xuaW1wb3J0IGNyZWF0ZU1vdW50V3JhcHBlciBmcm9tICcuL2NyZWF0ZU1vdW50V3JhcHBlcic7XG5pbXBvcnQgY3JlYXRlUmVuZGVyV3JhcHBlciBmcm9tICcuL2NyZWF0ZVJlbmRlcldyYXBwZXInO1xuaW1wb3J0IHdyYXAgZnJvbSAnLi93cmFwV2l0aFNpbXBsZVdyYXBwZXInO1xuaW1wb3J0IFJvb3RGaW5kZXIgZnJvbSAnLi9Sb290RmluZGVyJztcblxuZXhwb3J0IHsgY3JlYXRlTW91bnRXcmFwcGVyLCBjcmVhdGVSZW5kZXJXcmFwcGVyLCB3cmFwLCBSb290RmluZGVyIH07XG5cbmV4cG9ydCBmdW5jdGlvbiBtYXBOYXRpdmVFdmVudE5hbWVzKGV2ZW50KSB7XG4gIGNvbnN0IG5hdGl2ZVRvUmVhY3RFdmVudE1hcCA9IHtcbiAgICBjb21wb3NpdGlvbmVuZDogJ2NvbXBvc2l0aW9uRW5kJyxcbiAgICBjb21wb3NpdGlvbnN0YXJ0OiAnY29tcG9zaXRpb25TdGFydCcsXG4gICAgY29tcG9zaXRpb251cGRhdGU6ICdjb21wb3NpdGlvblVwZGF0ZScsXG4gICAga2V5ZG93bjogJ2tleURvd24nLFxuICAgIGtleXVwOiAna2V5VXAnLFxuICAgIGtleXByZXNzOiAna2V5UHJlc3MnLFxuICAgIGNvbnRleHRtZW51OiAnY29udGV4dE1lbnUnLFxuICAgIGRibGNsaWNrOiAnZG91YmxlQ2xpY2snLFxuICAgIGRvdWJsZWNsaWNrOiAnZG91YmxlQ2xpY2snLCAvLyBrZXB0IGZvciBsZWdhY3kuIFRPRE86IHJlbW92ZSB3aXRoIG5leHQgbWFqb3IuXG4gICAgZHJhZ2VuZDogJ2RyYWdFbmQnLFxuICAgIGRyYWdlbnRlcjogJ2RyYWdFbnRlcicsXG4gICAgZHJhZ2V4aXN0OiAnZHJhZ0V4aXQnLFxuICAgIGRyYWdsZWF2ZTogJ2RyYWdMZWF2ZScsXG4gICAgZHJhZ292ZXI6ICdkcmFnT3ZlcicsXG4gICAgZHJhZ3N0YXJ0OiAnZHJhZ1N0YXJ0JyxcbiAgICBtb3VzZWRvd246ICdtb3VzZURvd24nLFxuICAgIG1vdXNlbW92ZTogJ21vdXNlTW92ZScsXG4gICAgbW91c2VvdXQ6ICdtb3VzZU91dCcsXG4gICAgbW91c2VvdmVyOiAnbW91c2VPdmVyJyxcbiAgICBtb3VzZXVwOiAnbW91c2VVcCcsXG4gICAgdG91Y2hjYW5jZWw6ICd0b3VjaENhbmNlbCcsXG4gICAgdG91Y2hlbmQ6ICd0b3VjaEVuZCcsXG4gICAgdG91Y2htb3ZlOiAndG91Y2hNb3ZlJyxcbiAgICB0b3VjaHN0YXJ0OiAndG91Y2hTdGFydCcsXG4gICAgY2FucGxheTogJ2NhblBsYXknLFxuICAgIGNhbnBsYXl0aHJvdWdoOiAnY2FuUGxheVRocm91Z2gnLFxuICAgIGR1cmF0aW9uY2hhbmdlOiAnZHVyYXRpb25DaGFuZ2UnLFxuICAgIGxvYWRlZGRhdGE6ICdsb2FkZWREYXRhJyxcbiAgICBsb2FkZWRtZXRhZGF0YTogJ2xvYWRlZE1ldGFkYXRhJyxcbiAgICBsb2Fkc3RhcnQ6ICdsb2FkU3RhcnQnLFxuICAgIHJhdGVjaGFuZ2U6ICdyYXRlQ2hhbmdlJyxcbiAgICB0aW1ldXBkYXRlOiAndGltZVVwZGF0ZScsXG4gICAgdm9sdW1lY2hhbmdlOiAndm9sdW1lQ2hhbmdlJyxcbiAgICBiZWZvcmVpbnB1dDogJ2JlZm9yZUlucHV0JyxcbiAgICBtb3VzZWVudGVyOiAnbW91c2VFbnRlcicsXG4gICAgbW91c2VsZWF2ZTogJ21vdXNlTGVhdmUnLFxuICAgIHRyYW5zaXRpb25lbmQ6ICd0cmFuc2l0aW9uRW5kJyxcbiAgICBhbmltYXRpb25zdGFydDogJ2FuaW1hdGlvblN0YXJ0JyxcbiAgICBhbmltYXRpb25pdGVyYXRpb246ICdhbmltYXRpb25JdGVyYXRpb24nLFxuICAgIGFuaW1hdGlvbmVuZDogJ2FuaW1hdGlvbkVuZCcsXG4gICAgcG9pbnRlcmRvd246ICdwb2ludGVyRG93bicsXG4gICAgcG9pbnRlcm1vdmU6ICdwb2ludGVyTW92ZScsXG4gICAgcG9pbnRlcnVwOiAncG9pbnRlclVwJyxcbiAgICBwb2ludGVyY2FuY2VsOiAncG9pbnRlckNhbmNlbCcsXG4gICAgZ290cG9pbnRlcmNhcHR1cmU6ICdnb3RQb2ludGVyQ2FwdHVyZScsXG4gICAgbG9zdHBvaW50ZXJjYXB0dXJlOiAnbG9zdFBvaW50ZXJDYXB0dXJlJyxcbiAgICBwb2ludGVyZW50ZXI6ICdwb2ludGVyRW50ZXInLFxuICAgIHBvaW50ZXJsZWF2ZTogJ3BvaW50ZXJMZWF2ZScsXG4gICAgcG9pbnRlcm92ZXI6ICdwb2ludGVyT3ZlcicsXG4gICAgcG9pbnRlcm91dDogJ3BvaW50ZXJPdXQnLFxuICAgIGF1eGNsaWNrOiAnYXV4Q2xpY2snLFxuICB9O1xuXG4gIHJldHVybiBuYXRpdmVUb1JlYWN0RXZlbnRNYXBbZXZlbnRdIHx8IGV2ZW50O1xufVxuXG4vLyAnY2xpY2snID0+ICdvbkNsaWNrJ1xuLy8gJ21vdXNlRW50ZXInID0+ICdvbk1vdXNlRW50ZXInXG5leHBvcnQgZnVuY3Rpb24gcHJvcEZyb21FdmVudChldmVudCkge1xuICBjb25zdCBuYXRpdmVFdmVudCA9IG1hcE5hdGl2ZUV2ZW50TmFtZXMoZXZlbnQpO1xuICByZXR1cm4gYG9uJHtuYXRpdmVFdmVudFswXS50b1VwcGVyQ2FzZSgpfSR7bmF0aXZlRXZlbnQuc2xpY2UoMSl9YDtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIHdpdGhTZXRTdGF0ZUFsbG93ZWQoZm4pIHtcbiAgLy8gTk9URShsbXIpOlxuICAvLyB0aGlzIGlzIGN1cnJlbnRseSBoZXJlIHRvIGNpcmN1bXZlbnQgYSBSZWFjdCBidWcgd2hlcmUgYHNldFN0YXRlKClgIGlzXG4gIC8vIG5vdCBhbGxvd2VkIHdpdGhvdXQgZ2xvYmFsIGJlaW5nIGRlZmluZWQuXG4gIGxldCBjbGVhbnVwID0gZmFsc2U7XG4gIGlmICh0eXBlb2YgZ2xvYmFsLmRvY3VtZW50ID09PSAndW5kZWZpbmVkJykge1xuICAgIGNsZWFudXAgPSB0cnVlO1xuICAgIGdsb2JhbC5kb2N1bWVudCA9IHt9O1xuICB9XG4gIGNvbnN0IHJlc3VsdCA9IGZuKCk7XG4gIGlmIChjbGVhbnVwKSB7XG4gICAgLy8gVGhpcyB3b3JrcyBhcm91bmQgYSBidWcgaW4gbm9kZS9qZXN0IGluIHRoYXQgZGV2ZWxvcGVycyBhcmVuJ3QgYWJsZSB0b1xuICAgIC8vIGRlbGV0ZSB0aGluZ3MgZnJvbSBnbG9iYWwgd2hlbiBydW5uaW5nIGluIGEgbm9kZSB2bS5cbiAgICBnbG9iYWwuZG9jdW1lbnQgPSB1bmRlZmluZWQ7XG4gICAgZGVsZXRlIGdsb2JhbC5kb2N1bWVudDtcbiAgfVxuICByZXR1cm4gcmVzdWx0O1xufVxuXG5leHBvcnQgZnVuY3Rpb24gYXNzZXJ0RG9tQXZhaWxhYmxlKGZlYXR1cmUpIHtcbiAgaWYgKCFnbG9iYWwgfHwgIWdsb2JhbC5kb2N1bWVudCB8fCAhZ2xvYmFsLmRvY3VtZW50LmNyZWF0ZUVsZW1lbnQpIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoYEVuenltZSdzICR7ZmVhdHVyZX0gZXhwZWN0cyBhIERPTSBlbnZpcm9ubWVudCB0byBiZSBsb2FkZWQsIGJ1dCBmb3VuZCBub25lYCk7XG4gIH1cbn1cblxuZXhwb3J0IGZ1bmN0aW9uIGRpc3BsYXlOYW1lT2ZOb2RlKG5vZGUpIHtcbiAgaWYgKCFub2RlKSByZXR1cm4gbnVsbDtcblxuICBjb25zdCB7IHR5cGUgfSA9IG5vZGU7XG5cbiAgaWYgKCF0eXBlKSByZXR1cm4gbnVsbDtcblxuICByZXR1cm4gdHlwZS5kaXNwbGF5TmFtZSB8fCAodHlwZW9mIHR5cGUgPT09ICdmdW5jdGlvbicgPyBmdW5jdGlvbk5hbWUodHlwZSkgOiB0eXBlLm5hbWUgfHwgdHlwZSk7XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBub2RlVHlwZUZyb21UeXBlKHR5cGUpIHtcbiAgaWYgKHR5cGVvZiB0eXBlID09PSAnc3RyaW5nJykge1xuICAgIHJldHVybiAnaG9zdCc7XG4gIH1cbiAgaWYgKHR5cGUgJiYgdHlwZS5wcm90b3R5cGUgJiYgdHlwZS5wcm90b3R5cGUuaXNSZWFjdENvbXBvbmVudCkge1xuICAgIHJldHVybiAnY2xhc3MnO1xuICB9XG4gIHJldHVybiAnZnVuY3Rpb24nO1xufVxuXG5mdW5jdGlvbiBnZXRJdGVyYXRvckZuKG9iaikge1xuICBjb25zdCBpdGVyYXRvckZuID1cbiAgICBvYmogJiZcbiAgICAoKHR5cGVvZiBTeW1ib2wgPT09ICdmdW5jdGlvbicgJiZcbiAgICAgIHR5cGVvZiBTeW1ib2wuaXRlcmF0b3IgPT09ICdzeW1ib2wnICYmXG4gICAgICBvYmpbU3ltYm9sLml0ZXJhdG9yXSkgfHxcbiAgICAgIG9ialsnQEBpdGVyYXRvciddKTtcblxuICBpZiAodHlwZW9mIGl0ZXJhdG9yRm4gPT09ICdmdW5jdGlvbicpIHtcbiAgICByZXR1cm4gaXRlcmF0b3JGbjtcbiAgfVxuXG4gIHJldHVybiB1bmRlZmluZWQ7XG59XG5cbmZ1bmN0aW9uIGlzSXRlcmFibGUob2JqKSB7XG4gIHJldHVybiAhIWdldEl0ZXJhdG9yRm4ob2JqKTtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIGlzQXJyYXlMaWtlKG9iaikge1xuICByZXR1cm4gQXJyYXkuaXNBcnJheShvYmopIHx8ICh0eXBlb2Ygb2JqICE9PSAnc3RyaW5nJyAmJiBpc0l0ZXJhYmxlKG9iaikpO1xufVxuXG5leHBvcnQgZnVuY3Rpb24gZmxhdHRlbihhcnJzKSB7XG4gIC8vIG9wdGltaXplIGZvciB0aGUgbW9zdCBjb21tb24gY2FzZVxuICBpZiAoQXJyYXkuaXNBcnJheShhcnJzKSkge1xuICAgIHJldHVybiBhcnJzLnJlZHVjZShcbiAgICAgIChmbGF0QXJycywgaXRlbSkgPT4gZmxhdEFycnMuY29uY2F0KGlzQXJyYXlMaWtlKGl0ZW0pID8gZmxhdHRlbihpdGVtKSA6IGl0ZW0pLFxuICAgICAgW10sXG4gICAgKTtcbiAgfVxuXG4gIC8vIGZhbGxiYWNrIGZvciBhcmJpdHJhcnkgaXRlcmFibGUgY2hpbGRyZW5cbiAgbGV0IGZsYXRBcnJzID0gW107XG5cbiAgY29uc3QgaXRlcmF0b3JGbiA9IGdldEl0ZXJhdG9yRm4oYXJycyk7XG4gIGNvbnN0IGl0ZXJhdG9yID0gaXRlcmF0b3JGbi5jYWxsKGFycnMpO1xuXG4gIGxldCBzdGVwID0gaXRlcmF0b3IubmV4dCgpO1xuXG4gIHdoaWxlICghc3RlcC5kb25lKSB7XG4gICAgY29uc3QgaXRlbSA9IHN0ZXAudmFsdWU7XG4gICAgbGV0IGZsYXRJdGVtO1xuXG4gICAgaWYgKGlzQXJyYXlMaWtlKGl0ZW0pKSB7XG4gICAgICBmbGF0SXRlbSA9IGZsYXR0ZW4oaXRlbSk7XG4gICAgfSBlbHNlIHtcbiAgICAgIGZsYXRJdGVtID0gaXRlbTtcbiAgICB9XG5cbiAgICBmbGF0QXJycyA9IGZsYXRBcnJzLmNvbmNhdChmbGF0SXRlbSk7XG5cbiAgICBzdGVwID0gaXRlcmF0b3IubmV4dCgpO1xuICB9XG5cbiAgcmV0dXJuIGZsYXRBcnJzO1xufVxuXG5leHBvcnQgZnVuY3Rpb24gZW5zdXJlS2V5T3JVbmRlZmluZWQoa2V5KSB7XG4gIHJldHVybiBrZXkgfHwgKGtleSA9PT0gJycgPyAnJyA6IHVuZGVmaW5lZCk7XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBlbGVtZW50VG9UcmVlKGVsLCByZWN1cnNlID0gZWxlbWVudFRvVHJlZSkge1xuICBpZiAodHlwZW9mIHJlY3Vyc2UgIT09ICdmdW5jdGlvbicgJiYgYXJndW1lbnRzLmxlbmd0aCA9PT0gMykge1xuICAgIC8vIHNwZWNpYWwgY2FzZSBmb3IgYmFja3dhcmRzIGNvbXBhdCBmb3IgYC5tYXAoZWxlbWVudFRvVHJlZSlgXG4gICAgcmVjdXJzZSA9IGVsZW1lbnRUb1RyZWU7XG4gIH1cbiAgaWYgKGVsID09PSBudWxsIHx8IHR5cGVvZiBlbCAhPT0gJ29iamVjdCcgfHwgISgndHlwZScgaW4gZWwpKSB7XG4gICAgcmV0dXJuIGVsO1xuICB9XG4gIGNvbnN0IHsgdHlwZSwgcHJvcHMsIGtleSwgcmVmIH0gPSBlbDtcbiAgY29uc3QgeyBjaGlsZHJlbiB9ID0gcHJvcHM7XG4gIGxldCByZW5kZXJlZCA9IG51bGw7XG4gIGlmIChpc0FycmF5TGlrZShjaGlsZHJlbikpIHtcbiAgICByZW5kZXJlZCA9IGZsYXR0ZW4oY2hpbGRyZW4pLm1hcCgoeCkgPT4gcmVjdXJzZSh4KSk7XG4gIH0gZWxzZSBpZiAodHlwZW9mIGNoaWxkcmVuICE9PSAndW5kZWZpbmVkJykge1xuICAgIHJlbmRlcmVkID0gcmVjdXJzZShjaGlsZHJlbik7XG4gIH1cblxuICBjb25zdCBub2RlVHlwZSA9IG5vZGVUeXBlRnJvbVR5cGUodHlwZSk7XG5cbiAgaWYgKG5vZGVUeXBlID09PSAnaG9zdCcgJiYgcHJvcHMuZGFuZ2Vyb3VzbHlTZXRJbm5lckhUTUwpIHtcbiAgICBpZiAocHJvcHMuY2hpbGRyZW4gIT0gbnVsbCkge1xuICAgICAgY29uc3QgZXJyb3IgPSBuZXcgRXJyb3IoJ0NhbiBvbmx5IHNldCBvbmUgb2YgYGNoaWxkcmVuYCBvciBgcHJvcHMuZGFuZ2Vyb3VzbHlTZXRJbm5lckhUTUxgLicpO1xuICAgICAgZXJyb3IubmFtZSA9ICdJbnZhcmlhbnQgVmlvbGF0aW9uJztcbiAgICAgIHRocm93IGVycm9yO1xuICAgIH1cbiAgfVxuXG4gIHJldHVybiB7XG4gICAgbm9kZVR5cGUsXG4gICAgdHlwZSxcbiAgICBwcm9wcyxcbiAgICBrZXk6IGVuc3VyZUtleU9yVW5kZWZpbmVkKGtleSksXG4gICAgcmVmLFxuICAgIGluc3RhbmNlOiBudWxsLFxuICAgIHJlbmRlcmVkLFxuICB9O1xufVxuXG5mdW5jdGlvbiBtYXBGaW5kKGFycmF5bGlrZSwgbWFwcGVyLCBmaW5kZXIpIHtcbiAgbGV0IGZvdW5kO1xuICBjb25zdCBpc0ZvdW5kID0gQXJyYXkucHJvdG90eXBlLmZpbmQuY2FsbChhcnJheWxpa2UsIChpdGVtKSA9PiB7XG4gICAgZm91bmQgPSBtYXBwZXIoaXRlbSk7XG4gICAgcmV0dXJuIGZpbmRlcihmb3VuZCk7XG4gIH0pO1xuICByZXR1cm4gaXNGb3VuZCA/IGZvdW5kIDogdW5kZWZpbmVkO1xufVxuXG5leHBvcnQgZnVuY3Rpb24gZmluZEVsZW1lbnQoZWwsIHByZWRpY2F0ZSkge1xuICBpZiAoZWwgPT09IG51bGwgfHwgdHlwZW9mIGVsICE9PSAnb2JqZWN0JyB8fCAhKCd0eXBlJyBpbiBlbCkpIHtcbiAgICByZXR1cm4gdW5kZWZpbmVkO1xuICB9XG4gIGlmIChwcmVkaWNhdGUoZWwpKSB7XG4gICAgcmV0dXJuIGVsO1xuICB9XG4gIGNvbnN0IHsgcmVuZGVyZWQgfSA9IGVsO1xuICBpZiAoaXNBcnJheUxpa2UocmVuZGVyZWQpKSB7XG4gICAgcmV0dXJuIG1hcEZpbmQoXG4gICAgICByZW5kZXJlZCxcbiAgICAgICh4KSA9PiBmaW5kRWxlbWVudCh4LCBwcmVkaWNhdGUpLFxuICAgICAgKHgpID0+IHR5cGVvZiB4ICE9PSAndW5kZWZpbmVkJyxcbiAgICApO1xuICB9XG4gIHJldHVybiBmaW5kRWxlbWVudChyZW5kZXJlZCwgcHJlZGljYXRlKTtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIHByb3BzV2l0aEtleXNBbmRSZWYobm9kZSkge1xuICBpZiAobm9kZS5yZWYgIT09IG51bGwgfHwgbm9kZS5rZXkgIT09IG51bGwpIHtcbiAgICByZXR1cm4ge1xuICAgICAgLi4ubm9kZS5wcm9wcyxcbiAgICAgIGtleTogbm9kZS5rZXksXG4gICAgICByZWY6IG5vZGUucmVmLFxuICAgIH07XG4gIH1cbiAgcmV0dXJuIG5vZGUucHJvcHM7XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBnZXRDb21wb25lbnRTdGFjayhcbiAgaGllcmFyY2h5LFxuICBnZXROb2RlVHlwZSA9IG5vZGVUeXBlRnJvbVR5cGUsXG4gIGdldERpc3BsYXlOYW1lID0gZGlzcGxheU5hbWVPZk5vZGUsXG4pIHtcbiAgY29uc3QgdHVwbGVzID0gaGllcmFyY2h5XG4gICAgLmZpbHRlcigobm9kZSkgPT4gbm9kZS50eXBlICE9PSBSb290RmluZGVyKVxuICAgIC5tYXAoKHgpID0+IFtnZXROb2RlVHlwZSh4LnR5cGUpLCBnZXREaXNwbGF5TmFtZSh4KV0pXG4gICAgLmNvbmNhdChbWydjbGFzcycsICdXcmFwcGVyQ29tcG9uZW50J11dKTtcblxuICByZXR1cm4gdHVwbGVzXG4gICAgLm1hcCgoWywgbmFtZV0sIGksIGFycikgPT4ge1xuICAgICAgY29uc3QgWywgY2xvc2VzdENvbXBvbmVudF0gPSBhcnIuc2xpY2UoaSArIDEpLmZpbmQoKFtub2RlVHlwZV0pID0+IG5vZGVUeXBlICE9PSAnaG9zdCcpIHx8IFtdO1xuICAgICAgcmV0dXJuIGBcXG4gICAgaW4gJHtuYW1lfSR7Y2xvc2VzdENvbXBvbmVudCA/IGAgKGNyZWF0ZWQgYnkgJHtjbG9zZXN0Q29tcG9uZW50fSlgIDogJyd9YDtcbiAgICB9KVxuICAgIC5qb2luKCcnKTtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIHNpbXVsYXRlRXJyb3IoXG4gIGVycm9yLFxuICBjYXRjaGluZ0luc3RhbmNlLFxuICByb290Tm9kZSwgLy8gVE9ETzogcmVtb3ZlIGByb290Tm9kZWAgbmV4dCBzZW12ZXItbWFqb3JcbiAgaGllcmFyY2h5LFxuICBnZXROb2RlVHlwZSA9IG5vZGVUeXBlRnJvbVR5cGUsXG4gIGdldERpc3BsYXlOYW1lID0gZGlzcGxheU5hbWVPZk5vZGUsXG4gIGNhdGNoaW5nVHlwZSA9IHt9LFxuKSB7XG4gIGNvbnN0IGluc3RhbmNlID0gY2F0Y2hpbmdJbnN0YW5jZSB8fCB7fTtcblxuICBjb25zdCB7IGNvbXBvbmVudERpZENhdGNoIH0gPSBpbnN0YW5jZTtcblxuICBjb25zdCB7IGdldERlcml2ZWRTdGF0ZUZyb21FcnJvciB9ID0gY2F0Y2hpbmdUeXBlO1xuXG4gIGlmICghY29tcG9uZW50RGlkQ2F0Y2ggJiYgIWdldERlcml2ZWRTdGF0ZUZyb21FcnJvcikge1xuICAgIHRocm93IGVycm9yO1xuICB9XG5cbiAgaWYgKGdldERlcml2ZWRTdGF0ZUZyb21FcnJvcikge1xuICAgIGNvbnN0IHN0YXRlVXBkYXRlID0gZ2V0RGVyaXZlZFN0YXRlRnJvbUVycm9yLmNhbGwoY2F0Y2hpbmdUeXBlLCBlcnJvcik7XG4gICAgaW5zdGFuY2Uuc2V0U3RhdGUoc3RhdGVVcGRhdGUpO1xuICB9XG5cbiAgaWYgKGNvbXBvbmVudERpZENhdGNoKSB7XG4gICAgY29uc3QgY29tcG9uZW50U3RhY2sgPSBnZXRDb21wb25lbnRTdGFjayhoaWVyYXJjaHksIGdldE5vZGVUeXBlLCBnZXREaXNwbGF5TmFtZSk7XG4gICAgY29tcG9uZW50RGlkQ2F0Y2guY2FsbChpbnN0YW5jZSwgZXJyb3IsIHsgY29tcG9uZW50U3RhY2sgfSk7XG4gIH1cbn1cblxuZXhwb3J0IGZ1bmN0aW9uIGdldE1hc2tlZENvbnRleHQoY29udGV4dFR5cGVzLCB1bm1hc2tlZENvbnRleHQpIHtcbiAgaWYgKCFjb250ZXh0VHlwZXMgfHwgIXVubWFza2VkQ29udGV4dCkge1xuICAgIHJldHVybiB7fTtcbiAgfVxuICByZXR1cm4gZnJvbUVudHJpZXMoT2JqZWN0LmtleXMoY29udGV4dFR5cGVzKS5tYXAoKGtleSkgPT4gW2tleSwgdW5tYXNrZWRDb250ZXh0W2tleV1dKSk7XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBnZXROb2RlRnJvbVJvb3RGaW5kZXIoaXNDdXN0b21Db21wb25lbnQsIHRyZWUsIG9wdGlvbnMpIHtcbiAgaWYgKCFpc0N1c3RvbUNvbXBvbmVudChvcHRpb25zLndyYXBwaW5nQ29tcG9uZW50KSkge1xuICAgIHJldHVybiB0cmVlLnJlbmRlcmVkO1xuICB9XG4gIGNvbnN0IHJvb3RGaW5kZXIgPSBmaW5kRWxlbWVudCh0cmVlLCAobm9kZSkgPT4gbm9kZS50eXBlID09PSBSb290RmluZGVyKTtcbiAgaWYgKCFyb290RmluZGVyKSB7XG4gICAgdGhyb3cgbmV3IEVycm9yKCdgd3JhcHBpbmdDb21wb25lbnRgIG11c3QgcmVuZGVyIGl0cyBjaGlsZHJlbiEnKTtcbiAgfVxuICByZXR1cm4gcm9vdEZpbmRlci5yZW5kZXJlZDtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIHdyYXBXaXRoV3JhcHBpbmdDb21wb25lbnQoY3JlYXRlRWxlbWVudCwgbm9kZSwgb3B0aW9ucykge1xuICBjb25zdCB7IHdyYXBwaW5nQ29tcG9uZW50LCB3cmFwcGluZ0NvbXBvbmVudFByb3BzIH0gPSBvcHRpb25zO1xuICBpZiAoIXdyYXBwaW5nQ29tcG9uZW50KSB7XG4gICAgcmV0dXJuIG5vZGU7XG4gIH1cbiAgcmV0dXJuIGNyZWF0ZUVsZW1lbnQoXG4gICAgd3JhcHBpbmdDb21wb25lbnQsXG4gICAgd3JhcHBpbmdDb21wb25lbnRQcm9wcyxcbiAgICBjcmVhdGVFbGVtZW50KFJvb3RGaW5kZXIsIG51bGwsIG5vZGUpLFxuICApO1xufVxuXG5leHBvcnQgZnVuY3Rpb24gZ2V0V3JhcHBpbmdDb21wb25lbnRNb3VudFJlbmRlcmVyKHsgdG9UcmVlLCBnZXRNb3VudFdyYXBwZXJJbnN0YW5jZSB9KSB7XG4gIHJldHVybiB7XG4gICAgZ2V0Tm9kZSgpIHtcbiAgICAgIGNvbnN0IGluc3RhbmNlID0gZ2V0TW91bnRXcmFwcGVySW5zdGFuY2UoKTtcbiAgICAgIHJldHVybiBpbnN0YW5jZSA/IHRvVHJlZShpbnN0YW5jZSkucmVuZGVyZWQgOiBudWxsO1xuICAgIH0sXG4gICAgcmVuZGVyKGVsLCBjb250ZXh0LCBjYWxsYmFjaykge1xuICAgICAgY29uc3QgaW5zdGFuY2UgPSBnZXRNb3VudFdyYXBwZXJJbnN0YW5jZSgpO1xuICAgICAgaWYgKCFpbnN0YW5jZSkge1xuICAgICAgICB0aHJvdyBuZXcgRXJyb3IoJ1RoZSB3cmFwcGluZyBjb21wb25lbnQgbWF5IG5vdCBiZSB1cGRhdGVkIGlmIHRoZSByb290IGlzIHVubW91bnRlZC4nKTtcbiAgICAgIH1cbiAgICAgIHJldHVybiBpbnN0YW5jZS5zZXRXcmFwcGluZ0NvbXBvbmVudFByb3BzKGVsLnByb3BzLCBjYWxsYmFjayk7XG4gICAgfSxcbiAgfTtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIGZha2VEeW5hbWljSW1wb3J0KG1vZHVsZVRvSW1wb3J0KSB7XG4gIHJldHVybiBQcm9taXNlLnJlc29sdmUoeyBkZWZhdWx0OiBtb2R1bGVUb0ltcG9ydCB9KTtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIGNvbXBhcmVOb2RlVHlwZU9mKG5vZGUsIG1hdGNoaW5nVHlwZU9mKSB7XG4gIGlmICghbm9kZSkge1xuICAgIHJldHVybiBmYWxzZTtcbiAgfVxuICByZXR1cm4gbm9kZS4kJHR5cGVvZiA9PT0gbWF0Y2hpbmdUeXBlT2Y7XG59XG5cbi8vIFRPRE86IHdoZW4gZW56eW1lIHYzLjEyLjAgaXMgcmVxdWlyZWQsIGRlbGV0ZSB0aGlzXG5leHBvcnQgZnVuY3Rpb24gc3B5TWV0aG9kKGluc3RhbmNlLCBtZXRob2ROYW1lLCBnZXRTdHViID0gKCkgPT4ge30pIHtcbiAgbGV0IGxhc3RSZXR1cm5WYWx1ZTtcbiAgY29uc3Qgb3JpZ2luYWxNZXRob2QgPSBpbnN0YW5jZVttZXRob2ROYW1lXTtcbiAgY29uc3QgaGFzT3duID0gaGFzKGluc3RhbmNlLCBtZXRob2ROYW1lKTtcbiAgbGV0IGRlc2NyaXB0b3I7XG4gIGlmIChoYXNPd24pIHtcbiAgICBkZXNjcmlwdG9yID0gT2JqZWN0LmdldE93blByb3BlcnR5RGVzY3JpcHRvcihpbnN0YW5jZSwgbWV0aG9kTmFtZSk7XG4gIH1cbiAgT2JqZWN0LmRlZmluZVByb3BlcnR5KGluc3RhbmNlLCBtZXRob2ROYW1lLCB7XG4gICAgY29uZmlndXJhYmxlOiB0cnVlLFxuICAgIGVudW1lcmFibGU6ICFkZXNjcmlwdG9yIHx8ICEhZGVzY3JpcHRvci5lbnVtZXJhYmxlLFxuICAgIHZhbHVlOlxuICAgICAgZ2V0U3R1YihvcmlnaW5hbE1ldGhvZCkgfHxcbiAgICAgIGZ1bmN0aW9uIHNwaWVkKC4uLmFyZ3MpIHtcbiAgICAgICAgY29uc3QgcmVzdWx0ID0gb3JpZ2luYWxNZXRob2QuYXBwbHkodGhpcywgYXJncyk7XG4gICAgICAgIGxhc3RSZXR1cm5WYWx1ZSA9IHJlc3VsdDtcbiAgICAgICAgcmV0dXJuIHJlc3VsdDtcbiAgICAgIH0sXG4gIH0pO1xuICByZXR1cm4ge1xuICAgIHJlc3RvcmUoKSB7XG4gICAgICBpZiAoaGFzT3duKSB7XG4gICAgICAgIGlmIChkZXNjcmlwdG9yKSB7XG4gICAgICAgICAgT2JqZWN0LmRlZmluZVByb3BlcnR5KGluc3RhbmNlLCBtZXRob2ROYW1lLCBkZXNjcmlwdG9yKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICBpbnN0YW5jZVttZXRob2ROYW1lXSA9IG9yaWdpbmFsTWV0aG9kO1xuICAgICAgICB9XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBkZWxldGUgaW5zdGFuY2VbbWV0aG9kTmFtZV07XG4gICAgICB9XG4gICAgfSxcbiAgICBnZXRMYXN0UmV0dXJuVmFsdWUoKSB7XG4gICAgICByZXR1cm4gbGFzdFJldHVyblZhbHVlO1xuICAgIH0sXG4gIH07XG59XG5cbi8vIFRPRE86IHdoZW4gZW56eW1lIHYzLjEyLjAgaXMgcmVxdWlyZWQsIGRlbGV0ZSB0aGlzXG5leHBvcnQgZnVuY3Rpb24gc3B5UHJvcGVydHkoaW5zdGFuY2UsIHByb3BlcnR5TmFtZSwgaGFuZGxlcnMgPSB7fSkge1xuICBjb25zdCBvcmlnaW5hbFZhbHVlID0gaW5zdGFuY2VbcHJvcGVydHlOYW1lXTtcbiAgY29uc3QgaGFzT3duID0gaGFzKGluc3RhbmNlLCBwcm9wZXJ0eU5hbWUpO1xuICBsZXQgZGVzY3JpcHRvcjtcbiAgaWYgKGhhc093bikge1xuICAgIGRlc2NyaXB0b3IgPSBPYmplY3QuZ2V0T3duUHJvcGVydHlEZXNjcmlwdG9yKGluc3RhbmNlLCBwcm9wZXJ0eU5hbWUpO1xuICB9XG4gIGxldCB3YXNBc3NpZ25lZCA9IGZhbHNlO1xuICBsZXQgaG9sZGVyID0gb3JpZ2luYWxWYWx1ZTtcbiAgY29uc3QgZ2V0ViA9IGhhbmRsZXJzLmdldFxuICAgID8gKCkgPT4ge1xuICAgICAgICBjb25zdCB2YWx1ZSA9IGRlc2NyaXB0b3IgJiYgZGVzY3JpcHRvci5nZXQgPyBkZXNjcmlwdG9yLmdldC5jYWxsKGluc3RhbmNlKSA6IGhvbGRlcjtcbiAgICAgICAgcmV0dXJuIGhhbmRsZXJzLmdldC5jYWxsKGluc3RhbmNlLCB2YWx1ZSk7XG4gICAgICB9XG4gICAgOiAoKSA9PiBob2xkZXI7XG4gIGNvbnN0IHNldCA9IGhhbmRsZXJzLnNldFxuICAgID8gKG5ld1ZhbHVlKSA9PiB7XG4gICAgICAgIHdhc0Fzc2lnbmVkID0gdHJ1ZTtcbiAgICAgICAgY29uc3QgaGFuZGxlck5ld1ZhbHVlID0gaGFuZGxlcnMuc2V0LmNhbGwoaW5zdGFuY2UsIGhvbGRlciwgbmV3VmFsdWUpO1xuICAgICAgICBob2xkZXIgPSBoYW5kbGVyTmV3VmFsdWU7XG4gICAgICAgIGlmIChkZXNjcmlwdG9yICYmIGRlc2NyaXB0b3Iuc2V0KSB7XG4gICAgICAgICAgZGVzY3JpcHRvci5zZXQuY2FsbChpbnN0YW5jZSwgaG9sZGVyKTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgIDogKHYpID0+IHtcbiAgICAgICAgd2FzQXNzaWduZWQgPSB0cnVlO1xuICAgICAgICBob2xkZXIgPSB2O1xuICAgICAgfTtcbiAgT2JqZWN0LmRlZmluZVByb3BlcnR5KGluc3RhbmNlLCBwcm9wZXJ0eU5hbWUsIHtcbiAgICBjb25maWd1cmFibGU6IHRydWUsXG4gICAgZW51bWVyYWJsZTogIWRlc2NyaXB0b3IgfHwgISFkZXNjcmlwdG9yLmVudW1lcmFibGUsXG4gICAgZ2V0OiBnZXRWLFxuICAgIHNldCxcbiAgfSk7XG5cbiAgcmV0dXJuIHtcbiAgICByZXN0b3JlKCkge1xuICAgICAgaWYgKGhhc093bikge1xuICAgICAgICBpZiAoZGVzY3JpcHRvcikge1xuICAgICAgICAgIE9iamVjdC5kZWZpbmVQcm9wZXJ0eShpbnN0YW5jZSwgcHJvcGVydHlOYW1lLCBkZXNjcmlwdG9yKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICBpbnN0YW5jZVtwcm9wZXJ0eU5hbWVdID0gaG9sZGVyO1xuICAgICAgICB9XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBkZWxldGUgaW5zdGFuY2VbcHJvcGVydHlOYW1lXTtcbiAgICAgIH1cbiAgICB9LFxuICAgIHdhc0Fzc2lnbmVkKCkge1xuICAgICAgcmV0dXJuIHdhc0Fzc2lnbmVkO1xuICAgIH0sXG4gIH07XG59XG4iXX0=
//# sourceMappingURL=Utils.js.map