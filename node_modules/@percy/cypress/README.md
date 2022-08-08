# @percy/cypress
[![Version](https://img.shields.io/npm/v/@percy/cypress.svg)](https://npmjs.org/package/@percy/cypress)
![Test](https://github.com/percy/percy-cypress/workflows/Test/badge.svg)

[Percy](https://percy.io) visual testing for [Cypress](https://cypress.io).

## Installation

```sh-session
$ npm install --save-dev @percy/cli @percy/cypress
```

Then add to your `cypress/support/index.js` file

```javascript
import '@percy/cypress'
```

## Usage

This is an example using the `cy.percySnapshot` command.

```javascript
describe('My app', () => {
  it('should look good', () => {
    cy.get('body').should('have.class', 'finished-loading');
    cy.percySnapshot();

    cy.get('button').click();
    cy.percySnapshot('Clicked button');
  });
});
```

Running the test above will result in the following log:

```sh-session
$ cypress run
...
[percy] Percy is not running, disabling snapshots
```

When running with [`percy
exec`](https://github.com/percy/cli/tree/master/packages/cli-exec#percy-exec), and your project's
`PERCY_TOKEN`, a new Percy build will be created and snapshots will be uploaded to your project.

```sh-session
$ export PERCY_TOKEN=[your-project-token]
$ percy exec -- cypress run
[percy] Percy has started!
[percy] Created build #1: https://percy.io/[your-project]
[percy] Running "cypress run"
...
[percy] Snapshot taken "My app should look good"
[percy] Snapshot taken "Clicked button"
...
[percy] Stopping percy...
[percy] Finalized build #1: https://percy.io/[your-project]
[percy] Done!
```

## Configuration

`cy.percySnapshot([name][, options])`

- `name` - The snapshot name; must be unique to each snapshot; defaults to the full test title
- `options` - [See per-snapshot configuration options](https://docs.percy.io/docs/cli-configuration#per-snapshot-configuration)

## Upgrading

### Automatically with `@percy/migrate`

We built a tool to help automate migrating to the new CLI toolchain! Migrating
can be done by running the following commands and following the prompts:

``` shell
$ npx @percy/migrate
? Are you currently using @percy/cypress? Yes
? Install @percy/cli (required to run percy)? Yes
? Migrate Percy config file? Yes
? Upgrade SDK to @percy/cypress@3.0.0? Yes
```

This will automatically run the changes described below for you.

### Manually

#### Installing `@percy/cli`

If you're coming from a pre-3.0 version of this package, make sure to install `@percy/cli` after
upgrading to retain any existing scripts that reference the Percy CLI command.

```sh-session
$ npm install --save-dev @percy/cli
```

#### Removing tasks

If you're coming from 2.x the health check task, `@percy/cypress/task`, is no longer needed and no
longer exists. You should remove this task from your `cypress/plugins/index.js` file.

#### Migrating Config

If you have a previous Percy configuration file, migrate it to the newest version with the
[`config:migrate`](https://github.com/percy/cli/tree/master/packages/cli-config#percy-configmigrate-filepath-output) command:

```sh-session
$ percy config:migrate
```
