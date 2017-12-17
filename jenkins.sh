#!/bin/bash

set -e

export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && . "$NVM_DIR/nvm.sh"
nvm use 6

set -x

# install the other dependencies
npm install

# we may be using a dev branch of js-sdk in which case we need to build it
(cd node_modules/matrix-js-sdk && npm install)

# run the mocha tests
npm run test -- --no-colors

# run eslint
npm run lintall -- -f checkstyle -o eslint.xml || true

# re-run the linter, excluding any files known to have errors or warnings.
npm run lintwithexclusions

# delete the old tarball, if it exists
rm -f matrix-react-sdk-*.tgz

# build our tarball
npm pack
