#!/bin/bash

set -ev

reactsdk=$(pwd)

pushd "$HOME/build"
$reactsdk/scripts/fetchdep.sh vector-im riot-web
cd riot-web

# If we've cached matrix-js-sdk/node_modules
if [ -d "$HOME/nm-cache/riot-web" ]; then
    rsync "$HOME/nm-cache/riot-web" node_modules
fi

rm -rf "node_modules/matrix-js-sdk"
rm -rf "node_modules/matrix-react-sdk"

npm install --no-audit "$HOME/build/matrix-js-sdk"
npm install --no-audit "$HOME/build/matrix-react-sdk"
npm install --no-audit

mkdir -p "$HOME/nm-cache"
rsync node_modules "$HOME/nm-cache/riot-web"

popd
