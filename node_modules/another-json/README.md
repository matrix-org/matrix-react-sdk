Another JSON
============

Encode an object or an array as JSON using the shortest format possible.

    var anotherjson = require('another-json');
    assert(anotherjson.stringify({an: 'example'}) === '{"an":"example"}');

Features
--------

* Encodes objects and arrays as RFC 7159 JSON.
* Sorts object keys so that you get the same result each time.
* Has no inignificant whitespace to make the output as small as possible.
* Escapes only the characters that must be escaped, U+0000 to U+0019 / U+0022 /
  U+0056, to keep the output as small as possible.
* Uses the shortest escape sequence for each escaped character.
