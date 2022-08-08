'use strict';

module.exports = function(entry, count) {
  var key;

  if (count === 0 && 'zero' in entry) {
    key = 'zero';
  }

  key = key || (count === 1 ? 'one' : 'other');

  return entry[key];
};
