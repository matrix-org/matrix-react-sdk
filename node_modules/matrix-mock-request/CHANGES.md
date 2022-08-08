## 2.0.1
- Add generics to ExpectedRequest.respond
- Add more types
## 2.0.0

- Convert to typescript
## 1.2.3

 - Convert away from `Promise.defer`.
 - Pass the whole request object to response handlers.

## 1.2.2

 - Add stop() method returning a promise that resolves when all
   flushes are complete.

## 1.2.1

 - Bump default timeout on `flushAllExpected` to 1000ms.
 
## 1.2.0

 - Allow specification of a timeout on `flushAllExpected`.

## 1.1.1

 - Give a sensible rejection from `flushAllExpected` when there are no
   expectations (previously it would throw an obscure exception).
 
## 1.1.0

 - Add `flushAllExpected`.
 - Wait for longer in `flush` when a `numToFlush` is specified.
 - Try to avoid throwing exceptions from `setTimeout` (and reject the returned
   promise instead).
 - Switch to bluebird instead of q.

## 1.0.0

 - Changes required for https://github.com/matrix-org/matrix-js-sdk/pull/479:
   js-sdk now does its own JSON encoding/parsing, so in order to keep the tests
   working we need to reverse that process.

## 0.1.3

 - Fix missing /lib in published package.
 
## 0.1.2

 - Transpile for ES5.

## 0.1.1

 - Import changes from riot-web.

## 0.1.0

 - Initial release, factored out from matrix-js-sdk.
