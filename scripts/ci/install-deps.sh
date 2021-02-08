#!/bin/bash

set -ex

scripts/fetchdep.sh matrix-org matrix-js-sdk

pushd matrix-js-sdk
yarn link
yarn install $@
popd

yarn link matrix-js-sdk
yarn install $@
