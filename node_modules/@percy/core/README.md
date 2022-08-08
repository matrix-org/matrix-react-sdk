# @percy/core

The core component of Percy's CLI and SDKs that handles creating builds, discovering snapshot
assets, uploading snapshots, and finalizing builds. Uses `@percy/client` for API communication, a
Chromium browser for asset discovery, and starts a local API server for posting snapshots from
other processes.

- [Usage](#usage)
  - [`#start()`](#start)
  - [`#stop()`](#stopforce)
  - [`#idle()`](#idle)
  - [`#snapshot()`](#snapshotoptions)
- [Advanced](#advanced)
  - [Download discovery browser on install](#download-discovery-browser-on-install)
  - [Skipping discovery browser download](#skipping-discovery-browser-download)

## Usage

A `Percy` class instance can manage a Percy build, take page snapshots, and perform snapshot asset
discovery. It also hosts a local API server for Percy SDKs to communicate with.

``` js
import Percy from '@percy/core'

// create a new instance
const percy = new Percy(percyOptions)

// create a new instance and start it
const percy = await Percy.start(percyOptions)
```

#### Options

- `token` — Your project's `PERCY_TOKEN` (**default** `process.env.PERCY_TOKEN`)
- `loglevel` — Logger level, one of `"info"`, `"warn"`, `"error"`, `"debug"` (**default** `"info"`)
- `server` — Controls whether an API server is created (**default** `true`)
- `port` — API server port (**default** `5338`)
- `clientInfo` — Client info sent to Percy via a user-agent string
- `environmentInfo` — Environment info also sent with the user-agent string
- `deferUploads` — Defer creating a build and uploading snapshots until later
- `skipUploads` — Skip creating a build and uploading snapshots altogether

The following options can also be defined within a Percy config file

- `snapshot` — Snapshot options applied to each snapshot
  - `widths` — Widths to take screenshots at (**default** `[375, 1280]`)
  - `minHeight` — Minimum screenshot height (**default** `1024`)
  - `percyCSS` — Percy specific CSS to inject into the snapshot
  - `enableJavaScript` — Enable JavaScript for screenshots (**default** `false`)
- `discovery` — Asset discovery options
  - `allowedHostnames` — Array of allowed hostnames to capture assets from
  - `disallowedHostnames` — Array of hostnames where requests will be aborted
  - `requestHeaders` — Request headers used when discovering snapshot assets
  - `authorization` — Basic auth `username` and `password` for protected snapshot assets
  - `disableCache` — Disable asset caching (**default** `false`)
  - `userAgent` — Custom user-agent string used when requesting assets
  - `cookies` — Browser cookies to use when requesting assets
  - `networkIdleTimeout` — Milliseconds to wait for the network to idle (**default** `100`)
  - `concurrency` — Asset discovery concerrency (**default** `5`)
  - `launchOptions` — Asset discovery browser launch options
    - `executable` — Browser executable path (**default** `process.env.PERCY_BROWSER_EXECUTABLE`)
    - `timeout` — Discovery launch timeout, in milliseconds (**default** `30000`)
    - `args` — Additional browser process arguments
    - `headless` — Runs the browser headlessy (**default** `true`)
    
Additional Percy config file options are also allowed and will override any options defined by a
local config file. These config file options are also made available to SDKs via the local API
health check endpoint.

### `#start()`

Starting a `Percy` instance will start a local API server, start the asset discovery browser, and
create a new Percy build. If an asset discovery browser is not found, one will be downloaded.

``` js
await percy.start()
// [percy] Percy has started!
```

#### API Server

Starting a `Percy` instance will start a local API server unless `server` is `false`. The server can
be found at `http://localhost:5338/` or at the provided `port` number.

- GET `/percy/healthcheck` – Responds with information about the running instance
- GET `/percy/dom.js` – Responds with the [`@percy/dom`](./packages/dom) library
- GET `/percy/idle` - Responds when the running instance is [idle](#idle)
- POST `/percy/snapshot` – Calls [`#snapshot()`](#snapshotoptions) with provided snapshot options
- POST `/percy/stop` - Remotely [stops](#stopforce) the running `Percy` instance

### `#stop([force])`

Stopping a `Percy` instance will wait for any pending snapshots, close the asset discovery browser,
close the local API server, and finalize the current Percy build. When uploads are deferred,
stopping the instance will also trigger processing of the upload queue. When `force` is `true`,
queues are cleared and closed to prevent queued snapshots from running.

``` js
await percy.stop()
// [percy] Processing 3 snapshots...
// [percy] Snapshot taken: Snapshot one
// [percy] Snapshot taken: Snapshot two
// [percy] Snapshot taken: Snapshot three
// [percy] Uploading 3 snapshots...
// [percy] Finalized build #1: https://percy.io/org/project/123

await percy.stop(true)
// [percy] Stopping percy...
// [percy] Finalized build #1: https://percy.io/org/project/123
```

### `#idle()`

This method will resolve shortly after pending snapshots and uploads have completed and no more have
started. Queued tasks are not considered pending unless they are actively running, so deferred
uploads will not be awaited on with this method.

``` js
percy.snapshot(...);
percy.snapshot(...);
percy.snapshot(...);

await percy.idle()
// [percy] Snapshot taken: ...
// [percy] Snapshot taken: ...
// [percy] Snapshot taken: ...
```

### `#snapshot(options)`

Takes one or more snapshots of a page while discovering resources to upload with the snapshot. Once
asset discovery has completed, the queued snapshot will resolve and an upload task will be queued
separately. Accepts several different syntaxes for taking snapshots in various ways.

All available syntaxes will push snapshots into the snapshot queue without the need to await on the
method directly. This method resolves after the snapshot upload is queued, but does not await on the
upload to complete.

``` js
// snapshots can be handled concurrently, no need to await
percy.snapshot({
  name: 'Snapshot 1',
  url: 'http://localhost:3000',
  domSnapshot: domSnapshot,
  clientInfo: 'my-sdk',
  environmentInfo: 'my-lib'
})

// without a domSnapshot, capture options will be used to take one
percy.snapshot({
  name: 'Snapshot 2',
  url: 'http://localhost:3000',
  waitForTimeout: 1000,
  waitForSelector: '.done-loading',
  execute: async () => {},
  additionalSnapshots: [{
    name: 'Snapshot 2.1',
    execute: () => {}
  }]
})

// alternate shorthand syntax 
percy.snapshot({
  baseUrl: 'http://localhost:3000',
  snapshots: ['/', '/about', '/contact'],
  options: {
    widths: [600, 1200]
  }
})

// gather snapshots from an external sitemap
percy.snapshot({
  sitemap: 'https://example.com/sitemap.xml',
  exclude: ['/blog/*']
})

// start a server and take static snapshots
percy.snapshot({
  serve: './public',
  cleanUrls: true,
})
```

#### Options

When capturing a single snapshot, the snapshot URL may be provided as the only argument rather than
a snapshot options object. When providing an options object, a few alternate syntaxes are available
depending on the provided properties ([see alternate syntaxes below](#alternate-syntaxes)).

**Common options** accepted for each snapshot:

- `url` — Snapshot URL (**required**)
- `name` — Snapshot name
- `domSnapshot` — Snapshot DOM string
- `discovery` - Limited snapshot specific discovery options
  - `allowedHostnames`, `disallowedHostnames`, `requestHeaders`, `authorization`, `disableCache`, `userAgent`

Common snapshot options are also accepted and will override instance snapshot options. [See instance
options](#options) for common snapshot and discovery options.

**Capture options** can only be provided when `domSnapshot` is missing:

- `waitForTimeout` — Milliseconds to wait before taking a snapshot
- `waitForSelector` — CSS selector to wait for before taking a snapshot
- `execute` — Function or function body to execute within the page before taking a snapshot
- `additionalSnapshots` — Array of additional sequential snapshots to take of the page
  - `name` — Snapshot name (**required** if no `prefix` or `suffix`)
  - `prefix` — Snapshot name prefix (**required** if no `name` or `suffix`)
  - `suffix` — Snapshot name suffix (**required** if no `name` or `prefix`)
  - `waitForTimeout`, `waitForSelector`, `execute` — See above
  
#### Alternate syntaxes

All snapshot syntaxes can be provided as items within an array. For example, a single method call
can upload multiple DOM snapshots, capture multiple external snapshots, crawl a sitemap for
snapshots, and host a local static server for snapshots.

**Shared options** accepted by all syntaxes:

- `clientInfo` — Client info to include with the build
- `environmentInfo` — Environment info to include with the build

The following alternate syntaxes may **not** be combined with snapshot options, but rather offer
alternate methods for taking multiple snapshots.

**List options** can only be provided when a top-level `snapshots` is present:

- `snapshots` — An array of snapshot URLs or snapshot options (**required**)
- `baseUrl` — The full base URL (including protocol) used when snapshot URLs only include a pathname
- `include`/`exclude` — Include and exclude matching snapshot names
- `options` — Additional options to apply to snapshots
  - `include`/`exclude` — Include and exclude snapshots to apply these options to
  -  [Common snapshot and capture options](#options) (**excluding** `url`, `domSnapshot`)
  
**Sitemap options** can only be provided when a top-level `sitemap` is present:

- `sitemap` — The URL where an XML sitemap can be located (**required**)
- `include`/`exclude` — Include and exclude matching snapshot names
- `options` — Additional options to apply to snapshots
  - `include`/`exclude` — Include and exclude snapshots to apply these options to
  -  [Common snapshot and capture options](#options) (**excluding** `url`, `domSnapshot`)
  
**Server options** can only be provided when a top-level `serve` is present:

- `serve` — The static directory to serve relative to the current working directory (**required**)
- `baseUrl` — The base URL to serve the directory at, starting with a forward slash (/)
- `cleanUrls` — Set to `true` to strip `.html` and `index.html` from served URLs
- `rewrites` — A source-destination map for rewriting source URLs into destination pathnames
- `snapshots` — An array of specific snapshots to take while serving the static directory
- `include`/`exclude` — Include and exclude matching snapshot names
- `options` — Additional options to apply to snapshots
  - `include`/`exclude` — Include and exclude snapshots to apply these options to
  -  [Common snapshot and capture options](#options) (**excluding** `url`, `domSnapshot`)

## Advanced

### Download discovery browser on install

By default, the browser is only downloaded when asset discovery is started for the first time. This
is because many features of the CLI do not require a browser at all, and automatically downloading a
browser creates a much heavier footprint than needed for those features. However, if your CI caches
dependencies after the install step, the browser will not be cached and will be downloaded every
time Percy runs without it.

If the environment variable `PERCY_POSTINSTALL_BROWSER` is present and truthy, then the browser will
be downloaded after the package is installed to allow it to be cached. You can also require
`@percy/core/post-install` within another node module to trigger the browser download manually.

### Skipping discovery browser download

If your CI comes with a Chromium binary pre-installed and you wish to skip Percy's own browser
installation, you can set the respective `discovery.launchOptions.executable` config option. When
the executable at the provided path exists, the default download will be skipped and the provided
binary will be used instead. This option can also be set using the `PERCY_BROWSER_EXECUTABLE`
environment variable.

> **Warning!** Percy is only tested against the browser it downloads automatically. When providing a
> custom browser executable, you may experience unexpected issues.
