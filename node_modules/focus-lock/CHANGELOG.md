## [0.11.2](https://github.com/theKashey/focus-lock/compare/v0.11.1...v0.11.2) (2022-05-07)

### Bug Fixes

- use prototype-based node.contains, fixes [#36](https://github.com/theKashey/focus-lock/issues/36) ([c7eb950](https://github.com/theKashey/focus-lock/commit/c7eb9500adcb37ff2cac8a84b440fc59804d5874))

## [0.11.1](https://github.com/theKashey/focus-lock/compare/v0.11.0...v0.11.1) (2022-05-04)

# [0.11.0](https://github.com/theKashey/focus-lock/compare/v0.10.2...v0.11.0) (2022-05-01)

### Bug Fixes

- no longer block aria-disabled elements, fixes [#34](https://github.com/theKashey/focus-lock/issues/34) ([2bc8ee3](https://github.com/theKashey/focus-lock/commit/2bc8ee3a58f5c51b6a44df24b4bd443c01977737))
- restore built-in jsdoc ([edc8a82](https://github.com/theKashey/focus-lock/commit/edc8a82b1fe1e0a349ff60ebb599f63dbc2aa599))

### Features

- introduce FOCUS_NO_AUTOFOCUS ([5c2dc8f](https://github.com/theKashey/focus-lock/commit/5c2dc8fb371ee83400ae65c7f0923b19eaf99d05))

## [0.10.2](https://github.com/theKashey/focus-lock/compare/v0.10.1...v0.10.2) (2022-02-14)

### Bug Fixes

- correct button management for disabled state ([463682e](https://github.com/theKashey/focus-lock/commit/463682eb938928b3682ba91b1f1e4b2de4788cea))

## [0.10.1](https://github.com/theKashey/focus-lock/compare/v0.9.2...v0.10.1) (2021-12-12)

### Features

- suport focusOptions in setFocus ([69debee](https://github.com/theKashey/focus-lock/commit/69debee17264c44685c63e2d3366a524d1bcdb8b))

## [0.9.2](https://github.com/theKashey/focus-lock/compare/v0.9.1...v0.9.2) (2021-09-02)

## [0.9.1](https://github.com/theKashey/focus-lock/compare/v0.9.0...v0.9.1) (2021-05-13)

### Performance Improvements

- track operation complexity ([0d91516](https://github.com/theKashey/focus-lock/commit/0d91516d48a36572507861ca167d93ba16e41a1b))

# [0.9.0](https://github.com/theKashey/focus-lock/compare/v0.8.1...v0.9.0) (2021-03-28)

### Features

- allow setting focusOptions for prev/next focus actions ([d2e17d6](https://github.com/theKashey/focus-lock/commit/d2e17d66c59d9d04ac5f2196610a56e18cc1e1cf))

## [0.8.1](https://github.com/theKashey/focus-lock/compare/v0.8.0...v0.8.1) (2020-11-16)

### Bug Fixes

- contants endpoint not exposed ([ab51c37](https://github.com/theKashey/focus-lock/commit/ab51c37008c89348ab26f5efaa7ae159e239faa7))

# [0.8.0](https://github.com/theKashey/focus-lock/compare/v0.7.0...v0.8.0) (2020-09-30)

### Bug Fixes

- readonly control can be focused, fixes [#18](https://github.com/theKashey/focus-lock/issues/18) ([842d578](https://github.com/theKashey/focus-lock/commit/842d578cccbfed2b35b9c490229a40861e6c950a))
- speedup nested nodes resolution O(n^2) to O(nlogn) ([5bc1498](https://github.com/theKashey/focus-lock/commit/5bc1498b6a7885d9e6ce906777395c31eca2bdef))

### Features

- add relative focusing API ([3086116](https://github.com/theKashey/focus-lock/commit/308611642385f78a7a8b58848a0e1d540a83c9ba))
- switch to typescript ([fcd5892](https://github.com/theKashey/focus-lock/commit/fcd5892403e1b8de98957440669462e829f4d7c3))

# [0.7.0](https://github.com/theKashey/focus-lock/compare/v0.6.7...v0.7.0) (2020-06-18)

### Bug Fixes

- accept all focusable elements for autofocus, fixes [#16](https://github.com/theKashey/focus-lock/issues/16) ([88efbe8](https://github.com/theKashey/focus-lock/commit/88efbe81179e053a107ef20e37feddd1e826320f))
- dataset of null error ([7cb428b](https://github.com/theKashey/focus-lock/commit/7cb428be8cc61051ac31ef21b3d3b2463e187b9a))
- update logic for index diff calculations, fixes [#14](https://github.com/theKashey/focus-lock/issues/14) ([4c7e637](https://github.com/theKashey/focus-lock/commit/4c7e63721394716370bdfb9e755af7cd965708cc))

## [0.6.7](https://github.com/theKashey/focus-lock/compare/v0.6.6...v0.6.7) (2020-04-17)

### Bug Fixes

- better handle jump out conditions. Focus on the active radio and look for tailing guards as well ([421e869](https://github.com/theKashey/focus-lock/commit/421e8690d81dbeaaa43231a1be46bd4b235a84bf))

## [0.6.6](https://github.com/theKashey/focus-lock/compare/v0.6.5...v0.6.6) (2019-10-17)

### Bug Fixes

- detect document using nodeType, fixes [#11](https://github.com/theKashey/focus-lock/issues/11) ([c03e6bc](https://github.com/theKashey/focus-lock/commit/c03e6bc99a467dace0c346397480b95dcff7f74d))

## [0.6.5](https://github.com/theKashey/focus-lock/compare/v0.6.4...v0.6.5) (2019-06-10)

### Bug Fixes

- dont use array.find, fixes [#9](https://github.com/theKashey/focus-lock/issues/9) ([cbeec63](https://github.com/theKashey/focus-lock/commit/cbeec6319bb9716c3cf729e2134d4eb7f5702358))

## [0.6.4](https://github.com/theKashey/focus-lock/compare/v0.6.3...v0.6.4) (2019-05-28)

### Features

- sidecar for constants ([8a42017](https://github.com/theKashey/focus-lock/commit/8a4201775b3689bdbda389a0eb15e2afde5d1d2a))

## [0.6.3](https://github.com/theKashey/focus-lock/compare/v0.6.2...v0.6.3) (2019-04-22)

### Bug Fixes

- allow top guard jump ([58237a3](https://github.com/theKashey/focus-lock/commit/58237a358bdab02cf75c0e41d67ef209f833dec5))

## [0.6.2](https://github.com/theKashey/focus-lock/compare/v0.6.1...v0.6.2) (2019-03-11)

### Bug Fixes

- fix guard order ([c390b1a](https://github.com/theKashey/focus-lock/commit/c390b1aa94c42c74015f87a35443444f96a43a6c))

## [0.6.1](https://github.com/theKashey/focus-lock/compare/v0.6.0...v0.6.1) (2019-03-10)

# [0.6.0](https://github.com/theKashey/focus-lock/compare/v0.5.4...v0.6.0) (2019-03-09)

### Features

- multi target lock ([79bce83](https://github.com/theKashey/focus-lock/commit/79bce837afed02ca9b1e71ee0dcf4f1b74367133))

## [0.5.4](https://github.com/theKashey/focus-lock/compare/v0.5.3...v0.5.4) (2019-01-22)

### Bug Fixes

- failback to focusable node if tabble not exists ([8b9d018](https://github.com/theKashey/focus-lock/commit/8b9d01882d4191cf436606515043d7dfe9bc52a5))

## [0.5.3](https://github.com/theKashey/focus-lock/compare/v0.5.2...v0.5.3) (2018-11-11)

### Bug Fixes

- disabled buttons with tab indexes ([632e08e](https://github.com/theKashey/focus-lock/commit/632e08ec58c1a1d49b6b148edd2f3602298ff1d9))

## [0.5.2](https://github.com/theKashey/focus-lock/compare/v0.5.1...v0.5.2) (2018-11-01)

## [0.5.1](https://github.com/theKashey/focus-lock/compare/v0.5.0...v0.5.1) (2018-10-24)

# [0.5.0](https://github.com/theKashey/focus-lock/compare/v0.4.2...v0.5.0) (2018-10-18)

## [0.4.2](https://github.com/theKashey/focus-lock/compare/v0.4.1...v0.4.2) (2018-09-06)

## [0.4.1](https://github.com/theKashey/focus-lock/compare/v0.4.0...v0.4.1) (2018-08-28)

# [0.4.0](https://github.com/theKashey/focus-lock/compare/v0.3.0...v0.4.0) (2018-08-28)

# [0.3.0](https://github.com/theKashey/focus-lock/compare/v0.2.4...v0.3.0) (2018-05-08)

## [0.2.4](https://github.com/theKashey/focus-lock/compare/v0.2.3...v0.2.4) (2018-04-18)

## [0.2.3](https://github.com/theKashey/focus-lock/compare/v0.2.2...v0.2.3) (2018-04-18)

## [0.2.2](https://github.com/theKashey/focus-lock/compare/v0.2.1...v0.2.2) (2018-04-11)

## [0.2.1](https://github.com/theKashey/focus-lock/compare/v0.2.0...v0.2.1) (2018-03-31)

# 0.2.0 (2018-03-15)
