/* Copyright 2015 Mark Haines
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 *  You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

'use strict';

var anotherjson = require('..');

describe('stringify(Object)', function() {
    it('sorts entries by key', function() {
        var object = {};
        object.b = 1;
        object.a = 2;
        expect(anotherjson.stringify(object)).toEqual('{"a":2,"b":1}');
    });

    it('encodes nested objects', function() {
        var object = {a: {test: 'object'}};
        expect(anotherjson.stringify(object)).toEqual(
            '{"a":{"test":"object"}}'
        );
    });

    it('encodes nested arrays', function() {
        var object = {a: []};
         expect(anotherjson.stringify(object)).toEqual(
            '{"a":[]}'
        );
    });

    it('escapes characters from strings', function() {
        var object = {a: '\x00\x01\x02\x03\x04\x05\x06\x07'};
        expect(anotherjson.stringify(object)).toEqual(
            '{"a":"\\U0000\\U0001\\U0002\\U0003\\U0004\\U0005\\U0006\\U0007"}'
        );
        object = {a: '\x08\x09\x0A\x0B\x0C\x0D\x0E\x0F'};
        expect(anotherjson.stringify(object)).toEqual(
            '{"a":"\\b\\t\\n\\U000B\\f\\r\\U000E\\U000F"}'
        );
        object = {a: '\x10\x11\x12\x13\x14\x15\x16\x17'};
        expect(anotherjson.stringify(object)).toEqual(
            '{"a":"\\U0010\\U0011\\U0012\\U0013\\U0014\\U0015\\U0016\\U0017"}'
        );
        object = {a: '\x18\x19\x1A\x1B\x1C\x1D\x1E\x1F'};
        expect(anotherjson.stringify(object)).toEqual(
            '{"a":"\\U0018\\U0019\\U001A\\U001B\\U001C\\U001D\\U001E\\U001F"}'
        );
        object = {a: '\\\"'};
        expect(anotherjson.stringify(object)).toEqual(
            '{"a":"\\\\\\\""}'
        );
    });

    it('encodes booleans and null', function() {
        var object = {true: true, false: false, null: null};
        expect(anotherjson.stringify(object)).toEqual(
            '{"false":false,"null":null,"true":true}'
        );
    });

    it('does not escape DEL', function() {
        var object = {DEL: '\x7F'};
        expect(anotherjson.stringify(object)).toEqual(
            '{"DEL":"\x7F"}'
        );
    });

    it('encodes the empty object', function() {
        expect(anotherjson.stringify({})).toEqual('{}');
    });
});

describe('stringify(Array)', function() {
    it('encodes an array', function() {
        expect(anotherjson.stringify([1, 2, 3])).toEqual('[1,2,3]');
    });

    it('encodes the empty array', function() {
        expect(anotherjson.stringify([])).toEqual('[]');
    });

    it('encodes nested arrays', function() {
        expect(anotherjson.stringify([[], [[]]])).toEqual('[[],[[]]]');
    });

    it('encodes objects nested inside arrays', function() {
        expect(anotherjson.stringify([{},{a: 'b'}])).toEqual('[{},{"a":"b"}]');
    });
});
