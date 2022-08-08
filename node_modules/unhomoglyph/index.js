'use strict';


var data = require('./data.json');

function escapeRegexp(str) {
  return str.replace(/([.?*+^$[\]\\(){}|-])/g, '\\$1');
}

var REPLACE_RE = RegExp(Object.keys(data).map(escapeRegexp).join('|'), 'g');

function replace_fn(match) {
  return data[match];
}

function unhomoglyph(str) {
  return str.replace(REPLACE_RE, replace_fn);
}

module.exports = unhomoglyph;
