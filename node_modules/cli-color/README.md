[![Build status][build-image]][build-url]
[![Tests coverage][cov-image]][cov-url]
[![npm version][npm-image]][npm-url]

# cli-color

## Yet another colors and formatting for the console solution

Colors, formatting and other goodies for the console. This package won't mess with built-ins and provides neat way to predefine formatting patterns, see below.

## Installation

    $ npm install cli-color

## Usage

Usage:

```javascript
var clc = require("cli-color");
```

Output colored text:

```javascript
console.log(clc.red("Text in red"));
```

Styles can be mixed:

```javascript
console.log(clc.red.bgWhite.underline("Underlined red text on white background."));
```

Styled text can be mixed with unstyled:

```javascript
console.log(clc.red("red") + " plain " + clc.blue("blue"));
```

Styled text can be nested:

```javascript
console.log(clc.red("red " + clc.blue("blue") + " red"));
```

**Best way is to predefine needed stylings and then use it**:

```javascript
var error = clc.red.bold;
var warn = clc.yellow;
var notice = clc.blue;

console.log(error("Error!"));
console.log(warn("Warning"));
console.log(notice("Notice"));
```

_Note: No colors or styles are output when [`NO_COLOR` env var](https://no-color.org/) is set_

Supported are all ANSI colors and styles:

#### Styles

Styles will display correctly if font used in your console supports them.

- bold
- italic
- underline
- blink
- inverse
- strike

#### Colors

<table>
  <thead><th>Foreground</th><th>Background</th><th></th></thead>
  <tbody>
    <tr><td>black</td><td>bgBlack</td><td><img src="http://medyk.org/colors/000000.png" width="30" height="30" /></td></tr>
    <tr><td>red</td><td>bgRed</td><td><img src="http://medyk.org/colors/800000.png" width="30" height="30" /></td></tr>
    <tr><td>green</td><td>bgGreen</td><td><img src="http://medyk.org/colors/008000.png" width="30" height="30" /></td></tr>
    <tr><td>yellow</td><td>bgYellow</td><td><img src="http://medyk.org/colors/808000.png" width="30" height="30" /></td></tr>
    <tr><td>blue</td><td>bgBlue</td><td><img src="http://medyk.org/colors/000080.png" width="30" height="30" /></td></tr>
    <tr><td>magenta</td><td>bgMagenta</td><td><img src="http://medyk.org/colors/800080.png" width="30" height="30" /></td></tr>
    <tr><td>cyan</td><td>bgCyan</td><td><img src="http://medyk.org/colors/008080.png" width="30" height="30" /></td></tr>
    <tr><td>white</td><td>bgWhite</td><td><img src="http://medyk.org/colors/c0c0c0.png" width="30" height="30" /></td></tr>
  </tbody>
</table>

##### Bright variants

<table>
  <thead><th>Foreground</th><th>Background</th><th></th></thead>
  <tbody>
    <tr><td>blackBright</td><td>bgBlackBright</td><td><img src="http://medyk.org/colors/808080.png" width="30" height="30" /></td></tr>
    <tr><td>redBright</td><td>bgRedBright</td><td><img src="http://medyk.org/colors/ff0000.png" width="30" height="30" /></td></tr>
    <tr><td>greenBright</td><td>bgGreenBright</td><td><img src="http://medyk.org/colors/00ff00.png" width="30" height="30" /></td></tr>
    <tr><td>yellowBright</td><td>bgYellowBright</td><td><img src="http://medyk.org/colors/ffff00.png" width="30" height="30" /></td></tr>
    <tr><td>blueBright</td><td>bgBlueBright</td><td><img src="http://medyk.org/colors/0000ff.png" width="30" height="30" /></td></tr>
    <tr><td>magentaBright</td><td>bgMagentaBright</td><td><img src="http://medyk.org/colors/ff00ff.png" width="30" height="30" /></td></tr>
    <tr><td>cyanBright</td><td>bgCyanBright</td><td><img src="http://medyk.org/colors/00ffff.png" width="30" height="30" /></td></tr>
    <tr><td>whiteBright</td><td>bgWhiteBright</td><td><img src="http://medyk.org/colors/ffffff.png" width="30" height="30" /></td></tr>
  </tbody>
</table>

##### xTerm colors (256 colors table)

**Not supported on Windows and some terminals**. However if used in not supported environment, the closest color from basic (16 colors) palette is chosen.

Usage:

```javascript
var msg = clc.xterm(202).bgXterm(236);
console.log(msg("Orange text on dark gray background"));
```

Color table:

<img width="634" alt="Screenshot 2022-07-04 at 12 28 18" src="https://user-images.githubusercontent.com/122434/177136739-64a4bdd1-a1f5-453e-a7a0-55107bbd7922.png">

#### Reset

Terminal can be cleared with `clc.reset`

```javascript
process.stdout.write(clc.reset);
```

#### Erase

##### clc.erase.screen

Entire screen

```javascript
process.stdout.write(clc.erase.screen);
```

##### clc.erase.screenLeft

Left portion of a screen

```javascript
process.stdout.write(clc.erase.screenLeft);
```

##### clc.erase.screenRight

Right portion of a screen

```javascript
process.stdout.write(clc.erase.screenRight);
```

##### clc.erase.line

Current line

```javascript
process.stdout.write(clc.erase.line);
```

##### clc.erase.lineRight

Right portion of current line

```javascript
process.stdout.write(clc.erase.lineRight);
```

##### clc.erase.lineLeft

Left portion of current line

```javascript
process.stdout.write(clc.erase.lineLeft);
```

#### Move around functions

##### clc.move(x, y)

Move cursor _x_ columns and _y_ rows away. Values can be positive or negative, e.g.:

```javascript
process.stdout.write(clc.move(-2, -2)); // Move cursors two columns and two rows back
```

##### clc.move.to(x, y)

Absolute move. Sets cursor position at _x_ column and _y_ row

```javascript
process.stdout.write(clc.move.to(0, 0)); // Move cursor to first row and first column in terminal window
```

##### clc.move.up(n)

Move cursor up _n_ rows

```javascript
process.stdout.write(clc.move.up(2));
```

##### clc.move.down(n)

Move cursor down _n_ rows

```javascript
process.stdout.write(clc.move.down(2));
```

##### clc.move.right(n)

Move cursor right _n_ columns

```javascript
process.stdout.write(clc.move.right(2));
```

##### clc.move.left(n)

Move cursor left _n_ columns

```javascript
process.stdout.write(clc.move.left(2));
```

##### clc.move.lines(n)

Move cursor `n` lines forward if `n` is positive, otherwise `n` lines backward, and place it at line beginning

```javascript
process.stdout.write(clc.move.lines(2));
```

##### clc.move.top

Move cursor to top of a screen

```javascript
process.stdout.write(clc.move.top);
```

##### clc.move.bottom

Move cursor to bottom of a screen

```javascript
process.stdout.write(clc.move.bottom);
```

##### clc.move.lineBegin

Move cursor to begin of a line

```javascript
process.stdout.write(clc.move.lineBegin);
```

##### clc.move.lineEnd

Move cursor to end of a line

```javascript
process.stdout.write(clc.move.lineEnd);
```

#### Terminal characteristics

##### clc.windowSize.width

Returns terminal width

##### clc.windowSize.height

Returns terminal height

### Additional functionalities

#### clc.slice(str[, begin[, end]])

Slice provided string with preservation of eventual ANSI formatting

```javascript
var clc = require("cli-color");

var str = clc.bold("foo") + "bar" + clc.red("elo");
var sliced = clc.slice(str, 1, 7); // Same as: clc.bold('oo') + 'bar' + clc.red('e')
```

#### clc.strip(formatedText)

Strips ANSI formatted string to plain text

```javascript
var ansiStrip = require("cli-color/strip");

var plain = ansiStrip(formatted);
```

#### clc.getStrippedLength(str)

Get actual length of ANSI-formatted string

```javascript
var clc = require("cli-color");

var str = clc.bold("foo") + "bar" + clc.red("elo");
clc.getStrippedLength(str); // 9
```

#### clc.art(text, styleConf)

Create a text-graphical art. Within `styleConf`, string replacements needs to be defined, which are then used to convert `text` to styled graphical text.

```javascript
var text = ".........\n" + ". Hello .\n" + ".........\n";
var style = { ".": clc.yellowBright("X") };

process.stdout.write(clc.art(text, style));
```

#### clc.columns(data[, options])

Outputs aligned table of columns.

`data` is expected to be an array (or other iterable structure) of rows, where each row is also an array (or other iterable structure) of content to display.

Supported `options`:

- `sep`: Custom colums separator (defaults to `|`)
- `columns`: Per column customizations, as e.g. `[{ align: 'right' }, null, { align: 'left' }]`:
  - `align`: Possible options: `'left'`, `'right` (efaults to `'left'`)

```javascript
var clc = require("cli-color");

process.stdout.write(
  clc.columns([
    [clc.bold("First Name"), clc.bold("Last Name"), clc.bold("Age")],
    ["John", "Doe", 34],
    ["Martha", "Smith", 20],
    ["Jan", "Kowalski", 30]
  ])
);

/* Outputs:

First Name | Last Name | Age
John       | Doe       | 34
Martha     | Smith     | 20
Jan        | Kowalski  | 30
*/
```

##### throbber(write, interval[, format])

Writes throbber string to _write_ function at given _interval_. Optionally throbber output can be formatted with given _format_ function

```javascript
var setupThrobber = require("cli-color/throbber");

var throbber = setupThrobber(function (str) { process.stdout.write(str); }, 200);

throbber.start();

// at any time you can stop/start throbber
throbber.stop();
```

## Tests

    $ npm test

## Security contact information

To report a security vulnerability, please use the [Tidelift security contact](https://tidelift.com/security). Tidelift will coordinate the fix and disclosure.

## Contributors

- [@rentalhost](https://github.com/rentalhost) (David Rodrigues)
  - Help with support for nested styles. Introduction of `clc.art` module, and significant improvements to tests coverage
- [@StreetStrider](https://github.com/StreetStrider)
  - Implementation of sophistcated `clc.slice` functionality, and introduction of `clc.getStrippedLength` utility

[nix-build-image]: https://semaphoreci.com/api/v1/medikoo-org/cli-color/branches/master/shields_badge.svg
[nix-build-url]: https://semaphoreci.com/medikoo-org/cli-color
[win-build-image]: https://ci.appveyor.com/api/projects/status/mnd4catkeu181ll5?svg=true
[win-build-url]: https://ci.appveyor.com/project/medikoo/cli-color
[transpilation-image]: https://img.shields.io/badge/transpilation-free-brightgreen.svg
[npm-image]: https://img.shields.io/npm/v/cli-color.svg
[npm-url]: https://www.npmjs.com/package/cli-color

---

<div align="center">
	<b>
		<a href="https://tidelift.com/subscription/pkg/npm-cli-color?utm_source=npm-cli-color&utm_medium=referral&utm_campaign=readme">Get professional support for cli-color with a Tidelift subscription</a>
	</b>
	<br>
	<sub>
		Tidelift helps make open source sustainable for maintainers while giving companies<br>assurances about security, maintenance, and licensing for their dependencies.
	</sub>
</div>

[build-image]: https://github.com/medikoo/cli-color/workflows/Integrate/badge.svg
[build-url]: https://github.com/medikoo/cli-color/actions?query=workflow%3AIntegrate
[cov-image]: https://img.shields.io/codecov/c/github/medikoo/cli-color.svg
[cov-url]: https://codecov.io/gh/medikoo/cli-color
[npm-image]: https://img.shields.io/npm/v/cli-color.svg
[npm-url]: https://www.npmjs.com/package/cli-color
