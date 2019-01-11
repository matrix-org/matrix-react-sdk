#!/bin/bash

set -ev

reactsdk=$(pwd)

pushd "$HOME"
$reactsdk/scripts/fetchdep.sh vector-im riot-web
cd riot-web
mkdir node_modules
npm install "$HOME/matrix-js-sdk"
npm install "$HOME/matrix-react-sdk"
npm install
popd
