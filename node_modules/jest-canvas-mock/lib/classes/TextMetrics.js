"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = void 0;

function _defineProperty(obj, key, value) { if (key in obj) { Object.defineProperty(obj, key, { value: value, enumerable: true, configurable: true, writable: true }); } else { obj[key] = value; } return obj; }

class TextMetrics {
  constructor(text) {
    _defineProperty(this, "width", 0);

    _defineProperty(this, "actualBoundingBoxLeft", 0);

    _defineProperty(this, "actualBoundingBoxRight", 0);

    _defineProperty(this, "fontBoundingBoxAscent", 0);

    _defineProperty(this, "fontBoundingBoxDescent", 0);

    _defineProperty(this, "actualBoundingBoxAscent", 0);

    _defineProperty(this, "actualBoundingBoxDescent", 0);

    _defineProperty(this, "emHeightAscent", 0);

    _defineProperty(this, "emHeightDescent", 0);

    _defineProperty(this, "hangingBaseline", 0);

    _defineProperty(this, "alphabeticBaseline", 0);

    _defineProperty(this, "ideographicBaseline", 0);

    this.width = text.length;
  }

}

exports.default = TextMetrics;