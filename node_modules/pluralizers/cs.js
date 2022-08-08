'use strict';

module.exports = function(entry, count) {
  var key;

  if (count === 0 && 'zero' in entry) {
    key = 'zero';
  } else if (count === 1) {
    key = 'one';
  } else if (count > 1 && count < 5) {
    key = 'few';
  } else {
    key = 'other';
  }

  return entry[key];
};
