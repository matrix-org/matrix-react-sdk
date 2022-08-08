# unhomoglyph

[![Build Status](https://img.shields.io/travis/nodeca/unhomoglyph/master.svg?style=flat)](https://travis-ci.org/nodeca/unhomoglyph)
[![NPM version](https://img.shields.io/npm/v/unhomoglyph.svg?style=flat)](https://www.npmjs.org/package/unhomoglyph)

> Replace all homoglyphs with base characters. Useful to detect similar strings.
For example, to prohibit register similar looking nicknames at websites.

Data source - [Recommended confusable mapping for IDN](http://www.unicode.org/Public/security/latest/confusables.txt), v13.0.0.

__Note!__ Text after transform is NOT intended be read by humans. For example,
`m` will be transformed to `r` + `n`. Goal is to compare 2 strings after
transform, to check if sources looks similar or not. If sources look similar,
then transformed strings are equal.


## Install

```bash
npm install unhomoglyph --save
```


## Example

```js
const unhomoglyph = require('unhomoglyph');

console.log(unhomoglyph('AΑАᎪᗅᴀꓮ')); // => AAAAAAA
console.log(unhomoglyph('m'));        // => rn (r + n)

//
// Compare nicknames
//

const username1 = 'm';
const username2 = 'rn';

if (unhomoglyph(username1) === unhomoglyph(username2)) {
  console.log(`"${username1}" and "${username2} look similar`);
}
```


## Update

```bash
npm run update
```


## License

[MIT](https://github.com/nodeca/unhomoglyph/blob/master/LICENSE)
