#!/bin/bash

set -ex

scripts/fetchdep.sh matrix-org matrix-js-sdk
npm install "`pwd`/matrix-js-sdk"
pushd matrix-js-sdk
npm install
popd
