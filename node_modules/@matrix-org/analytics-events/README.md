# matrix-analytics-events

This repository contains JSON schema defining analytics events raised by the Matrix client SDKs.

It also contains a generator of type stubs for these events which can be used by the client SDKs. Using these stubs
ensures events raised comply with the schema via compile-time type verification.

You can find an [overview of the analytics events here](https://matrix-org.github.io/matrix-analytics-events/).

## Schemas

`/schemas` contains one JSON schema file per event, each named exactly according to the name of that event
(case-sensitive).

`/types` contain type stubs generated from these schemas in the different client languages we support.

## Generating new type stubs

After creating or updating an event schema, you need to generate new type stubs and commit them along with your changes
to the events.

To install the stub generator (only needed once), you'll need on your system

* yarn
* python 3.10+
* [poetry](https://python-poetry.org/docs/#osx--linux--bashonwindows-install-instructions)

For me, the easiest way to install python 3.10 was via [pyenv](https://github.com/pyenv/pyenv),
then poetry was happy to recognise it after running `pyenv local 3.10.0`.

Then run

```
scripts/setup.sh
```

To generate the stubs:

```
yarn build
```

## Guidelines for creating new event schema

* One schema per .json. The filename should match the event's name, including case.
* Each schema should contain an `eventName` property declared as an `enum` with a single value.
  This convention can be relied upon by consumers of stubs as a way to get the correct name to send for that event.

  For example:

```json
"eventName": {
  "enum": ["Error"]
},
```

* You must describe your event using `description` fields. Your audience might be unfamiliar with the codebase,
  or non-technical, so don't refer to code concepts and try to describe things in general but accurate terms. English grammar must be respected, in particular sentences must end with punctuation (eg a period).

### Description examples

#### Events

```json
{
  "type": "object",
  "description": "Triggered when the user changed screen.",
  "properties": {
    "eventName": {
      "enum": ["Screen"]
    }
  }
}
```

#### Primitive properties

```json
"durationMs": {
  "description": "How long the screen was displayed for in milliseconds.",
  "type": "integer"
}
```

#### Enums

```json
"screenName": {
  "type": "string",
  "oneOf": [
    {"const": "Welcome", "description": "The splash screen."},
  ]
}
```

## Releasing

Use "[Run workflow](https://github.com/matrix-org/matrix-analytics-events/actions/workflows/release.yaml)".
Refer to [SemVer](https://semver.org/) for versioning semantics.
This workflow will bump the version, publish NPM and create a GitHub release.
The Swift consumer relies on the git tag, the Kotlin consumer pulls this repo weekly.
