# @percy/logger

Common logger used throughout the Percy CLI and SDKs.

- [Usage](#usage)
  - [`logger()`](#loggerdebug)
  - [`logger.loglevel()`](#loggerloglevel)
  - [`logger.format()`](#loggerformat)
  - [`logger.query()`](#loggerquery)

## Usage

``` js
import logger from '@percy/logger'

const log = logger('foobar')

log.info('info message')
log.error('error message')
log.warn('warning message')
log.debug('debug message')
log.deprecated('deprecation message')
```

### `logger([debug])`

Creates a group of logging functions that will be associated with the provided `debug` label. When
debug logging is enabled, this label is printed with the `[percy:*]` label and can be filtered via
the `PERCY_DEBUG` environment variable.

``` js
PERCY_DEBUG="one:*,*:a,-*:b"

logger.loglevel('debug')

logger('one').debug('test')
logger('one:a').debug('test')
logger('one:b').debug('test')
logger('one:c').debug('test')
logger('two').debug('test')
logger('two:a').debug('test')

// only logs from the matching debug string are printed
//=> [percy:one] test
//=> [percy:one:a] test
//=> [percy:one:c] test
//=> [percy:two:a] test
```

### `logger.loglevel([level][, flags])`

Sets or retrieves the log level of the shared logger. If the second argument is provided, `level` is
treated as a fallback when all logging flags are `false`. When no arguments are provided, the method
will return the current log level of the shared logger.

``` js
logger.loglevel('info', { verbose: true })
logger.loglevel() === 'debug'

logger.loglevel('info', { quiet: true })
logger.loglevel() === 'warn'

logger.loglevel('info', { silent: true })
logget.loglevel() === 'silent'

logger.loglevel('info')
logger.loglevel() === 'info'
```

### `logger.format(message, debug[, level])`

Returns a formatted `message` depending on the provided level and logger's own log level. When
debugging, the `debug` label is added to the prepended `[percy:*]` label.

``` js
logger.format('foobar', 'test')
//=> [percy] foobar

logger.loglevel('debug')
logger.format('foobar', 'test', warn')
//=> [percy:test] foobar (yellow for warnings)
```

### `logger.query(filter)`

Returns an array of logs matching the provided filter function.

``` js
let logs = logger.query(log => {
  return log.level === 'debug' &&
    log.message.match(/foobar/)
})
```
