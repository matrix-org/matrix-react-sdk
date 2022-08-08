(function () {
	"use strict";

	var Tar = require('tar-js'),
		tape = new Tar(),
		out,
		url,
		base64;

	function uint8ToString(buf) {
		var i, length, out = '';
		for (i = 0, length = buf.length; i < length; i += 1) {
			out += String.fromCharCode(buf[i]);
		}

		return out;
	}

	function stringToUint8 (input) {
		var out = new Uint8Array(input.length), i;

		for (i = 0; i < input.length; i += 1) {
			out[i] = input.charCodeAt(i);
		}

		return out;
	}


	out = tape.append('output.txt', 'This is test1!');
	out = tape.append('dir/out.txt', 'This is test2! I changed up the directory');
	out = tape.append('arr.txt', stringToUint8('This is a Uint8Array!'));

	base64 = btoa(uint8ToString(out));

	url = "data:application/tar;base64," + base64;
	window.open(url);
}());
