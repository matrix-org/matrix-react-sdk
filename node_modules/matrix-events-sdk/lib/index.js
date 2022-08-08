"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _ExtensibleEvents = require("./ExtensibleEvents");

Object.keys(_ExtensibleEvents).forEach(function (key) {
  if (key === "default" || key === "__esModule") return;
  if (key in exports && exports[key] === _ExtensibleEvents[key]) return;
  Object.defineProperty(exports, key, {
    enumerable: true,
    get: function get() {
      return _ExtensibleEvents[key];
    }
  });
});

var _IPartialEvent = require("./IPartialEvent");

Object.keys(_IPartialEvent).forEach(function (key) {
  if (key === "default" || key === "__esModule") return;
  if (key in exports && exports[key] === _IPartialEvent[key]) return;
  Object.defineProperty(exports, key, {
    enumerable: true,
    get: function get() {
      return _IPartialEvent[key];
    }
  });
});

var _InvalidEventError = require("./InvalidEventError");

Object.keys(_InvalidEventError).forEach(function (key) {
  if (key === "default" || key === "__esModule") return;
  if (key in exports && exports[key] === _InvalidEventError[key]) return;
  Object.defineProperty(exports, key, {
    enumerable: true,
    get: function get() {
      return _InvalidEventError[key];
    }
  });
});

var _NamespacedValue = require("./NamespacedValue");

Object.keys(_NamespacedValue).forEach(function (key) {
  if (key === "default" || key === "__esModule") return;
  if (key in exports && exports[key] === _NamespacedValue[key]) return;
  Object.defineProperty(exports, key, {
    enumerable: true,
    get: function get() {
      return _NamespacedValue[key];
    }
  });
});

var _NamespacedMap = require("./NamespacedMap");

Object.keys(_NamespacedMap).forEach(function (key) {
  if (key === "default" || key === "__esModule") return;
  if (key in exports && exports[key] === _NamespacedMap[key]) return;
  Object.defineProperty(exports, key, {
    enumerable: true,
    get: function get() {
      return _NamespacedMap[key];
    }
  });
});

var _types = require("./types");

Object.keys(_types).forEach(function (key) {
  if (key === "default" || key === "__esModule") return;
  if (key in exports && exports[key] === _types[key]) return;
  Object.defineProperty(exports, key, {
    enumerable: true,
    get: function get() {
      return _types[key];
    }
  });
});

var _MessageMatchers = require("./utility/MessageMatchers");

Object.keys(_MessageMatchers).forEach(function (key) {
  if (key === "default" || key === "__esModule") return;
  if (key in exports && exports[key] === _MessageMatchers[key]) return;
  Object.defineProperty(exports, key, {
    enumerable: true,
    get: function get() {
      return _MessageMatchers[key];
    }
  });
});

var _events = require("./utility/events");

Object.keys(_events).forEach(function (key) {
  if (key === "default" || key === "__esModule") return;
  if (key in exports && exports[key] === _events[key]) return;
  Object.defineProperty(exports, key, {
    enumerable: true,
    get: function get() {
      return _events[key];
    }
  });
});

var _MRoomMessage = require("./interpreters/legacy/MRoomMessage");

Object.keys(_MRoomMessage).forEach(function (key) {
  if (key === "default" || key === "__esModule") return;
  if (key in exports && exports[key] === _MRoomMessage[key]) return;
  Object.defineProperty(exports, key, {
    enumerable: true,
    get: function get() {
      return _MRoomMessage[key];
    }
  });
});

var _MMessage = require("./interpreters/modern/MMessage");

Object.keys(_MMessage).forEach(function (key) {
  if (key === "default" || key === "__esModule") return;
  if (key in exports && exports[key] === _MMessage[key]) return;
  Object.defineProperty(exports, key, {
    enumerable: true,
    get: function get() {
      return _MMessage[key];
    }
  });
});

var _MPoll = require("./interpreters/modern/MPoll");

Object.keys(_MPoll).forEach(function (key) {
  if (key === "default" || key === "__esModule") return;
  if (key in exports && exports[key] === _MPoll[key]) return;
  Object.defineProperty(exports, key, {
    enumerable: true,
    get: function get() {
      return _MPoll[key];
    }
  });
});

var _relationship_types = require("./events/relationship_types");

Object.keys(_relationship_types).forEach(function (key) {
  if (key === "default" || key === "__esModule") return;
  if (key in exports && exports[key] === _relationship_types[key]) return;
  Object.defineProperty(exports, key, {
    enumerable: true,
    get: function get() {
      return _relationship_types[key];
    }
  });
});

var _ExtensibleEvent = require("./events/ExtensibleEvent");

Object.keys(_ExtensibleEvent).forEach(function (key) {
  if (key === "default" || key === "__esModule") return;
  if (key in exports && exports[key] === _ExtensibleEvent[key]) return;
  Object.defineProperty(exports, key, {
    enumerable: true,
    get: function get() {
      return _ExtensibleEvent[key];
    }
  });
});

var _message_types = require("./events/message_types");

Object.keys(_message_types).forEach(function (key) {
  if (key === "default" || key === "__esModule") return;
  if (key in exports && exports[key] === _message_types[key]) return;
  Object.defineProperty(exports, key, {
    enumerable: true,
    get: function get() {
      return _message_types[key];
    }
  });
});

var _MessageEvent = require("./events/MessageEvent");

Object.keys(_MessageEvent).forEach(function (key) {
  if (key === "default" || key === "__esModule") return;
  if (key in exports && exports[key] === _MessageEvent[key]) return;
  Object.defineProperty(exports, key, {
    enumerable: true,
    get: function get() {
      return _MessageEvent[key];
    }
  });
});

var _EmoteEvent = require("./events/EmoteEvent");

Object.keys(_EmoteEvent).forEach(function (key) {
  if (key === "default" || key === "__esModule") return;
  if (key in exports && exports[key] === _EmoteEvent[key]) return;
  Object.defineProperty(exports, key, {
    enumerable: true,
    get: function get() {
      return _EmoteEvent[key];
    }
  });
});

var _NoticeEvent = require("./events/NoticeEvent");

Object.keys(_NoticeEvent).forEach(function (key) {
  if (key === "default" || key === "__esModule") return;
  if (key in exports && exports[key] === _NoticeEvent[key]) return;
  Object.defineProperty(exports, key, {
    enumerable: true,
    get: function get() {
      return _NoticeEvent[key];
    }
  });
});

var _poll_types = require("./events/poll_types");

Object.keys(_poll_types).forEach(function (key) {
  if (key === "default" || key === "__esModule") return;
  if (key in exports && exports[key] === _poll_types[key]) return;
  Object.defineProperty(exports, key, {
    enumerable: true,
    get: function get() {
      return _poll_types[key];
    }
  });
});

var _PollStartEvent = require("./events/PollStartEvent");

Object.keys(_PollStartEvent).forEach(function (key) {
  if (key === "default" || key === "__esModule") return;
  if (key in exports && exports[key] === _PollStartEvent[key]) return;
  Object.defineProperty(exports, key, {
    enumerable: true,
    get: function get() {
      return _PollStartEvent[key];
    }
  });
});

var _PollResponseEvent = require("./events/PollResponseEvent");

Object.keys(_PollResponseEvent).forEach(function (key) {
  if (key === "default" || key === "__esModule") return;
  if (key in exports && exports[key] === _PollResponseEvent[key]) return;
  Object.defineProperty(exports, key, {
    enumerable: true,
    get: function get() {
      return _PollResponseEvent[key];
    }
  });
});

var _PollEndEvent = require("./events/PollEndEvent");

Object.keys(_PollEndEvent).forEach(function (key) {
  if (key === "default" || key === "__esModule") return;
  if (key in exports && exports[key] === _PollEndEvent[key]) return;
  Object.defineProperty(exports, key, {
    enumerable: true,
    get: function get() {
      return _PollEndEvent[key];
    }
  });
});