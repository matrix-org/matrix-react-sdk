#!/bin/bash

set -ev

pushd "$HOME"
scripts/fetchdep.sh matrix-org matrix-js-sdk
cd matrix-js-sdk
npm install
popd
