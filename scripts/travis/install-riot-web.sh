#!/bin/bash

set -ev

pushd "$HOME"
scripts/fetchdep.sh vector-im riot-web
cd riot-web
npm install "$HOME/matrix-js-sdk"
npm install "$HOME/matrix-react-sdk"
npm install
popd
