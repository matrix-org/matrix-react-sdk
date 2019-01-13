#!/bin/bash

set -ev

reactsdk=$(pwd)

pushd "$HOME/build"

$reactsdk/scripts/fetchdep.sh matrix-org matrix-js-sdk
cd matrix-js-sdk

# If we've cached matrix-js-sdk/node_modules
if [ -d "$HOME/nm-cache/js-sdk" ]; then
    rsync "$HOME/nm-cache/js-sdk" node_modules
fi

npm install

mkdir -p "$HOME/nm-cache"
rsync node_modules "$HOME/nm-cache/js-sdk"

popd
