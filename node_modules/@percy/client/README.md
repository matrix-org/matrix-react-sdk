# @percy/client

Communicate with Percy's API to create builds and snapshots, upload resources, and finalize builds
and snapshots. Uses [`@percy/env`](.packages/env) to send environment information with new
builds. Can also be used to query for a project's builds using a read access token.

- [Usage](#usage)
- [Create a build](#create-a-build)
- [Create, upload, and finalize snapshots](#create-upload-and-finalize-snapshots)
- [Finalize a build](#finalize-a-build)
- [Query for a build*](#query-for-a-build)
- [Query for a project's builds*](#query-for-a-projects-builds)
- [Wait for a build to be finished*](#wait-for-a-build-to-be-finished)

## Usage

``` js
import PercyClient from '@percy/client'

const client = new PercyClient(options)
```

#### Options

- `token` — Your project's `PERCY_TOKEN` (**default** `process.env.PERCY_TOKEN`)
- `clientInfo` — Client info sent to Percy via a user-agent string
- `environmentInfo` — Environment info also sent with the user-agent string

## Create a build

Creates a percy build. Only one build can be created at a time per instance. During this step,
various environment information is collected via [`@percy/env`](./packages/env#readme) and
associated with the new build. If `PERCY_PARALLEL_TOTAL` and `PERCY_PARALLEL_NONCE` are present, a
build shard is created as part of a parallelized Percy build.

``` js
await client.createBuild()
```

## Create, upload, and finalize snapshots

This method combines the work of creating a snapshot, uploading any missing resources, and finally
finalizng the snapshot.

``` js
await client.sendSnapshot(buildId, snapshotOptions)
```

#### Options

- `name` — Snapshot name
- `widths` — Widths to take screenshots at
- `minHeight` — Miniumum screenshot height
- `enableJavaScript` — Enable JavaScript for screenshots
- `clientInfo` — Additional client info
- `environmentInfo` — Additional environment info
- `resources` — Array of snapshot resources
  - `url` — Resource URL (**required**)
  - `mimetype` — Resource mimetype (**required**)
  - `content` — Resource content (**required**)
  - `sha` — Resource content sha
  - `root` — Boolean indicating a root resource

## Finalize a build

Finalizes a build. When `all` is true, `all-shards=true` is added as a query param so the
API finalizes all other parallel build shards associated with the build.

``` js
// finalize a build
await client.finalizeBuild(buildId)

// finalize all parallel build shards
await client.finalizeBuild(buildId, { all: true })
```

## Query for a build

Retrieves build data by id.

**Requires a read access token**

``` js
await client.getBuild(buildId)
```

## Query for a project's builds

Retrieves project builds, optionally filtered. The project slug can be found as part of the
project's URL. For example, the project slug for `https://percy.io/percy/example` is
`"percy/example"`.

**Requires a read access token**

``` js
// get all builds for a project
await client.getBuilds(projectSlug)

// get all builds for a project's "master" branch
await client.getBuilds(projectSlug, { branch: 'master' })
```

#### Filters

- `sha` — A single commit sha
- `shas` — An array of commit shas
- `branch` — The name of a branch
- `state` — The build state (`"pending"`, `"finished"`, etc.)

## Wait for a build to be finished

This method resolves when the build has finished and is no longer pending or processing. By default,
it will time out if there is no update after 10 minutes.

**Requires a read access token**

``` js
// wait for a specific project build by commit sha
await client.waitForBuild({
  project: 'percy/example',
  commit: '40-char-sha'
}, data => {
  // called whenever data changes
  console.log(JSON.stringify(data));
})
```

#### Options

- `build` — Build ID (**required** when missing `commit`)
- `commit` — Commit SHA (**required** when missing `build`)
- `project` — Project slug (**required** when using `commit`)
- `timeout` — Timeout in milliseconds to wait with no updates (**default** `10 * 60 * 1000`)
- `interval` — Interval in miliseconds to check for updates (**default** `1000`)
