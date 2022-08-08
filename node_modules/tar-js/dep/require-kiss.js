/*jslint onevar: true, undef: true, newcap: true, regexp: true, plusplus: true, bitwise: true, devel: true, maxerr: 50, indent: 2 */
/*global module: true, exports: true, provide: true */
var global = global || (function () { return this; }()),
  __dirname = __dirname || '';
(function () {
  "use strict";

  var thrownAlready = false;

  function ssjsProvide(exports) {
    //module.exports = exports || module.exports;
  }

  function resetModule() {
    global.module = {};
    global.exports = {};
    global.module.exports = exports;
  }

  function normalize(name) {
    if ('./' === name.substr(0,2)) {
      name = name.substr(2);
    }
    return name;
  }

  function browserRequire(name) {
    var mod,
      msg = "One of the included scripts requires '" + 
        name + "', which is not loaded. " +
        "\nTry including '<script src=\"" + name + ".js\"></script>'.\n";

    name = normalize(name);
    mod = global.__REQUIRE_KISS_EXPORTS[name] || global[name];

    if ('undefined' === typeof mod && !thrownAlready) {
      thrownAlready = true;
      alert(msg);
      throw new Error(msg);
    }

    return mod;
  }

  function browserProvide(name, new_exports) {
    name = normalize(name);
    global.__REQUIRE_KISS_EXPORTS[name] = new_exports || module.exports;
    resetModule();
  }

  if (global.require) {
    if (global.provide) {
      return;
    }
    global.provide = ssjsProvide;
    return;
  }

  global.__REQUIRE_KISS_EXPORTS = global.__REQUIRE_KISS_EXPORTS || {};
  global.require = global.require || browserRequire;
  global.provide = global.provide || browserProvide;
  resetModule();

  provide('require-kiss');
}());
