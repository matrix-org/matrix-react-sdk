# except

A utility function that returns a copy of the object given as first argument but without the keys provided as the other argument(s).


## Installation

Install via npm:

```bash
% npm install except
```


## Usage

Just require and call:

```js
var except = require('except');
var myobj  = { foo: true, bar: 1, baz: 'yes' };

except(myobj, 'foo')             // => { bar: 1, baz: 'yes' }
except(myobj, 'foo', 'baz')      // => { bar: 1 }
except(myobj, ['foo', 'bar'])    // => { baz: 'yes' }
```


## Contributing

Here's a quick guide:

1. Fork the repo and `make install`.

2. Run the tests. We only take pull requests with passing tests, and it's great to know that you have a clean slate: `make test`.

3. Add a test for your change. Only refactoring and documentation changes require no new tests. If you are adding functionality or are fixing a bug, we need a test!

4. Make the test pass.

5. Push to your fork and submit a pull request.


## Licence

Released under The MIT License.
