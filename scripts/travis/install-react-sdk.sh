#!/bin/bash

set -ev

rm -rf "node_modules/matrix-js-sdk"
npm install --no-audit "$HOME/build/matrix-js-sdk"
npm install --no-audit
