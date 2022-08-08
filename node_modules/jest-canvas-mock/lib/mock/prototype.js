"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = mockPrototype;

function mockPrototype() {
  /**
   * This weakmap is designed to contain all of the generated canvas contexts. It's keys are the
   * jsdom canvases obtained by using the `this` keyword inside the `#getContext('2d')` function
   * call. It's values are the generated `CanvasRenderingContext2D` objects.
   */
  const generatedContexts = new WeakMap();
  /**
   * Overrides getContext. Every test run will create a new function that overrides the current
   * value of getContext. It attempts to preserve the original getContext function by storing it on
   * the callback as a property.
   */

  const getContext2D = jest.fn(function getContext2d(type) {
    if (type === '2d') {
      /**
       * Contexts must be indempotent. Once they are generated, they should be returned when
       * getContext() is called on the same canvas object multiple times.
       */
      if (generatedContexts.has(this)) return generatedContexts.get(this);
      const ctx = new CanvasRenderingContext2D(this);
      generatedContexts.set(this, ctx);
      return ctx;
    }

    try {
      if (!this.dataset.internalRequireTest) require('canvas');
    } catch (_unused) {
      return null;
    }

    return getContext2D.internal.call(this, type);
  });

  if (!jest.isMockFunction(HTMLCanvasElement.prototype.getContext)) {
    getContext2D.internal = HTMLCanvasElement.prototype.getContext;
  } else {
    getContext2D.internal = HTMLCanvasElement.prototype.getContext.internal;
  }

  HTMLCanvasElement.prototype.getContext = getContext2D;
  /**
   * This function technically throws SecurityError at runtime, but it cannot be mocked, because
   * we don't know if the canvas is tainted. These kinds of errors will be silent.
   */

  const toBlobOverride = jest.fn(function toBlobOverride(callback, mimetype) {
    if (arguments.length < 1) throw new TypeError("Failed to execute 'toBlob' on 'HTMLCanvasElement': 1 argument required, but only 0 present.");
    if (typeof callback !== 'function') throw new TypeError("Failed to execute 'toBlob' on 'HTMLCanvasElement': The callback provided as parameter 1 is not a function.");
    /**
     * Mime type must be image/jpeg or image/webp exactly for the browser to accept it, otherwise
     * it's image/png.
     */

    switch (mimetype) {
      case 'image/webp':
        break;

      case 'image/jpeg':
        break;

      default:
        mimetype = 'image/png';
    }
    /**
     * This section creates a blob of size width * height * 4. This is not actually valid, because
     * jpeg size is variable, and so is png. TODO: Is there a better way to do this?
     */


    const length = this.width * this.height * 4;
    const data = new Uint8Array(length);
    const blob = new window.Blob([data], {
      type: mimetype
    });
    setTimeout(() => callback(blob), 0);
  });

  if (!jest.isMockFunction(HTMLCanvasElement.prototype.toBlob)) {
    toBlobOverride.internal = HTMLCanvasElement.prototype.toBlob;
  } else {
    toBlobOverride.internal = HTMLCanvasElement.prototype.toBlob.internal;
  }

  HTMLCanvasElement.prototype.toBlob = toBlobOverride;
  /**
   * This section creates a dataurl with a validated mime type. This is not actually valid, because
   * jpeg size is variable, and so is png. TODO: Is there a better way to do this?
   */

  const toDataURLOverride = jest.fn(function toDataURLOverride(type, encoderOptions) {
    switch (type) {
      case 'image/jpeg':
        break;

      case 'image/webp':
        break;

      default:
        type = 'image/png';
    }
    /**
     * This is the smallest valid data url I could generate.
     */


    return 'data:' + type + ';base64,00';
  });

  if (!jest.isMockFunction(HTMLCanvasElement.prototype.toDataURL)) {
    toDataURLOverride.internal = HTMLCanvasElement.prototype.toDataURL;
  } else {
    toDataURLOverride.internal = HTMLCanvasElement.prototype.toBlob.internal;
  }

  HTMLCanvasElement.prototype.toDataURL = toDataURLOverride;
}