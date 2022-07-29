const cypress = require('cypress')
const process = require('process')
const crypto = require('crypto')
const http = require('http');

function setup(trafficlight_url, uuid) {
  console.log("Setting up trafficlight client")

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

function trafficlight(trafficlight_url, uuid) {
  cypress
    .run({
      spec: './cypress/e2e/trafficlight/*.ts',
      env: {
        "TRAFFICLIGHT_URL": trafficlight_url,
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
      console.log(results)
      uuid = crypto.randomUUID()
      setup(trafficlight_url, uuid)
      trafficlight(trafficlight_url, uuid)
    })
    .catch((err) => {
      console.error(err)
    })
}

function trafficlight_oneshot(trafficlight_url, uuid) {
  cypress
    .open({
      spec: './cypress/e2e/trafficlight/*.ts',
      env: {
        "TRAFFICLIGHT_URL": trafficlight_url,
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
      console.log(results)
    })
    .catch((err) => {
      console.error(err)
    })
}

const trafficlight_url = "http://localhost:5000"

const args =  process.argv.slice(2)
if (args[0] == "run") {
  uuid = crypto.randomUUID()
  setup(trafficlight_url, uuid)
  trafficlight(trafficlight_url, uuid)
} else if (args[0] == "open" ) {
  uuid = crypto.randomUUID()
  setup(trafficlight_url, uuid)
  trafficlight_oneshot(trafficlight_url, uuid)
} else {
  console.log("No idea what " + args[0] + "means")
}
