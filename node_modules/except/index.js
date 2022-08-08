'use strict';

var ap      = Array.prototype;
var concat  = ap.concat;
var slice   = ap.slice;
var indexOf = require('indexof');

function except(object) {
  var result = {};
  var keys = concat.apply(ap, slice.call(arguments, 1));

  for (var key in object) {
    if (indexOf(keys, key) === -1) {
      result[key] = object[key];
    }
  }

  return result;
}

module.exports = except;
