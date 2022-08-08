# @percy/cli-snapshot

Snapshot a list or static directory of web pages.

## Commands
<!-- commands -->
* [`percy snapshot`](#percy-snapshot)

### `percy snapshot`

Snapshot a static directory, snapshots file, or sitemap URL

```
Usage:
  $ percy snapshot [options] <dir|file|sitemap>

Arguments:
  dir|file|sitemap                   Static directory, snapshots file, or sitemap url

Options:
  -b, --base-url <string>            The base url pages are hosted at when snapshotting
  --include <pattern>                One or more globs/patterns matching snapshots to include
  --exclude <pattern>                One or more globs/patterns matching snapshots to exclude

Static options:
  --clean-urls                       Rewrite static index and filepath URLs to be clean

Percy options:
  -c, --config <file>                Config file path
  -d, --dry-run                      Print snapshot names only
  -h, --allowed-hostname <hostname>  Allowed hostnames to capture in asset discovery
  --disallowed-hostname <hostname>   Disallowed hostnames to abort in asset discovery
  -t, --network-idle-timeout <ms>    Asset discovery network idle timeout
  --disable-cache                    Disable asset discovery caches
  --debug                            Debug asset discovery and do not upload snapshots

Global options:
  -v, --verbose                      Log everything
  -q, --quiet                        Log errors only
  -s, --silent                       Log nothing
  --help                             Display command help

Examples:
  $ percy snapshot ./public
  $ percy snapshot snapshots.yml
  $ percy snapshot https://percy.io/sitemap.xml
```
<!-- commandsstop -->

## Usage

### Snapshot Lists

When providing a file containing a list of snapshots, the file must be YAML, JSON, or a JS file
exporting a list of pages. Each snapshot must contain at least a `url` that can be navigated to
using a browser.

`snapshots.yml`:

```yaml
- http://localhost:8080
- http://localhost:8080/two
```

Snapshotting `snapshots.yml`:

```sh-session
$ percy snapshot snapshots.yml
[percy] Percy has started!
[percy] Snapshot taken: /
[percy] Snapshot taken: /two
[percy] Finalized build #1: https://percy.io/org/project/123
```

#### Snapshot Options

A `name` can be provided which will override the default snapshot name generated from the url
path. The options `waitForTimeout` and `waitForSelector` can also be provided to wait for a timeout
or selector respectively before taking the snapshot.

`snapshots.json`:

```json
[{
  "name": "Snapshot one",
  "url": "http://localhost:8080",
  "waitForTimeout": 1000
}, {
  "name": "Snapshot two",
  "url": "http://localhost:8080/two",
  "waitForSelector": ".some-element"
}]
```

Snapshotting `snapshots.json`:

```sh-session
$ percy snapshot snapshots.json
[percy] Percy has started!
[percy] Snapshot taken: Snapshot one
[percy] Snapshot taken: Snapshot two
[percy] Finalized build #1: https://percy.io/org/project/123
```

For more advanced use cases, an `execute` function and `additionalSnapshots` may be specified for
each snapshot to execute JavaScript within the page execution context before subsequent snapshots
are taken.

> Note: All options are also accepted by other file formats. For `execute` however, a string
> containing a function body can be provided when the file format prevents normal functions.

`snapshots.js`:

```js
module.exports = [{
  name: 'My form',
  url: 'http://localhost:8080/form',
  waitForSelector: '.form-loaded',
  execute() {
    document.querySelector('.name').value = 'Name Namerson';
    document.querySelector('.email').value = 'email@domain.com';
  },
  additionalSnapshots: [{
    suffix: ' - submitting',
    execute() {
      document.querySelector('.submit').click();
    }
  }, {
    suffix: ' - after submit',
    waitForSelector: '.form-submitted'
  }]
}]
```

Snapshotting `snapshots.js`:

```sh-session
$ percy snapshot snapshots.js
[percy] Percy has started!
[percy] Snapshot taken: My form
[percy] Snapshot taken: My form - submitting
[percy] Snapshot taken: My form - after submit
[percy] Finalized build #1: https://percy.io/org/project/123
```

JavaScript files may also export sync or async functions that return a list of pages to snapshot.

``` js
module.exports = async () => {
  let urls = await getSnapshotUrls()
  return urls.map(url => ({ name: url, url }))
}
```

#### Advanced List Options

Instead of an array of snapshots, list files can also contain an object that defines additional
top-level options along with a `snapshots` option containing the array of snapshots. This allows
dynamically filtering lists with `include`/`exclude` options, and enables utilizing features such as
YAML anchors and references.

<details>
  <summary>Example <code>snapshots.yml</code></summary><br>

``` yaml
base-url: https://example.com
exclude:
  - /page/(\d+)

references:
  dismiss-cookie-banner: &dismiss-cookie-banner |
    document.querySelector('.cookie-banner .dismiss').click();

snapshots:
  - url: /foo
    execute: *dismiss-cookie-banner
  - url: /foo
    name: "/foo - with cookie banner"
  - url: /bar
    execute: *dismiss-cookie-banner
```
</details>

### Static Directory

When providing a static directory, it will be served locally and pages matching the `files` argument
(and excluding the `ignore` argument) will be navigated to and snapshotted.

```sh-session
$ percy snapshot ./public
[percy] Percy has started!
[percy] Snapshot taken: /index.html
[percy] Snapshot taken: /about.html
[percy] Snapshot taken: /contact.html
[percy] Finalized build #1: https://percy.io/org/project/123
```

#### Static Options

For snapshotting static directories, the following Percy config file options are also accepted:

``` yaml
# .percy.yml
version: 2
static:
  base-url: /
  clean-urls: false
  include: **/*.html
  exclude: []
  rewrites: {}
  overrides: []
```

- **base-url** - The base URL path the static site should be served under.
- **clean-urls** - When true, rewrite index and filepath URLs to be clean.

<span/>

- **include/exclude** - A predicate or an array of predicates matching snapshots to include/exclude.

  A predicate can be a string glob or pattern, a regular expression, or a function that accepts a
  snapshot object and returns `true` or `false` if the snapshot is considered matching or not.

  ``` javascript
  // .percy.js
  module.exports = {
    version: 2,
    static: {
      include: [
        'blog/**/*.html',          // glob
        'pages/page-(?!10).html$', // pattern
        /about-(.+)\.html/i        // regexp
      ],
      exclude: [
        // function that returns true when matching
        ({ name }) => DISALLOWED.includes(name)
      ]
    }
  };
  ```

- **rewrites** - An object containing source-destination pairs for rewriting URLs.

  Paths for resources can sometimes be expected to be in a certain format that may not be covered by
  the `clean-urls` option. For such paths, rewrites can map a short, clean, or pretty path to a
  specific resource. Paths are matched using [path-to-regexp](https://github.com/pillarjs/path-to-regexp).

  ``` yaml
  # .percy.yml
  version: 2
  static:
    base-url: /blog
    rewrites:
      /:year/:month/:title: /posts/:year-:month--:title.html
      /:year/:month: /posts/index-:year-:month.html
      /:year: /posts/index-:year.html
  ```

- **overrides** - An array of per-snapshot option overrides.

  Just like [page listing options](#page-options), static snapshots may also contain
  per-snapshot configuration options. However, since pages are matched against the `files`
  option, so are per-snapshot configuration options via an array of `overrides`. If multiple
  overrides match a snapshot, they will be merged with previously matched overrides.

  ``` yaml
  # .percy.yml
  version: 2
  static:
    overrides:
    - files: /foo-bar.html
      waitForSelector: .is-ready
      execute: |
        document.querySelector('.button').click()
  ```

### Sitemap URL

When providing a sitemap URL, the document must be an XML document. For sitemap URLs the `--include` and
`--exclude` flags can be used to filter snapshots. With a Percy config file, the `overrides` option
is also accepted.

> Tip: Sitemaps can contain **a lot** of URLs, so its best to always start with the `--dry-run` flag
> while fine tuning the `include` and `exclude` options.

``` sh-session
$ percy snapshot https://percy.io/sitemap.xml --dry-run
[percy] Found 10 snapshots
[percy] Snapshot found: /
[percy] Snapshot found: /changelog
[percy] Snapshot found: /customers
[percy] Snapshot found: /enterprise
[percy] Snapshot found: /features
[percy] Snapshot found: /how-it-works
[percy] Snapshot found: /integrations
[percy] Snapshot found: /pricing
[percy] Snapshot found: /security
[percy] Snapshot found: /visual-testing
```

#### Sitemap Options

For snapshotting sitemaps, the following Percy config file options are accepted:

``` yaml
# .percy.yml
version: 2
static:
  include: **/*.html
  exclude: []
  overrides: []
```

See [the corresponding static options](#static-options) for details on `includes`, `excludes`, and
`overrides` options.
