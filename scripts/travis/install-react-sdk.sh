#!/bin/bash

set -ev

rm -rf "node_modules/matrix-js-sdk"
npm install "$HOME/build/matrix-js-sdk"
npm install
