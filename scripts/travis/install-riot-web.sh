#!/bin/bash

set -ev

reactsdk=$(pwd)

pushd "$HOME/build"
$reactsdk/scripts/fetchdep.sh vector-im riot-web
cd riot-web
rm -rf "$HOME/build/matrix-js-sdk"
rm -rf "$HOME/build/matrix-react-sdk"

# If we've cached matrix-js-sdk/node_modules
if [ -d "$HOME/nm-cache/riot-web" ]; then
    rsync "$HOME/nm-cache/riot-web" node_modules
fi

npm install "$HOME/build/matrix-js-sdk"
npm install "$HOME/build/matrix-react-sdk"
npm install

mkdir -p "$HOME/nm-cache"
rsync node_modules "$HOME/nm-cache/riot-web"

popd
