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

var escaped = /[\\\"\x00-\x1F]/g;
var escapes = {};
for (var i = 0; i < 0x20; ++i) {
    escapes[String.fromCharCode(i)] = (
        '\\U' + ('0000' + i.toString(16)).slice(-4).toUpperCase()
    );
}
escapes['\b'] = '\\b';
escapes['\t'] = '\\t';
escapes['\n'] = '\\n';
escapes['\f'] = '\\f';
escapes['\r'] = '\\r';
escapes['\"'] = '\\\"';
escapes['\\'] = '\\\\';

function escapeString(value) {
    escaped.lastIndex = 0;
    return value.replace(escaped, function(c) { return escapes[c]; });
}

function stringify(value) {
    switch (typeof value) {
        case 'string':
            return '"' + escapeString(value) + '"';
        case 'number':
            return isFinite(value) ? value : 'null';
        case 'boolean':
            return value;
        case 'object':
            if (value === null) {
                return 'null';
            }
            if (Array.isArray(value)) {
                return stringifyArray(value);
            }
            return stringifyObject(value);
        default:
            throw new Error('Cannot stringify: ' + typeof value);
    }
}

function stringifyArray(array) {
    var sep = '[';
    var result = '';
    for (var i = 0; i < array.length; ++i) {
        result += sep;
        sep = ',';
        result += stringify(array[i]);
    }
    if (sep != ',') {
        return '[]';
    } else {
        return result + ']';
    }
}

function stringifyObject(object) {
    var sep = '{';
    var result = '';
    var keys = Object.keys(object);
    keys.sort();
    for (var i = 0; i < keys.length; ++i) {
        var key = keys[i];
        result += sep + '"' + escapeString(key) + '":';
        sep = ',';
        result += stringify(object[key]);
    }
    if (sep != ',') {
        return '{}';
    } else {
        return result + '}';
    }
}

/** */
module.exports = {stringify: stringify};
