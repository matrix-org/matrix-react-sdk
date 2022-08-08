/*
 * tar-js
 * MIT (c) 2011 T. Jameson Little
 */

(function () {
	"use strict";

	var lookup = [
			'A', 'B', 'C', 'D', 'E', 'F', 'G', 'H',
			'I', 'J', 'K', 'L', 'M', 'N', 'O', 'P',
			'Q', 'R', 'S', 'T', 'U', 'V', 'W', 'X',
			'Y', 'Z', 'a', 'b', 'c', 'd', 'e', 'f',
			'g', 'h', 'i', 'j', 'k', 'l', 'm', 'n',
			'o', 'p', 'q', 'r', 's', 't', 'u', 'v',
			'w', 'x', 'y', 'z', '0', '1', '2', '3',
			'4', '5', '6', '7', '8', '9', '+', '/'
		];
	function clean(length) {
		var i, buffer = new Uint8Array(length);
		for (i = 0; i < length; i += 1) {
			buffer[i] = 0;
		}
		return buffer;
	}

	function extend(orig, length, addLength, multipleOf) {
		var newSize = length + addLength,
			buffer = clean((parseInt(newSize / multipleOf) + 1) * multipleOf);

		buffer.set(orig);

		return buffer;
	}

	function pad(num, bytes, base) {
		num = num.toString(base || 8);
		return "000000000000".substr(num.length + 12 - bytes) + num;
	}	
	
	function stringToUint8 (input, out, offset) {
		var i, length;

		out = out || clean(input.length);

		offset = offset || 0;
		for (i = 0, length = input.length; i < length; i += 1) {
			out[offset] = input.charCodeAt(i);
			offset += 1;
		}

		return out;
	}

	function uint8ToBase64(uint8) {
		var i,
			extraBytes = uint8.length % 3, // if we have 1 byte left, pad 2 bytes
			output = "",
			temp, length;

		function tripletToBase64 (num) {
			return lookup[num >> 18 & 0x3F] + lookup[num >> 12 & 0x3F] + lookup[num >> 6 & 0x3F] + lookup[num & 0x3F];
		};

		// go through the array every three bytes, we'll deal with trailing stuff later
		for (i = 0, length = uint8.length - extraBytes; i < length; i += 3) {
			temp = (uint8[i] << 16) + (uint8[i + 1] << 8) + (uint8[i + 2]);
			output += tripletToBase64(temp);
		}

		// this prevents an ERR_INVALID_URL in Chrome (Firefox okay)
		switch (output.length % 4) {
			case 1:
				output += '=';
				break;
			case 2:
				output += '==';
				break;
			default:
				break;
		}

		return output;
	}

	function base64ToUint8(input) {
		var base64 = input.match(/^([^=]+)/)[1],
			extraBytes = input.match(/(=*)$/)[1].length,
			i = 0, length = base64.length, temp, offset = 0,
			ret = clean(base64.length * .75 + extraBytes);

		while (i < length) {
			temp = 0;

			temp |= lookup.indexOf(base64.charAt(i) || 'A') << 18;
			i += 1;
			temp |= lookup.indexOf(base64.charAt(i) || 'A') << 12;
			i += 1;
			temp |= lookup.indexOf(base64.charAt(i) || 'A') << 6;
			i += 1;
			temp |= lookup.indexOf(base64.charAt(i) || 'A');
			i += 1;

			ret[offset] = temp >> 16 & 0xFF;
			offset += 1;
			ret[offset] = temp >> 8 & 0xFF;
			offset += 1;
			ret[offset] = temp & 0xFF;
			offset += 1;
		}

		return ret;
	}

	module.exports.clean = clean;
	module.exports.pad = pad;
	module.exports.extend = extend;
	module.exports.stringToUint8 = stringToUint8;
	module.exports.uint8ToBase64 = uint8ToBase64;
	module.exports.base64ToUint8 = base64ToUint8;
}());
