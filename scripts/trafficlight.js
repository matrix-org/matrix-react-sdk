/*
Copyright 2022 The Matrix.org Foundation C.I.C.

Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

    http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.
*/
var cypress = require('cypress');
var the_process = require('process');
var the_crypto = require('crypto');
var http = require('http');
function setup(trafficlightUrl, uuid) {
    console.log('Setting up trafficlight client');
    var data = JSON.stringify({
        type: 'element-web',
        version: '0.15.0'
    });
    var options = {
        hostname: '127.0.0.1',
        port: 5000,
        path: '/client/' + uuid + '/register',
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Content-Length': data.length
        }
    };
    var req = http.request(options, function (res) {
        console.log("statusCode: ".concat(res.statusCode));
        res.on('data', function (d) {
        });
    });
    req.on('error', function (error) {
        console.error(error);
    });
    req.write(data);
    req.end();
}
function trafficlight(trafficlightUrl, uuid) {
    cypress
        .run({
        spec: './cypress/e2e/trafficlight/*.ts',
        env: {
            'TRAFFICLIGHT_URL': trafficlightUrl,
            'TRAFFICLIGHT_UUID': uuid
        },
        config: {
            retries: {
                'openMode': 0,
                'runMode': 0
            },
            e2e: {
                excludeSpecPattern: []
            },
            videosFolder: 'cypress/videos/trafficlight/' + uuid + '/'
        },
        quiet: false
    })
        .then(function (results) {
        console.log(results);
        uuid = crypto.randomUUID();
        setup(trafficlightUrl, uuid);
        trafficlight(trafficlightUrl, uuid);
    })["catch"](function (err) {
        console.error(err);
    });
}
function trafficlightOneshot(trafficlightUrl, uuid) {
    cypress
        .open({
        spec: './cypress/e2e/trafficlight/*.ts',
        env: {
            'TRAFFICLIGHT_URL': trafficlightUrl,
            'TRAFFICLIGHT_UUID': uuid
        },
        config: {
            retries: {
                'openMode': 0,
                'runMode': 0
            },
            videosFolder: 'cypress/videos/trafficlight/' + uuid + '/',
            e2e: {
                excludeSpecPattern: []
            }
        },
        quiet: false
    })
        .then(function (results) {
        console.log(results);
    })["catch"](function (err) {
        console.error(err);
    });
}
var trafficlightUrl = 'http://localhost:5000';
var args = process.argv.slice(2);
if (args[0] == 'run') {
    var uuid = crypto.randomUUID();
    setup(trafficlightUrl, uuid);
    trafficlight(trafficlightUrl, uuid);
}
else if (args[0] == 'open') {
    var uuid = crypto.randomUUID();
    setup(trafficlightUrl, uuid);
    trafficlightOneshot(trafficlightUrl, uuid);
}
else {
    console.error('No idea what ' + args[0] + 'means');
    process.exit(1);
}
