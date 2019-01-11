#!/bin/bash

set -ev

mkdir node_modules
npm install "$HOME/matrix-js-sdk"
npm install
