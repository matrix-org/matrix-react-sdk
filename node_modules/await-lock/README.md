# AwaitLock ![tests](https://github.com/ide/await-lock/workflows/Tests/badge.svg) [![codecov](https://codecov.io/gh/ide/await-lock/branch/master/graph/badge.svg)](https://codecov.io/gh/ide/await-lock)
Mutex locks for async functions

[![npm package](https://nodei.co/npm/await-lock.png?downloads=true&downloadRank=true&stars=true)](https://nodei.co/npm/await-lock/)

# Usage

```javascript
import AwaitLock from 'await-lock';

let lock = new AwaitLock();

async function runSerialTaskAsync() {
  await lock.acquireAsync();
  try {
    // IMPORTANT: Do not return a promise from here because the finally clause
    // may run before the promise settles, and the catch clause will not run if
    // the promise is rejected
  } finally {
    lock.release();
  }
}
```

You can also use AwaitLock with [co](https://github.com/tj/co) and generator functions.

```javascript
import AwaitLock from 'await-lock';

let runSerialTaskAsync = co.wrap(function*() {
  yield lock.acquireAsync();
  try {
    // Run async code in the critical section
  } finally {
    lock.release();
  }
});
```
