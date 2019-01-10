#!/bin/sh

set -ex

scripts/fetchdep.sh matrix-org matrix-js-sdk
npm install matrix-js-sdk
