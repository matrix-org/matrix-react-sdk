/* eslint-disable no-misleading-character-class */

// http://www.fileformat.info/info/unicode/block/index.htm
const ranges = [
	// Chinese
	/[\d+_\u4E00-\u9FFF-]/,
	// Japanese
	/[\d+_\u3000-\u30FF-]/,
	// Korean
	/[\d+_\u1100-\u11FF\u3130-\u318F\uA960-\uA97F\uAC00-\uD7FF-]/,
	// Thai
	/[\d+_\u0E00-\u0E7F-]/,
	// Russian, Ukrainian
	/[\d+_a-z\u0400-\u052F\u1C80-\u1C8F\u2DE0-\u2DFF\uA640-\uA69F-]/,
	// Latin based
	/[\d+_a-z\u0080-\u00FF\u0100-\u017F\u0180-\u024F-]/,
];

module.exports = new RegExp(`:(${ranges.map((range) => range.source).join('|')})+:`, 'i');
