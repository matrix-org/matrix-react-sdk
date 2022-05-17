window.BENCHMARK_DATA = {
  "lastUpdate": 1652801331149,
  "repoUrl": "https://github.com/matrix-org/matrix-react-sdk",
  "entries": {
    "Cypress measurements": [
      {
        "commit": {
          "author": {
            "email": "jryans@gmail.com",
            "name": "J. Ryan Stinnett",
            "username": "jryans"
          },
          "committer": {
            "email": "noreply@github.com",
            "name": "GitHub",
            "username": "web-flow"
          },
          "distinct": true,
          "id": "c122c5cd3ba00bc62eac9a22e655424f78dd6bd8",
          "message": "Add basic performance testing via Cypress (#8586)",
          "timestamp": "2022-05-17T15:38:45+01:00",
          "tree_id": "85ef7dcfd21a62b284a9946c22ee6c527b7ab4b6",
          "url": "https://github.com/matrix-org/matrix-react-sdk/commit/c122c5cd3ba00bc62eac9a22e655424f78dd6bd8"
        },
        "date": 1652798764554,
        "tool": "jsperformanceentry",
        "benches": [
          {
            "name": "cy:1-register/register:create-account",
            "value": 1428.3999999999942,
            "unit": "ms",
            "extra": "type: measure"
          },
          {
            "name": "cy:1-register/register:from-submit-to-home",
            "value": 2813,
            "unit": "ms",
            "extra": "type: measure"
          },
          {
            "name": "cy:2-login/login:from-submit-to-home",
            "value": 2718.7999999999884,
            "unit": "ms",
            "extra": "type: measure"
          },
          {
            "name": "cy:4-create-room/create-room:from-submit-to-room",
            "value": 1572.7999999999884,
            "unit": "ms",
            "extra": "type: measure"
          }
        ]
      },
      {
        "commit": {
          "author": {
            "email": "7t3chguy@gmail.com",
            "name": "Michael Telatynski",
            "username": "t3chguy"
          },
          "committer": {
            "email": "noreply@github.com",
            "name": "GitHub",
            "username": "web-flow"
          },
          "distinct": true,
          "id": "d9b7e0721c9f01fe91dfc90cdc07f3713f1d7ca0",
          "message": "Add visual tests using Percy in Cypress (#8610)\n\n* Add basic Percy tests\r\n\r\n* Run Percy in CI\r\n\r\n* Fix snapshot timing\r\n\r\n* Fix bad selector\r\n\r\n* Hide another bit of dynamic text\r\n\r\n* Add docs",
          "timestamp": "2022-05-17T15:16:14Z",
          "tree_id": "bc2ea568557625f664bbd1f484e801279e9e46d5",
          "url": "https://github.com/matrix-org/matrix-react-sdk/commit/d9b7e0721c9f01fe91dfc90cdc07f3713f1d7ca0"
        },
        "date": 1652801320359,
        "tool": "jsperformanceentry",
        "benches": [
          {
            "name": "cy:1-register/register:create-account",
            "value": 2486.6999999999825,
            "unit": "ms",
            "extra": "type: measure"
          },
          {
            "name": "cy:1-register/register:from-submit-to-home",
            "value": 4434.6999999999825,
            "unit": "ms",
            "extra": "type: measure"
          },
          {
            "name": "cy:2-login/login:from-submit-to-home",
            "value": 3229.9000000000233,
            "unit": "ms",
            "extra": "type: measure"
          },
          {
            "name": "cy:4-create-room/create-room:from-submit-to-room",
            "value": 1869.5999999999767,
            "unit": "ms",
            "extra": "type: measure"
          }
        ]
      }
    ]
  }
}