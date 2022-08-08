## [1.0.3](https://github.com/matrix-org/matrix-encrypt-attachment/compare/v1.0.2...v1.0.3) (2022-04-01)


### Bug Fixes

* add explicit default export for browser build to aide backwards compatibility ([7280eae](https://github.com/matrix-org/matrix-encrypt-attachment/commit/7280eae9838c5757deaa08c2a534e7d966cae0e9))

## [1.0.2](https://github.com/matrix-org/matrix-encrypt-attachment/compare/v1.0.1...v1.0.2) (2022-01-29)


### Bug Fixes

* specify correct Node.js compatibility (>=12) ([999f197](https://github.com/matrix-org/matrix-encrypt-attachment/commit/999f1972f9ba708a5d2fd6f516347860c2a90aef))

## [1.0.1](https://github.com/matrix-org/matrix-encrypt-attachment/compare/v1.0.0...v1.0.1) (2022-01-14)


### Bug Fixes

* enabled automatic semantic release from main branch ([6b7fde1](https://github.com/matrix-org/matrix-encrypt-attachment/commit/6b7fde1f8529b141882a395adacbffc1c4f02a93))

# 1.0.0 (2022-01-13)

### BREAKING CHANGES

* Published as `matrix-encrypt-attachment` instead of `browser-encrypt-attachment`

### Features

* support for Node.js >=12 as well as browsers
* TypeScript typings are now provided

# 0.x.x

The following changes are archived from [`browser-encrypt-attachment`](https://www.npmjs.com/package/browser-encrypt-attachment):

Changes in [0.3.0](https://github.com/matrix-org/browser-encrypt-attachment/releases/tag/v0.3.0) (2016-11-23)
===================================================================================================
[Full Changelog](https://github.com/matrix-org/browser-encrypt-attachment/compare/v0.2.0...v0.3.0)

Changes:

 * Set the 64 bit counter to 0 to avoid overflow to make Android compatibility easier. (PR #4)

Changes in [0.2.0](https://github.com/matrix-org/browser-encrypt-attachment/releases/tag/v0.2.0) (2016-11-22)
===================================================================================================
[Full Changelog](https://github.com/matrix-org/browser-encrypt-attachment/compare/v0.1.0...v0.2.0)

Breaking changes:

 * Use a 64 bit counter in AES-CTR to make iOS compatibility easier. (PR #3)

Changes in [0.1.0](https://github.com/matrix-org/browser-encrypt-attachment/releases/tag/v0.1.0) (2016-11-11)
===================================================================================================
[Full Changelog](https://github.com/matrix-org/browser-encrypt-attachment/compare/v0.0.0...v0.1.0)

Breaking changes:

 * Use AES-CTR rather than AES-GCM to make iOS compatibility easier. (PR #2)
