"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = void 0;

function _defineProperty(obj, key, value) { if (key in obj) { Object.defineProperty(obj, key, { value: value, enumerable: true, configurable: true, writable: true }); } else { obj[key] = value; } return obj; }

class ImageBitmap {
  constructor(width, height) {
    _defineProperty(this, "width", 0);

    _defineProperty(this, "height", 0);

    _defineProperty(this, "_closed", false);

    this.width = width;
    this.height = height;
    this.close = jest.fn(this.close.bind(this));
  }

  close() {
    this.width = 0;
    this.height = 0;
    this._closed = true;
  }

}

exports.default = ImageBitmap;