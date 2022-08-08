# @percy/cli-exec

Percy CLI commands for running a local snapshot server using [`@percy/core`](./packages/core).

## Commands
<!-- commands -->
* [`percy exec`](#percy-exec)
* [`percy exec:start`](#percy-execstart)
* [`percy exec:stop`](#percy-execstop)
* [`percy exec:ping`](#percy-execping)

### `percy exec`

Start and stop Percy around a supplied command

```
Usage:
  $ percy exec [options] -- <command>

Subcommands:
  exec:start [options]               Starts a local Percy snapshot server
  exec:stop [options]                Stops a local running Percy snapshot server
  exec:ping [options]                Pings a local running Percy snapshot server
  help [command]                     Display command help

Options:
  -P, --port [number]                Local CLI server port (default: 5338)
  --parallel                         Marks the build as one of many parallel builds
  --partial                          Marks the build as a partial build

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
  $ percy exec -- echo "percy is running around this echo command"
  $ percy exec -- yarn test
```

### `percy exec:start`

Starts a local Percy snapshot server

```
Usage:
  $ percy exec:start [options]

Options:
  -P, --port [number]                Local CLI server port (default: 5338)

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
  $ percy exec:start &> percy.log
```

### `percy exec:stop`

Stops a local running Percy snapshot server

```
Usage:
  $ percy exec:stop [options]

Options:
  -P, --port [number]  Local CLI server port (default: 5338)

Global options:
  -v, --verbose        Log everything
  -q, --quiet          Log errors only
  -s, --silent         Log nothing
  -h, --help           Display command help
```

### `percy exec:ping`

Pings a local running Percy snapshot server

```
Usage:
  $ percy exec:ping [options]

Options:
  -P, --port [number]  Local CLI server port (default: 5338)

Global options:
  -v, --verbose        Log everything
  -q, --quiet          Log errors only
  -s, --silent         Log nothing
  -h, --help           Display command help
```
<!-- commandsstop -->
