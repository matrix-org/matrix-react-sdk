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

const cypress = require('cypress');
const process = require('process');
const crypto = require('crypto');
const http = require('http');

function setup(trafficlightUrl, uuid) {
    console.log("Setting up trafficlight client");

    const data = JSON.stringify({
        type: "element-web",
        version: "0.15.0",
    });

    const options = {
        hostname: '127.0.0.1',
        port: 5000,
        path: '/client/' + uuid + '/register',
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Content-Length': data.length,
        },
    };

    const req = http.request(options, res => {
        console.log(`statusCode: ${res.statusCode}`);

        res.on('data', d => {
        });
    });

    req.on('error', error => {
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
                "TRAFFICLIGHT_URL": trafficlightUrl,
                "TRAFFICLIGHT_UUID": uuid,
            },
            config: {
                retries: { // Override cypress.json - we want to run exactly once.
                    "openMode": 0,
                    "runMode": 0,
                },
                e2e: {
                    excludeSpecPattern: [],
                },
                videosFolder: "cypress/videos/trafficlight/"+uuid+"/",
            },
            quiet: false,
        })
        .then((results) => {
            console.log(results);
            uuid = crypto.randomUUID();
            setup(trafficlightUrl, uuid);
            trafficlight(trafficlightUrl, uuid);
        })
        .catch((err) => {
            console.error(err);
        });
}

function trafficlightOneshot(trafficlightUrl, uuid) {
    cypress
        .open({
            spec: './cypress/e2e/trafficlight/*.ts',
            env: {
                "TRAFFICLIGHT_URL": trafficlightUrl,
                "TRAFFICLIGHT_UUID": uuid,
            },
            config: {
                retries: { // Override cypress.json - we want to run exactly once.
                    "openMode": 0,
                    "runMode": 0,
                },
                videosFolder: "cypress/videos/trafficlight/"+uuid+"/",
                e2e: {
                    excludeSpecPattern: [],
                },
            },
            quiet: false,
        })
        .then((results) => {
            console.log(results);
        })
        .catch((err) => {
            console.error(err);
        });
}

const trafficlightUrl = "http://localhost:5000";

const args = process.argv.slice(2);
if (args[0] == "run") {
    let uuid = crypto.randomUUID();
    setup(trafficlightUrl, uuid);
    trafficlight(trafficlightUrl, uuid);
} else if (args[0] == "open") {
    uuid = crypto.randomUUID();
    setup(trafficlightUrl, uuid);
    trafficlightOneshot(trafficlightUrl, uuid);
} else {
    console.error("No idea what " + args[0] + "means");
    process.exit(1);
}
