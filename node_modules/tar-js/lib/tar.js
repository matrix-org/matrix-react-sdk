/*
 * tar-js
 * MIT (c) 2011 T. Jameson Little
 */

(function () {
	"use strict";

	var header = require("./header"),
		utils = require("./utils"),
		recordSize = 512,
		blockSize;
	
	function Tar(recordsPerBlock) {
		this.written = 0;
		blockSize = (recordsPerBlock || 20) * recordSize;
		this.out = utils.clean(blockSize);
	}

	Tar.prototype.append = function (filepath, input, opts, callback) {
		var data,
			checksum,
			mode,
			mtime,
			uid,
			gid,
			headerArr;

		if (typeof input === 'string') {
			input = utils.stringToUint8(input);
		} else if (input.constructor !== Uint8Array.prototype.constructor) {
			throw 'Invalid input type. You gave me: ' + input.constructor.toString().match(/function\s*([$A-Za-z_][0-9A-Za-z_]*)\s*\(/)[1];
		}

		if (typeof opts === 'function') {
			callback = opts;
			opts = {};
		}

		opts = opts || {};

		mode = opts.mode || parseInt('777', 8) & 0xfff;
		mtime = opts.mtime || Math.floor(+new Date() / 1000);
		uid = opts.uid || 0;
		gid = opts.gid || 0;

		data = {
			fileName: filepath,
			fileMode: utils.pad(mode, 7),
			uid: utils.pad(uid, 7),
			gid: utils.pad(gid, 7),
			fileSize: utils.pad(input.length, 11),
			mtime: utils.pad(mtime, 11),
			checksum: '        ',
			type: '0', // just a file
			ustar: 'ustar  ',
			owner: opts.owner || '',
			group: opts.group || ''
		};

		// calculate the checksum
		checksum = 0;
		Object.keys(data).forEach(function (key) {
			var i, value = data[key], length;

			for (i = 0, length = value.length; i < length; i += 1) {
				checksum += value.charCodeAt(i);
			}
		});

		data.checksum = utils.pad(checksum, 6) + "\u0000 ";

		headerArr = header.format(data);

		var i, offset, length;

		this.out.set(headerArr, this.written);

		this.written += headerArr.length;

		// If there is not enough space in this.out, we need to expand it to
		// fit the new input.
		if (this.written + input.length > this.out.length) {
			this.out = utils.extend(this.out, this.written, input.length, blockSize);
		}

		this.out.set(input, this.written);

		// to the nearest multiple of recordSize
		this.written += input.length + (recordSize - (input.length % recordSize || recordSize));

		// make sure there's at least 2 empty records worth of extra space
		if (this.out.length - this.written < recordSize * 2) {
			this.out = utils.extend(this.out, this.written, recordSize * 2, blockSize);
		}

		if (typeof callback === 'function') {
			callback(this.out);
		}

		return this.out;
	};

	Tar.prototype.clear = function () {
		this.written = 0;
		this.out = utils.clean(blockSize);
	};

  Tar.utils = utils;

	Tar.stringToUint8 = utils.stringToUint8;
	Tar.uint8ToBase64 = utils.uint8ToBase64;
  Tar.base64ToUint8 = utils.base64ToUint8;
	
	module.exports = Tar;
}());
