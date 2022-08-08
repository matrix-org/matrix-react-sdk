# date-names

Repository of localized month and day names. Usable in Node.js or in the browser.


## Installation

Install via npm:

```bash
% npm install date-names
```

## Usage

The default locale is `en` (English). Thus, a `require('date-names')` implicitly does `require('date-names/en')`.

```js
var names = require('date-names');

names.months              // => ['January', 'February', 'March', ...]
names.abbreviated_months  // => ['Jan', 'Feb', 'Mar', 'Apr', ...]

names.days                // => ['Sunday', 'Monday', 'Tuesday', ...]
names.abbreviated_days    // => ['Sun', 'Mon', 'Tue', 'Wed', ...]

names.am                  // => 'AM'
names.pm                  // => 'PM'
```

You can fetch a different translation by requiring a specific locale:

```js
var names = require('date-names/de');

names.months              // => ['Januar', 'Februar', 'März', ...]
names.abbreviated_months  // => ['Jan', 'Feb', 'Mär', 'Apr', ...]

names.days                // => ['Sonntag', 'Montag', 'Dienstag', ...]
names.abbreviated_days    // => ['So', 'Mo', 'Di', 'Mi', ...]

names.am                  // => 'vormittags'
names.pm                  // => 'nachmittags'
```

Brazilian Portuguese ([pt-br](pt-br.js)), Czech ([cs](cs.js)), Danish ([da](da.js)), Dutch ([nl](nl.js)), English ([en](en.js)), Finnish ([fi](fi.js)), French ([fr](fr.js)), German ([de](de.js)), Spanish ([es](es.js)), Russian ([ru](ru.js)), Slovak ([sk](sk.js)), Swedish ([sv](sv.js)) and Turkish ([tr](tr.js)) are currently the only supported locales. Pull requests welcome.


## Contributing

Here's a quick guide:

1. Fork the repo and `make install`.
2. Run the tests. We only take pull requests with passing tests, and it's great to know that you have a clean slate: `make test`.
3. Add a test for your change. Only refactoring and documentation changes require no new tests. If you are adding functionality or are fixing a bug, we need a test!
4. Make the test pass.
5. Push to your fork and submit a pull request.


## Licence

Released under The MIT License.
