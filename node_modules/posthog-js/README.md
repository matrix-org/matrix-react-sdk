# PostHog Browser JS Library

[![npm package](https://img.shields.io/npm/v/posthog-js?style=flat-square)](https://www.npmjs.com/package/posthog-js)
[![MIT License](https://img.shields.io/badge/License-MIT-red.svg?style=flat-square)](https://opensource.org/licenses/MIT)

Please see [PostHog Docs](https://posthog.com/docs).
Specifically, [browser JS library details](https://posthog.com/docs/libraries/js).

## Testing

Unit tests: run `yarn test`.
Cypress: run `yarn serve` to have a test server running and separately `yarn cypress` to launch Cypress test engine.

### Running TestCafe E2E tests with BrowserStack

Testing on IE11 requires a bit more setup.

1. Run `posthog` locally on port 8000 (`DEBUG=1 TEST=1 ./bin/start`).
2. Run `python manage.py setup_dev --no-data` on posthog repo, which sets up a demo account.
3. Optional: rebuild array.js on changes: `nodemon -w src/ --exec bash -c "yarn build-array"`.
4. Export browserstack credentials: `export BROWSERSTACK_USERNAME=xxx BROWSERSTACK_ACCESS_KEY=xxx`.
5. Run tests: `npx testcafe "browserstack:ie" testcafe/e2e.spec.js`.

## Developing together with another repo


Use [`yarn link`](https://classic.yarnpkg.com/en/docs/cli/link/). Run `yarn link` in `posthog-js`, and then `yarn link posthog-js` in `posthog`. Once you're done, remember to `yarn unlink posthog-js` in `posthog`, and `yarn unlink` in `posthog-js`.

An alternative is to update dependency in package.json to e.g. `"posthog-js": "link:../posthog-js"`, `yarn` and run `yarn build && yarn build-module`


### Developing with main PostHog repo

The `posthog-js` snippet for a website loads static js from the main `PostHog/posthog` repo. Which means, when testing the snippet with a website, there's a bit of extra setup required:

1. Run `PostHog/posthog` locally
2. Link the `posthog-js` dependency to your local version (see above)
3. Run `yarn serve` in `posthog-js`. (This ensures `dist/array.js` is being generated)
4. In your locally running `PostHog/posthog` build, run `yarn copy-scripts`. (This copies the scripts generated in step 3 to the static assets folder for `PostHog/posthog`)

Further, it's a good idea to modify `start-http` script to add development mode: `webpack serve --mode development`, which doesn't minify the resulting js (which you can then read in your browser).


## Releasing a new version

Just bump up `version` in `package.json` on the main branch and the new version will be published automatically,
with a matching PR in the [main PostHog repo](https://github.com/posthog/posthog) created.

It's advised to use `bump patch/minor/major` label on PRs - that way the above will be done automatically
when the PR is merged.

Courtesy of GitHub Actions.

### Manual steps

To release a new version, make sure you're logged into npm (`npm login`).

We tend to follow the following steps:

1. Merge your changes into master.
2. Release changes as a beta version:
    - `npm version 1.x.x-beta.0`
    - `npm publish --tag beta`
    - `git push --tags`
3. Create a PR linking to this version in the [main PostHog repo](https://github.com/posthog/posthog).
4. Once deployed and tested, write up CHANGELOG.md, and commit.
5. Release a new version:
    - `npm version 1.x.x`
    - `npm publish`
    - `git push --tags`
6. Create a PR linking to this version in the [main PostHog repo](https://github.com/posthog/posthog).

## Questions?

### [Join our Slack community.](https://posthog.com/slack)
