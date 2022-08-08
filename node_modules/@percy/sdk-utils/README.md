# @percy/sdk-utils

Common JavaScript SDK utils

- [Usage](#usage)
  - [`logger()`](#loggerdebug)
  - [`percy`](#percy)
  - [`isPercyEnabled()`](#ispercyenabled)
  - [`postSnapshot()`](#postsnapshot)
  - [`request`](#requesturl-options)

## Usage

### `logger([debug])`

This function is a direct export of [`@percy/logger`](./packages/logger).

### `percy`

This object contains information about the local Percy environment and is updated when
[`isPercyEnabled`](#ispercyenabled) is called for the first time.

``` js
import { percy } from '@percy/sdk-utils'

// reflects/updates process.env.PERCY_SERVER_ADDRESS
percy.address === 'http://localhost:5338'

// updated after isPercyEnabled() is called
percy.enabled === true|false
percy.version.major === 1
percy.version.minor === 2
percy.version.patch === 3
percy.version.toString() === '1.2.3'
percy.config === {} // .percy.yml config

// updated after fetchPercyDOM() is called
percy.domScript === fs.readFile(require.resolve('@percy/dom'))
```

### `isPercyEnabled()`

Returns `true` or `false` if the Percy CLI API server is running. Calls the server's `/healthcheck`
endpoint and populates information for the [`percy`](#percy) property. The result of this function
is cached and subsequent calls will return the first cached result. If the healthcheck fails, will
log a message unless the CLI loglevel is `quiet` or `silent`. Upon a successful health check, a
remote logging connection is also established.

``` js
import { isPercyEnabled } from '@percy/sdk-utils'

// CLI API not running
await isPercyEnabled() === false
// [percy] Percy is not running, disabling snapshots

// CLI API is running
await isPercyEnabled() === true
```

### `fetchPercyDOM()`

Fetches and returns the `@percy/dom` serialization script hosted by the local Percy API server. The
resulting string can be evaulated within a browser context to add the `PercyDOM.serialize` function
to the global scope. Subsequent calls return the first cached result.

``` js
import { fetchPercyDOM } from '@percy/sdk-utils'

let script = await fetchPercyDOM()

// selenium-webdriver
driver.executeScript(script)
// webdriverio
browser.execute(script)
// puppeteer
page.evaluate(script)
// protractor
browser.executeScript(script)
// etc...
```

### `postSnapshot(options)`

Posts snapshot options to the local Percy API server.

``` js
import { postSnapshot } from '@percy/sdk-utils'

await postSnapshot({
  // required
  name: 'Snapshot Name',
  url: 'http://localhost:8000/',
  domSnapshot: 'result from PercyDOM.serialize()'
  // optional
  environmentInfo: ['<lib>/<version>', '<lang>/<version>'],
  clientInfo: '<sdk>/<version>',
  widths: [475, 1280],
  minHeight: 1024,
  enableJavaScript: false,
  requestHeaders: {}
})
```

### `request(url[, options])`

Sends a request to the local Percy API server. Used internally by the other SDK utils.

``` js
import { request } from '@percy/sdk-utils'

await request('/percy/idle')
await request('/percy/stop')
```

#### `request.fetch(url, options)`

The underlying implementation of the `request()` util. For Node environments, `http.request` is
used; for browser environments, `window.fetch` is used. Can be overridden by the SDK's framework to
work around CORS/CSP issues.

The returned object must contain the following normalized properties from the request response:
`status`, `statusText`, `headers`, `body`

``` js
import { request } from '@percy/sdk-utils'

// Cypress SDK example
request.fetch = async function fetch(url, options) {
  options = { url, retryOnNetworkFailure: false, ...options }
  return Cypress.backend('http:request', options)
}
```
