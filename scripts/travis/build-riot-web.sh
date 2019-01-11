#!/bin/bash
#
# script which is run by the travis build (after `npm run test`).
#
# clones riot-web develop and runs the tests against our version of react-sdk.

set -ev

RIOT_WEB_DIR=riot-web
REACT_SDK_DIR=`pwd`

scripts/fetchdep.sh vector-im riot-web
pushd "$RIOT_WEB_DIR"

pushd "$REACT_SDK_DIR/matrix-js-sdk"
npm install
popd

pushd "$REACT_SDK_DIR"
npm install "$REACT_SDK_DIR/matrix-js-sdk"
npm install
popd


npm install "$REACT_SDK_DIR/matrix-js-sdk"
npm install "$REACT_SDK_DIR"
npm install

popd
