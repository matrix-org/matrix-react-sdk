'use strict';

module.exports = function(entry, count) {
  var key;

  var m10 = count % 10;
  var m100 = count % 100;

  if (count === 0 && 'zero' in entry) {
    key = 'zero';
  } else if (m10 === 1 && m100 !== 11) {
    key = 'one';
  } else if ([2, 3, 4].indexOf(m10) >= 0 && [12, 13, 14].indexOf(m100) < 0) {
    key = 'few';
  } else if (m10 === 0 || [5, 6, 7, 8, 9].indexOf(m10) >= 0 || [11, 12, 13, 14].indexOf(m100) >= 0) {
    key = 'many';
  } else {
    key = 'other';
  }

  return entry[key];
};
