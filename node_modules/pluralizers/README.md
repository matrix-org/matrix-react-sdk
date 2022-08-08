# pluralizers

Repository of localized pluralization functions. Usable in Node.js or in the browser.


## Installation

Install via npm:

```bash
% npm install pluralizers
```

## Usage

The default locale is `en` (English). Thus, a `require('pluralizers')` implicitly does `require('pluralizers/en')`.

```js
var sprintf   = require('sprintf').sprintf;
var pluralize = require('pluralizers');

var entry = { zero: 'no items', one: 'one item', other: '%(count)s items' };

pluralize(entry, 0)   // => 'no items'
pluralize(entry, 1)   // => 'one item'
pluralize(entry, 2)   // => '%(count)s items'

sprintf(pluralize(entry, 42), { count: 42 })   // => '42 items'
```

You can fetch a different localization by requiring a specific locale:

```js
var pluralize = require('pluralizers/de');
```

English ([en](en.js)), Dutch ([nl](nl.js)), German ([de](de.js)), Brazilian Portuguese ([pt-br](pt-br.js)), Russian ([ru](ru.js)) and Spanish ([es](es.js)) are currently the only supported locales. Pull requests welcome.


## Contributing

Here's a quick guide:

1. Fork the repo and `make install`.

2. Run the tests. We only take pull requests with passing tests, and it's great to know that you have a clean slate: `make test`.

3. Add a test for your change. Only refactoring and documentation changes require no new tests. If you are adding functionality or are fixing a bug, we need a test!

4. Make the test pass.

5. Push to your fork and submit a pull request.


## Licence

Released under The MIT License.
