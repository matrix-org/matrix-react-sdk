# cypress-axe

[![npm](https://img.shields.io/npm/v/cypress-axe.svg)](https://www.npmjs.com/package/cypress-axe) [![Node.js CI status](https://github.com/component-driven/cypress-axe/workflows/Node.js%20CI/badge.svg)](https://github.com/component-driven/cypress-axe/actions)

Test accessibility with [axe-core](https://github.com/dequelabs/axe-core) in [Cypress](https://cypress.io).

## Installation

1. **Install `cypress-axe` from npm:**

- For Cypress v10 install latest cypress-axe

```sh
npm install --save-dev cypress-axe
```

- For Cypress v9 install 0.x.x

```sh
npm install --save-dev cypress-axe@0.14.0
```

1. **Install peer dependencies:**

- For Cypress v10 and above

```sh
npm install --save-dev cypress axe-core
```

- For Cypress v9 and below install the specific cypress version you are using For example if you are using cypress v9.6.0

```sh
npm install --save-dev cypress@9.6.0 axe-core
```

1. **Include the commands.**

- For Cypress v10 and above update `cypress/support/e2e.js` file to include the cypress-axe commands by adding:
- For Cypress v9 and below update `cypress/support/index.js` file to include the cypress-axe commands by adding:

```js
import 'cypress-axe'
```

4. **Add a task to log the messages to the terminal** when Cypress executes the spec files. [Example - configuring log task](https://docs.cypress.io/api/commands/task.html#Usage).

### TypeScript

If you’re using TypeScript, add cypress-axe types to your Cypress’ `tsconfig.json` file:

```json
{
  "compilerOptions": {
    "baseUrl": "./",
    "target": "es5",
    "lib": ["esnext", "dom"],
    "types": ["cypress", "cypress-axe"]
  },
  "include": ["."]
}
```

## Commands

### cy.injectAxe

This will inject the `axe-core` runtime into the page under test. You must run this **after** a call to `cy.visit()` and before you run the `checkA11y` command.

You run this command with `cy.injectAxe()` either in your test, or in a `beforeEach`, as long as the `visit` comes first.

```js
beforeEach(() => {
  cy.visit('http://localhost:9000')
  cy.injectAxe()
})
```

### cy.configureAxe

#### Purpose

To configure the format of the data used by aXe. This can be used to add new rules, which must be registered with the library to execute.

#### Description

User specifies the format of the JSON structure passed to the callback of axe.run

[Link - aXe Docs: axe.configure](https://www.deque.com/axe/documentation/api-documentation/#api-name-axeconfigure)

```js
it('Has no detectable a11y violations on load (custom configuration)', () => {
  // Configure aXe and test the page at initial load
  cy.configureAxe({
    branding: {
      brand: String,
      application: String
    },
    reporter: 'option',
    checks: [Object],
    rules: [Object],
    locale: Object
  })
  cy.checkA11y()
})
```

### cy.checkA11y

This will run axe against the document at the point in which it is called. This means you can call this after interacting with your page and uncover accessibility issues introduced as a result of rendering in response to user actions.

#### Parameters on cy.checkA11y (axe.run)

##### context (optional)

Defines the scope of the analysis - the part of the DOM that you would like to analyze. This will typically be the document or a specific selector such as class name, ID, selector, etc.

##### options (optional)

Set of options passed into rules or checks, temporarily modifying them. This contrasts with axe.configure, which is more permanent.

The keys consist of [those accepted by `axe.run`'s options argument](https://www.deque.com/axe/documentation/api-documentation/#parameters-axerun) as well as a custom `includedImpacts` key.

The `includedImpacts` key is an array of strings that map to `impact` levels in violations. Specifying this array will only include violations where the impact matches one of the included values. Possible impact values are "minor", "moderate", "serious", or "critical".

Filtering based on impact in combination with the `skipFailures` argument allows you to introduce `cypress-axe` into tests for a legacy application without failing in CI before you have an opportunity to address accessibility issues. Ideally, you would steadily move towards stricter testing as you address issues.

##### violationCallback (optional)

Allows you to define a callback that receives the violations for custom side-effects, such as adding custom output to the terminal.

**NOTE:** _This respects the `includedImpacts` filter and will only execute with violations that are included._

##### skipFailures (optional, defaults to false)

Disables assertions based on violations and only logs violations to the console output. This enabled you to see violations while allowing your tests to pass. This should be used as a temporary measure while you address accessibility violations.

Reference : https://github.com/component-driven/cypress-axe/issues/17

### Examples

#### Basic usage

```js
// Basic usage
it('Has no detectable a11y violations on load', () => {
  // Test the page at initial load
  cy.checkA11y()
})

// Applying a context and run parameters
it('Has no detectable a11y violations on load (with custom parameters)', () => {
  // Test the page at initial load (with context and options)
  cy.checkA11y('.example-class', {
    runOnly: {
      type: 'tag',
      values: ['wcag2a']
    }
  })
})

it('Has no detectable a11y violations on load (filtering to only include critical impact violations)', () => {
  // Test on initial load, only report and assert for critical impact items
  cy.checkA11y(null, {
    includedImpacts: ['critical']
  })
})

// Basic usage after interacting with the page
it('Has no a11y violations after button click', () => {
  // Interact with the page, then check for a11y issues
  cy.get('button').click()
  cy.checkA11y()
})

it('Only logs a11y violations while allowing the test to pass', () => {
  // Do not fail the test when there are accessibility failures
  cy.checkA11y(null, null, null, true)
})
```

#### Using the violationCallback argument

The violation callback parameter accepts a function and allows you to add custom behavior when violations are found.

This example adds custom logging to the terminal running Cypress, using `cy.task` and the `violationCallback` argument for `cy.checkA11y`

##### In Cypress plugins file

This registers a `log` task as seen in the [Cypress docs for cy.task](https://docs.cypress.io/api/commands/task.html#Usage) as well as a `table` task for sending tabular data to the terminal.

```js
module.exports = (on, config) => {
  on('task', {
    log(message) {
      console.log(message)

      return null
    },
    table(message) {
      console.table(message)

      return null
    }
  })
}
```

#### In your spec file

Then we create a function that uses our tasks and pass it as the `validationCallback` argument to `cy.checkA11y`

```js
// Define at the top of the spec file or just import it
function terminalLog(violations) {
  cy.task(
    'log',
    `${violations.length} accessibility violation${
      violations.length === 1 ? '' : 's'
    } ${violations.length === 1 ? 'was' : 'were'} detected`
  )
  // pluck specific keys to keep the table readable
  const violationData = violations.map(
    ({ id, impact, description, nodes }) => ({
      id,
      impact,
      description,
      nodes: nodes.length
    })
  )

  cy.task('table', violationData)
}

// Then in your test...
it('Logs violations to the terminal', () => {
  cy.checkA11y(null, null, terminalLog)
})
```

This custom logging behavior results in terminal output like this:

![Custom terminal logging with cy.task and validationCallback](terminal_output_example.png)

## Standard Output

When accessibility violations are detected, your test will fail and an entry titled "A11Y ERROR!" will be added to the command log for each type of violation found (they will be above the failed assertion). Clicking on those will reveal more specifics about the error in the DevTools console.

![Cypress and DevTools output for passing and failing axe-core audits](cmd_log.png)

## Authors

The project was created by [Andy Van Slaars](https://vanslaars.io/), and maintained by [Artem Sapegin](https://sapegin.me).

## Contributors

Thanks goes to these wonderful people ([emoji key](https://github.com/all-contributors/all-contributors#emoji-key)):

<!-- ALL-CONTRIBUTORS-LIST:START - Do not remove or modify this section -->
<!-- prettier-ignore-start -->
<!-- markdownlint-disable -->
<table>
  <tr>
    <td align="center"><a href="https://samcus.co"><img src="https://avatars2.githubusercontent.com/u/14907938?v=4" width="100px;" alt=""/><br /><sub><b>Samuel Custer</b></sub></a><br /><a href="https://github.com/component-driven/cypress-axe/commits?author=samcus" title="Code">💻</a> <a href="https://github.com/component-driven/cypress-axe/commits?author=samcus" title="Documentation">📖</a></td>
    <td align="center"><a href="https://github.com/miketoth"><img src="https://avatars2.githubusercontent.com/u/2512676?v=4" width="100px;" alt=""/><br /><sub><b>Michael Toth</b></sub></a><br /><a href="https://github.com/component-driven/cypress-axe/commits?author=miketoth" title="Code">💻</a></td>
    <td align="center"><a href="https://github.com/NicholasBoll"><img src="https://avatars2.githubusercontent.com/u/338257?v=4" width="100px;" alt=""/><br /><sub><b>Nicholas Boll</b></sub></a><br /><a href="https://github.com/component-driven/cypress-axe/commits?author=NicholasBoll" title="Code">💻</a></td>
    <td align="center"><a href="https://github.com/michaeljacobdavis"><img src="https://avatars2.githubusercontent.com/u/916905?v=4" width="100px;" alt=""/><br /><sub><b>Mike Davis</b></sub></a><br /><a href="https://github.com/component-driven/cypress-axe/commits?author=michaeljacobdavis" title="Code">💻</a></td>
    <td align="center"><a href="https://github.com/chit786"><img src="https://avatars2.githubusercontent.com/u/18376182?v=4" width="100px;" alt=""/><br /><sub><b>chit786</b></sub></a><br /><a href="https://github.com/component-driven/cypress-axe/commits?author=chit786" title="Code">💻</a> <a href="https://github.com/component-driven/cypress-axe/commits?author=chit786" title="Documentation">📖</a></td>
    <td align="center"><a href="https://github.com/acourdavault"><img src="https://avatars0.githubusercontent.com/u/27222128?v=4" width="100px;" alt=""/><br /><sub><b>Adrien courdavault</b></sub></a><br /><a href="https://github.com/component-driven/cypress-axe/commits?author=acourdavault" title="Code">💻</a></td>
    <td align="center"><a href="http://brett-zamir.me"><img src="https://avatars3.githubusercontent.com/u/20234?v=4" width="100px;" alt=""/><br /><sub><b>Brett Zamir</b></sub></a><br /><a href="https://github.com/component-driven/cypress-axe/commits?author=brettz9" title="Code">💻</a></td>
  </tr>
</table>

<!-- markdownlint-enable -->
<!-- prettier-ignore-end -->

<!-- ALL-CONTRIBUTORS-LIST:END -->

This project follows the [all-contributors](https://github.com/all-contributors/all-contributors) specification. Contributions of any kind welcome!

## License

MIT License, see the included [License.md](License.md) file.
