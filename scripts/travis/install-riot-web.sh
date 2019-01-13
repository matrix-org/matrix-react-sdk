#!/bin/bash

set -ev

reactsdk=$(pwd)

pushd "$HOME/build"
$reactsdk/scripts/fetchdep.sh vector-im riot-web
cd riot-web
npm install "$HOME/build/matrix-js-sdk"
npm install "$HOME/build/matrix-react-sdk"
npm install
popd
