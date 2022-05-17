window.BENCHMARK_DATA = {
  "lastUpdate": 1652808903134,
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
          "id": "118585a67219e5538f8ac44bfd194b7255b0d4be",
          "message": "Update weblateToCounterpart to be more resilient (#8633)\n\n* Remove unused code for weblate->counterpart conversion\r\n\r\nHappens at build time instead now\r\n\r\n* Update `weblateToCounterpart` to be more resilient",
          "timestamp": "2022-05-17T17:44:29+01:00",
          "tree_id": "54cc52e2b799b9e59e2f43126f7b3bcc9bdffa15",
          "url": "https://github.com/matrix-org/matrix-react-sdk/commit/118585a67219e5538f8ac44bfd194b7255b0d4be"
        },
        "date": 1652806426786,
        "tool": "jsperformanceentry",
        "benches": [
          {
            "name": "cy:1-register/register:create-account",
            "value": 2372.600000000006,
            "unit": "ms",
            "extra": "type: measure"
          },
          {
            "name": "cy:1-register/register:from-submit-to-home",
            "value": 4019.0999999999767,
            "unit": "ms",
            "extra": "type: measure"
          },
          {
            "name": "cy:2-login/login:from-submit-to-home",
            "value": 3808.399999999994,
            "unit": "ms",
            "extra": "type: measure"
          },
          {
            "name": "cy:4-create-room/create-room:from-submit-to-room",
            "value": 1998.5,
            "unit": "ms",
            "extra": "type: measure"
          }
        ]
      },
      {
        "commit": {
          "author": {
            "email": "admin@riot.im",
            "name": "Element Translate Bot",
            "username": "RiotTranslateBot"
          },
          "committer": {
            "email": "noreply@github.com",
            "name": "GitHub",
            "username": "web-flow"
          },
          "distinct": true,
          "id": "7603132c32a835fec3091c14448102603903350a",
          "message": "Translations update from Weblate (#8630)\n\n* Translated using Weblate (Spanish)\r\n\r\nCurrently translated at 100.0% (3426 of 3426 strings)\r\n\r\nTranslation: Element Web/matrix-react-sdk\r\nTranslate-URL: https://translate.element.io/projects/element-web/matrix-react-sdk/es/\r\n\r\n* Translated using Weblate (Swedish)\r\n\r\nCurrently translated at 100.0% (3426 of 3426 strings)\r\n\r\nTranslation: Element Web/matrix-react-sdk\r\nTranslate-URL: https://translate.element.io/projects/element-web/matrix-react-sdk/sv/\r\n\r\n* Translated using Weblate (Ukrainian)\r\n\r\nCurrently translated at 100.0% (3426 of 3426 strings)\r\n\r\nTranslation: Element Web/matrix-react-sdk\r\nTranslate-URL: https://translate.element.io/projects/element-web/matrix-react-sdk/uk/\r\n\r\n* Translated using Weblate (Czech)\r\n\r\nCurrently translated at 100.0% (3426 of 3426 strings)\r\n\r\nTranslation: Element Web/matrix-react-sdk\r\nTranslate-URL: https://translate.element.io/projects/element-web/matrix-react-sdk/cs/\r\n\r\n* Translated using Weblate (Galician)\r\n\r\nCurrently translated at 100.0% (3426 of 3426 strings)\r\n\r\nTranslation: Element Web/matrix-react-sdk\r\nTranslate-URL: https://translate.element.io/projects/element-web/matrix-react-sdk/gl/\r\n\r\n* Translated using Weblate (Estonian)\r\n\r\nCurrently translated at 100.0% (3426 of 3426 strings)\r\n\r\nTranslation: Element Web/matrix-react-sdk\r\nTranslate-URL: https://translate.element.io/projects/element-web/matrix-react-sdk/et/\r\n\r\n* Translated using Weblate (Lao)\r\n\r\nCurrently translated at 100.0% (3426 of 3426 strings)\r\n\r\nTranslation: Element Web/matrix-react-sdk\r\nTranslate-URL: https://translate.element.io/projects/element-web/matrix-react-sdk/lo/\r\n\r\n* Translated using Weblate (Esperanto)\r\n\r\nCurrently translated at 80.6% (2764 of 3426 strings)\r\n\r\nTranslation: Element Web/matrix-react-sdk\r\nTranslate-URL: https://translate.element.io/projects/element-web/matrix-react-sdk/eo/\r\n\r\n* Translated using Weblate (Chinese (Traditional))\r\n\r\nCurrently translated at 100.0% (3426 of 3426 strings)\r\n\r\nTranslation: Element Web/matrix-react-sdk\r\nTranslate-URL: https://translate.element.io/projects/element-web/matrix-react-sdk/zh_Hant/\r\n\r\n* Translated using Weblate (Esperanto)\r\n\r\nCurrently translated at 80.9% (2773 of 3426 strings)\r\n\r\nTranslation: Element Web/matrix-react-sdk\r\nTranslate-URL: https://translate.element.io/projects/element-web/matrix-react-sdk/eo/\r\n\r\n* Translated using Weblate (Indonesian)\r\n\r\nCurrently translated at 100.0% (3426 of 3426 strings)\r\n\r\nTranslation: Element Web/matrix-react-sdk\r\nTranslate-URL: https://translate.element.io/projects/element-web/matrix-react-sdk/id/\r\n\r\n* Translated using Weblate (Italian)\r\n\r\nCurrently translated at 100.0% (3426 of 3426 strings)\r\n\r\nTranslation: Element Web/matrix-react-sdk\r\nTranslate-URL: https://translate.element.io/projects/element-web/matrix-react-sdk/it/\r\n\r\n* Translated using Weblate (Chinese (Traditional))\r\n\r\nCurrently translated at 100.0% (3426 of 3426 strings)\r\n\r\nTranslation: Element Web/matrix-react-sdk\r\nTranslate-URL: https://translate.element.io/projects/element-web/matrix-react-sdk/zh_Hant/\r\n\r\n* Translated using Weblate (Ukrainian)\r\n\r\nCurrently translated at 100.0% (3426 of 3426 strings)\r\n\r\nTranslation: Element Web/matrix-react-sdk\r\nTranslate-URL: https://translate.element.io/projects/element-web/matrix-react-sdk/uk/\r\n\r\n* Translated using Weblate (Esperanto)\r\n\r\nCurrently translated at 80.9% (2775 of 3426 strings)\r\n\r\nTranslation: Element Web/matrix-react-sdk\r\nTranslate-URL: https://translate.element.io/projects/element-web/matrix-react-sdk/eo/\r\n\r\n* Translated using Weblate (Esperanto)\r\n\r\nCurrently translated at 80.9% (2775 of 3426 strings)\r\n\r\nTranslation: Element Web/matrix-react-sdk\r\nTranslate-URL: https://translate.element.io/projects/element-web/matrix-react-sdk/eo/\r\n\r\n* Translated using Weblate (Esperanto)\r\n\r\nCurrently translated at 80.9% (2775 of 3426 strings)\r\n\r\nTranslation: Element Web/matrix-react-sdk\r\nTranslate-URL: https://translate.element.io/projects/element-web/matrix-react-sdk/eo/\r\n\r\n* Translated using Weblate (Italian)\r\n\r\nCurrently translated at 100.0% (3426 of 3426 strings)\r\n\r\nTranslation: Element Web/matrix-react-sdk\r\nTranslate-URL: https://translate.element.io/projects/element-web/matrix-react-sdk/it/\r\n\r\n* Translated using Weblate (Indonesian)\r\n\r\nCurrently translated at 100.0% (3426 of 3426 strings)\r\n\r\nTranslation: Element Web/matrix-react-sdk\r\nTranslate-URL: https://translate.element.io/projects/element-web/matrix-react-sdk/id/\r\n\r\n* Translated using Weblate (Czech)\r\n\r\nCurrently translated at 100.0% (3426 of 3426 strings)\r\n\r\nTranslation: Element Web/matrix-react-sdk\r\nTranslate-URL: https://translate.element.io/projects/element-web/matrix-react-sdk/cs/\r\n\r\n* Translated using Weblate (Slovak)\r\n\r\nCurrently translated at 100.0% (3426 of 3426 strings)\r\n\r\nTranslation: Element Web/matrix-react-sdk\r\nTranslate-URL: https://translate.element.io/projects/element-web/matrix-react-sdk/sk/\r\n\r\n* Translated using Weblate (Estonian)\r\n\r\nCurrently translated at 100.0% (3426 of 3426 strings)\r\n\r\nTranslation: Element Web/matrix-react-sdk\r\nTranslate-URL: https://translate.element.io/projects/element-web/matrix-react-sdk/et/\r\n\r\n* Translated using Weblate (Lao)\r\n\r\nCurrently translated at 100.0% (3426 of 3426 strings)\r\n\r\nTranslation: Element Web/matrix-react-sdk\r\nTranslate-URL: https://translate.element.io/projects/element-web/matrix-react-sdk/lo/\r\n\r\n* Translated using Weblate (Indonesian)\r\n\r\nCurrently translated at 100.0% (3429 of 3429 strings)\r\n\r\nTranslation: Element Web/matrix-react-sdk\r\nTranslate-URL: https://translate.element.io/projects/element-web/matrix-react-sdk/id/\r\n\r\n* Translated using Weblate (German)\r\n\r\nCurrently translated at 95.4% (3274 of 3429 strings)\r\n\r\nTranslation: Element Web/matrix-react-sdk\r\nTranslate-URL: https://translate.element.io/projects/element-web/matrix-react-sdk/de/\r\n\r\n* Translated using Weblate (German)\r\n\r\nCurrently translated at 97.2% (3335 of 3429 strings)\r\n\r\nTranslation: Element Web/matrix-react-sdk\r\nTranslate-URL: https://translate.element.io/projects/element-web/matrix-react-sdk/de/\r\n\r\n* Translated using Weblate (Ukrainian)\r\n\r\nCurrently translated at 100.0% (3429 of 3429 strings)\r\n\r\nTranslation: Element Web/matrix-react-sdk\r\nTranslate-URL: https://translate.element.io/projects/element-web/matrix-react-sdk/uk/\r\n\r\n* Translated using Weblate (Czech)\r\n\r\nCurrently translated at 100.0% (3429 of 3429 strings)\r\n\r\nTranslation: Element Web/matrix-react-sdk\r\nTranslate-URL: https://translate.element.io/projects/element-web/matrix-react-sdk/cs/\r\n\r\n* Translated using Weblate (Estonian)\r\n\r\nCurrently translated at 100.0% (3429 of 3429 strings)\r\n\r\nTranslation: Element Web/matrix-react-sdk\r\nTranslate-URL: https://translate.element.io/projects/element-web/matrix-react-sdk/et/\r\n\r\n* Translated using Weblate (Slovak)\r\n\r\nCurrently translated at 100.0% (3429 of 3429 strings)\r\n\r\nTranslation: Element Web/matrix-react-sdk\r\nTranslate-URL: https://translate.element.io/projects/element-web/matrix-react-sdk/sk/\r\n\r\n* Translated using Weblate (Chinese (Traditional))\r\n\r\nCurrently translated at 100.0% (3433 of 3433 strings)\r\n\r\nTranslation: Element Web/matrix-react-sdk\r\nTranslate-URL: https://translate.element.io/projects/element-web/matrix-react-sdk/zh_Hant/\r\n\r\n* Translated using Weblate (Ukrainian)\r\n\r\nCurrently translated at 100.0% (3433 of 3433 strings)\r\n\r\nTranslation: Element Web/matrix-react-sdk\r\nTranslate-URL: https://translate.element.io/projects/element-web/matrix-react-sdk/uk/\r\n\r\n* Translated using Weblate (Indonesian)\r\n\r\nCurrently translated at 100.0% (3433 of 3433 strings)\r\n\r\nTranslation: Element Web/matrix-react-sdk\r\nTranslate-URL: https://translate.element.io/projects/element-web/matrix-react-sdk/id/\r\n\r\n* Translated using Weblate (Czech)\r\n\r\nCurrently translated at 100.0% (3433 of 3433 strings)\r\n\r\nTranslation: Element Web/matrix-react-sdk\r\nTranslate-URL: https://translate.element.io/projects/element-web/matrix-react-sdk/cs/\r\n\r\n* Translated using Weblate (Portuguese)\r\n\r\nCurrently translated at 11.7% (404 of 3432 strings)\r\n\r\nTranslation: Element Web/matrix-react-sdk\r\nTranslate-URL: https://translate.element.io/projects/element-web/matrix-react-sdk/pt/\r\n\r\n* Translated using Weblate (Indonesian)\r\n\r\nCurrently translated at 100.0% (3432 of 3432 strings)\r\n\r\nTranslation: Element Web/matrix-react-sdk\r\nTranslate-URL: https://translate.element.io/projects/element-web/matrix-react-sdk/id/\r\n\r\n* Translated using Weblate (Czech)\r\n\r\nCurrently translated at 100.0% (3432 of 3432 strings)\r\n\r\nTranslation: Element Web/matrix-react-sdk\r\nTranslate-URL: https://translate.element.io/projects/element-web/matrix-react-sdk/cs/\r\n\r\n* Translated using Weblate (Slovak)\r\n\r\nCurrently translated at 100.0% (3432 of 3432 strings)\r\n\r\nTranslation: Element Web/matrix-react-sdk\r\nTranslate-URL: https://translate.element.io/projects/element-web/matrix-react-sdk/sk/\r\n\r\n* Translated using Weblate (Italian)\r\n\r\nCurrently translated at 99.7% (3425 of 3432 strings)\r\n\r\nTranslation: Element Web/matrix-react-sdk\r\nTranslate-URL: https://translate.element.io/projects/element-web/matrix-react-sdk/it/\r\n\r\n* Translated using Weblate (Italian)\r\n\r\nCurrently translated at 100.0% (3432 of 3432 strings)\r\n\r\nTranslation: Element Web/matrix-react-sdk\r\nTranslate-URL: https://translate.element.io/projects/element-web/matrix-react-sdk/it/\r\n\r\n* Translated using Weblate (Vietnamese)\r\n\r\nCurrently translated at 89.1% (3059 of 3432 strings)\r\n\r\nTranslation: Element Web/matrix-react-sdk\r\nTranslate-URL: https://translate.element.io/projects/element-web/matrix-react-sdk/vi/\r\n\r\n* Translated using Weblate (Ukrainian)\r\n\r\nCurrently translated at 100.0% (3432 of 3432 strings)\r\n\r\nTranslation: Element Web/matrix-react-sdk\r\nTranslate-URL: https://translate.element.io/projects/element-web/matrix-react-sdk/uk/\r\n\r\n* Translated using Weblate (Vietnamese)\r\n\r\nCurrently translated at 89.1% (3059 of 3432 strings)\r\n\r\nTranslation: Element Web/matrix-react-sdk\r\nTranslate-URL: https://translate.element.io/projects/element-web/matrix-react-sdk/vi/\r\n\r\n* Translated using Weblate (Estonian)\r\n\r\nCurrently translated at 100.0% (3432 of 3432 strings)\r\n\r\nTranslation: Element Web/matrix-react-sdk\r\nTranslate-URL: https://translate.element.io/projects/element-web/matrix-react-sdk/et/\r\n\r\n* Translated using Weblate (Galician)\r\n\r\nCurrently translated at 100.0% (3432 of 3432 strings)\r\n\r\nTranslation: Element Web/matrix-react-sdk\r\nTranslate-URL: https://translate.element.io/projects/element-web/matrix-react-sdk/gl/\r\n\r\n* Translated using Weblate (Lao)\r\n\r\nCurrently translated at 100.0% (3432 of 3432 strings)\r\n\r\nTranslation: Element Web/matrix-react-sdk\r\nTranslate-URL: https://translate.element.io/projects/element-web/matrix-react-sdk/lo/\r\n\r\n* Translated using Weblate (French)\r\n\r\nCurrently translated at 99.5% (3412 of 3428 strings)\r\n\r\nTranslation: Element Web/matrix-react-sdk\r\nTranslate-URL: https://translate.element.io/projects/element-web/matrix-react-sdk/fr/\r\n\r\n* Translated using Weblate (Esperanto)\r\n\r\nCurrently translated at 80.9% (2767 of 3420 strings)\r\n\r\nTranslation: Element Web/matrix-react-sdk\r\nTranslate-URL: https://translate.element.io/projects/element-web/matrix-react-sdk/eo/\r\n\r\n* Translated using Weblate (Swedish)\r\n\r\nCurrently translated at 100.0% (3420 of 3420 strings)\r\n\r\nTranslation: Element Web/matrix-react-sdk\r\nTranslate-URL: https://translate.element.io/projects/element-web/matrix-react-sdk/sv/\r\n\r\n* Translated using Weblate (French)\r\n\r\nCurrently translated at 100.0% (3420 of 3420 strings)\r\n\r\nTranslation: Element Web/matrix-react-sdk\r\nTranslate-URL: https://translate.element.io/projects/element-web/matrix-react-sdk/fr/\r\n\r\n* Translated using Weblate (Chinese (Traditional))\r\n\r\nCurrently translated at 100.0% (3420 of 3420 strings)\r\n\r\nTranslation: Element Web/matrix-react-sdk\r\nTranslate-URL: https://translate.element.io/projects/element-web/matrix-react-sdk/zh_Hant/\r\n\r\n* Translated using Weblate (Dutch)\r\n\r\nCurrently translated at 100.0% (3420 of 3420 strings)\r\n\r\nTranslation: Element Web/matrix-react-sdk\r\nTranslate-URL: https://translate.element.io/projects/element-web/matrix-react-sdk/nl/\r\n\r\n* Translated using Weblate (Greek)\r\n\r\nCurrently translated at 98.1% (3357 of 3420 strings)\r\n\r\nTranslation: Element Web/matrix-react-sdk\r\nTranslate-URL: https://translate.element.io/projects/element-web/matrix-react-sdk/el/\r\n\r\n* Translated using Weblate (Czech)\r\n\r\nCurrently translated at 100.0% (3420 of 3420 strings)\r\n\r\nTranslation: Element Web/matrix-react-sdk\r\nTranslate-URL: https://translate.element.io/projects/element-web/matrix-react-sdk/cs/\r\n\r\n* Translated using Weblate (Chinese (Traditional))\r\n\r\nCurrently translated at 100.0% (3420 of 3420 strings)\r\n\r\nTranslation: Element Web/matrix-react-sdk\r\nTranslate-URL: https://translate.element.io/projects/element-web/matrix-react-sdk/zh_Hant/\r\n\r\n* Translated using Weblate (German)\r\n\r\nCurrently translated at 98.4% (3366 of 3420 strings)\r\n\r\nTranslation: Element Web/matrix-react-sdk\r\nTranslate-URL: https://translate.element.io/projects/element-web/matrix-react-sdk/de/\r\n\r\n* Translated using Weblate (German)\r\n\r\nCurrently translated at 98.4% (3366 of 3420 strings)\r\n\r\nTranslation: Element Web/matrix-react-sdk\r\nTranslate-URL: https://translate.element.io/projects/element-web/matrix-react-sdk/de/\r\n\r\n* Translated using Weblate (German)\r\n\r\nCurrently translated at 98.7% (3376 of 3420 strings)\r\n\r\nTranslation: Element Web/matrix-react-sdk\r\nTranslate-URL: https://translate.element.io/projects/element-web/matrix-react-sdk/de/\r\n\r\n* Translated using Weblate (German)\r\n\r\nCurrently translated at 98.7% (3376 of 3420 strings)\r\n\r\nTranslation: Element Web/matrix-react-sdk\r\nTranslate-URL: https://translate.element.io/projects/element-web/matrix-react-sdk/de/\r\n\r\n* Translated using Weblate (German)\r\n\r\nCurrently translated at 98.7% (3376 of 3420 strings)\r\n\r\nTranslation: Element Web/matrix-react-sdk\r\nTranslate-URL: https://translate.element.io/projects/element-web/matrix-react-sdk/de/\r\n\r\n* Translated using Weblate (Estonian)\r\n\r\nCurrently translated at 100.0% (3420 of 3420 strings)\r\n\r\nTranslation: Element Web/matrix-react-sdk\r\nTranslate-URL: https://translate.element.io/projects/element-web/matrix-react-sdk/et/\r\n\r\n* Translated using Weblate (Czech)\r\n\r\nCurrently translated at 100.0% (3420 of 3420 strings)\r\n\r\nTranslation: Element Web/matrix-react-sdk\r\nTranslate-URL: https://translate.element.io/projects/element-web/matrix-react-sdk/cs/\r\n\r\n* Translated using Weblate (German)\r\n\r\nCurrently translated at 98.7% (3376 of 3420 strings)\r\n\r\nTranslation: Element Web/matrix-react-sdk\r\nTranslate-URL: https://translate.element.io/projects/element-web/matrix-react-sdk/de/\r\n\r\n* Translated using Weblate (Ukrainian)\r\n\r\nCurrently translated at 100.0% (3420 of 3420 strings)\r\n\r\nTranslation: Element Web/matrix-react-sdk\r\nTranslate-URL: https://translate.element.io/projects/element-web/matrix-react-sdk/uk/\r\n\r\n* Translated using Weblate (Czech)\r\n\r\nCurrently translated at 100.0% (3420 of 3420 strings)\r\n\r\nTranslation: Element Web/matrix-react-sdk\r\nTranslate-URL: https://translate.element.io/projects/element-web/matrix-react-sdk/cs/\r\n\r\n* Translated using Weblate (Italian)\r\n\r\nCurrently translated at 100.0% (3420 of 3420 strings)\r\n\r\nTranslation: Element Web/matrix-react-sdk\r\nTranslate-URL: https://translate.element.io/projects/element-web/matrix-react-sdk/it/\r\n\r\n* Translated using Weblate (Spanish)\r\n\r\nCurrently translated at 99.8% (3415 of 3420 strings)\r\n\r\nTranslation: Element Web/matrix-react-sdk\r\nTranslate-URL: https://translate.element.io/projects/element-web/matrix-react-sdk/es/\r\n\r\n* Translated using Weblate (Slovak)\r\n\r\nCurrently translated at 100.0% (3420 of 3420 strings)\r\n\r\nTranslation: Element Web/matrix-react-sdk\r\nTranslate-URL: https://translate.element.io/projects/element-web/matrix-react-sdk/sk/\r\n\r\n* Translated using Weblate (Hungarian)\r\n\r\nCurrently translated at 99.5% (3405 of 3420 strings)\r\n\r\nTranslation: Element Web/matrix-react-sdk\r\nTranslate-URL: https://translate.element.io/projects/element-web/matrix-react-sdk/hu/\r\n\r\n* Translated using Weblate (Ukrainian)\r\n\r\nCurrently translated at 100.0% (3417 of 3417 strings)\r\n\r\nTranslation: Element Web/matrix-react-sdk\r\nTranslate-URL: https://translate.element.io/projects/element-web/matrix-react-sdk/uk/\r\n\r\n* Translated using Weblate (Ukrainian)\r\n\r\nCurrently translated at 100.0% (3417 of 3417 strings)\r\n\r\nTranslation: Element Web/matrix-react-sdk\r\nTranslate-URL: https://translate.element.io/projects/element-web/matrix-react-sdk/uk/\r\n\r\n* Translated using Weblate (Indonesian)\r\n\r\nCurrently translated at 100.0% (3417 of 3417 strings)\r\n\r\nTranslation: Element Web/matrix-react-sdk\r\nTranslate-URL: https://translate.element.io/projects/element-web/matrix-react-sdk/id/\r\n\r\n* Translated using Weblate (Czech)\r\n\r\nCurrently translated at 100.0% (3417 of 3417 strings)\r\n\r\nTranslation: Element Web/matrix-react-sdk\r\nTranslate-URL: https://translate.element.io/projects/element-web/matrix-react-sdk/cs/\r\n\r\n* Translated using Weblate (Czech)\r\n\r\nCurrently translated at 100.0% (3416 of 3416 strings)\r\n\r\nTranslation: Element Web/matrix-react-sdk\r\nTranslate-URL: https://translate.element.io/projects/element-web/matrix-react-sdk/cs/\r\n\r\n* Translated using Weblate (Estonian)\r\n\r\nCurrently translated at 100.0% (3419 of 3419 strings)\r\n\r\nTranslation: Element Web/matrix-react-sdk\r\nTranslate-URL: https://translate.element.io/projects/element-web/matrix-react-sdk/et/\r\n\r\n* Translated using Weblate (Ukrainian)\r\n\r\nCurrently translated at 100.0% (3419 of 3419 strings)\r\n\r\nTranslation: Element Web/matrix-react-sdk\r\nTranslate-URL: https://translate.element.io/projects/element-web/matrix-react-sdk/uk/\r\n\r\n* Translated using Weblate (Slovak)\r\n\r\nCurrently translated at 100.0% (3419 of 3419 strings)\r\n\r\nTranslation: Element Web/matrix-react-sdk\r\nTranslate-URL: https://translate.element.io/projects/element-web/matrix-react-sdk/sk/\r\n\r\n* Translated using Weblate (Indonesian)\r\n\r\nCurrently translated at 100.0% (3419 of 3419 strings)\r\n\r\nTranslation: Element Web/matrix-react-sdk\r\nTranslate-URL: https://translate.element.io/projects/element-web/matrix-react-sdk/id/\r\n\r\n* Translated using Weblate (Italian)\r\n\r\nCurrently translated at 100.0% (3419 of 3419 strings)\r\n\r\nTranslation: Element Web/matrix-react-sdk\r\nTranslate-URL: https://translate.element.io/projects/element-web/matrix-react-sdk/it/\r\n\r\n* Translated using Weblate (Spanish)\r\n\r\nCurrently translated at 99.9% (3417 of 3419 strings)\r\n\r\nTranslation: Element Web/matrix-react-sdk\r\nTranslate-URL: https://translate.element.io/projects/element-web/matrix-react-sdk/es/\r\n\r\n* Translated using Weblate (Spanish)\r\n\r\nCurrently translated at 100.0% (3419 of 3419 strings)\r\n\r\nTranslation: Element Web/matrix-react-sdk\r\nTranslate-URL: https://translate.element.io/projects/element-web/matrix-react-sdk/es/\r\n\r\n* Translated using Weblate (Japanese)\r\n\r\nCurrently translated at 94.8% (3244 of 3419 strings)\r\n\r\nTranslation: Element Web/matrix-react-sdk\r\nTranslate-URL: https://translate.element.io/projects/element-web/matrix-react-sdk/ja/\r\n\r\n* Translated using Weblate (Czech)\r\n\r\nCurrently translated at 100.0% (3419 of 3419 strings)\r\n\r\nTranslation: Element Web/matrix-react-sdk\r\nTranslate-URL: https://translate.element.io/projects/element-web/matrix-react-sdk/cs/\r\n\r\n* Translated using Weblate (Chinese (Traditional))\r\n\r\nCurrently translated at 100.0% (3419 of 3419 strings)\r\n\r\nTranslation: Element Web/matrix-react-sdk\r\nTranslate-URL: https://translate.element.io/projects/element-web/matrix-react-sdk/zh_Hant/\r\n\r\n* Translated using Weblate (Japanese)\r\n\r\nCurrently translated at 94.8% (3244 of 3419 strings)\r\n\r\nTranslation: Element Web/matrix-react-sdk\r\nTranslate-URL: https://translate.element.io/projects/element-web/matrix-react-sdk/ja/\r\n\r\n* Translated using Weblate (Swedish)\r\n\r\nCurrently translated at 100.0% (3419 of 3419 strings)\r\n\r\nTranslation: Element Web/matrix-react-sdk\r\nTranslate-URL: https://translate.element.io/projects/element-web/matrix-react-sdk/sv/\r\n\r\n* Translated using Weblate (Hungarian)\r\n\r\nCurrently translated at 100.0% (3419 of 3419 strings)\r\n\r\nTranslation: Element Web/matrix-react-sdk\r\nTranslate-URL: https://translate.element.io/projects/element-web/matrix-react-sdk/hu/\r\n\r\nCo-authored-by: GardeniaFair <info@gardeniafair.com>\r\nCo-authored-by: LinAGKar <linus.kardell@gmail.com>\r\nCo-authored-by: Ihor Hordiichuk <igor_ck@outlook.com>\r\nCo-authored-by: waclaw66 <waclaw66@seznam.cz>\r\nCo-authored-by: Xose M <xosem@disroot.org>\r\nCo-authored-by: Priit Jõerüüt <riot@joeruut.com>\r\nCo-authored-by: anoloth <anoloth@gmail.com>\r\nCo-authored-by: Weblate <translate@riot.im>\r\nCo-authored-by: worldspeak <septonimus@protonmail.com>\r\nCo-authored-by: Jeff Huang <s8321414@gmail.com>\r\nCo-authored-by: Linerly <linerly@protonmail.com>\r\nCo-authored-by: random <dictionary@tutamail.com>\r\nCo-authored-by: Ross Schulman <ross@rbs.io>\r\nCo-authored-by: Madison Scott-Clary <makyo@drab-makyo.com>\r\nCo-authored-by: Jozef Gaal <preklady@mayday.sk>\r\nCo-authored-by: libexus <libexus@gmail.com>\r\nCo-authored-by: Samuel mok <samuelmoktm@gmail.com>\r\nCo-authored-by: trongtran810 <trantrong810@gmail.com>\r\nCo-authored-by: Jean-Luc KABORE-TURQUIN <turquinjl@gmail.com>\r\nCo-authored-by: Glandos <bugs-github@antipoul.fr>\r\nCo-authored-by: Johan Smits <johan@smitsmail.net>\r\nCo-authored-by: Theo <tbousiou@gmail.com>\r\nCo-authored-by: uwe schmiad <lojid13236@dmosoft.com>\r\nCo-authored-by: Stefan Schmidt <thrimbor.github@gmail.com>\r\nCo-authored-by: Christian Paul <info@jaller.de>\r\nCo-authored-by: noantiq <timucin.boldt@udo.edu>\r\nCo-authored-by: iaiz <git@iapellaniz.com>\r\nCo-authored-by: Szimszon <github@oregpreshaz.eu>\r\nCo-authored-by: Dmytro Teslov <hellios.dt@gmail.com>\r\nCo-authored-by: strix aluco <strixaluco@rocketmail.com>\r\nCo-authored-by: John Doe <murat_keuls@aleeas.com>\r\nCo-authored-by: Kaede <contact@kaede.ch>\r\nCo-authored-by: Michael Telatynski <7t3chguy@gmail.com>",
          "timestamp": "2022-05-17T18:05:19+01:00",
          "tree_id": "f5c30b3472305e8b3fdf1bb2f25835560f35fdd3",
          "url": "https://github.com/matrix-org/matrix-react-sdk/commit/7603132c32a835fec3091c14448102603903350a"
        },
        "date": 1652807616884,
        "tool": "jsperformanceentry",
        "benches": [
          {
            "name": "cy:1-register/register:create-account",
            "value": 2232.0999999999767,
            "unit": "ms",
            "extra": "type: measure"
          },
          {
            "name": "cy:1-register/register:from-submit-to-home",
            "value": 3780.5,
            "unit": "ms",
            "extra": "type: measure"
          },
          {
            "name": "cy:2-login/login:from-submit-to-home",
            "value": 2998.399999999994,
            "unit": "ms",
            "extra": "type: measure"
          },
          {
            "name": "cy:4-create-room/create-room:from-submit-to-room",
            "value": 1953.2000000000116,
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
          "id": "6ffd12a027fb65cdc8b07305a2c579b54561326b",
          "message": "Sonarcloud check out upstream develop not fork develop (#8622)",
          "timestamp": "2022-05-17T18:09:28+01:00",
          "tree_id": "5f010203c9045426fa4f1b05b5380fc5a1ecdb64",
          "url": "https://github.com/matrix-org/matrix-react-sdk/commit/6ffd12a027fb65cdc8b07305a2c579b54561326b"
        },
        "date": 1652807978052,
        "tool": "jsperformanceentry",
        "benches": [
          {
            "name": "cy:1-register/register:create-account",
            "value": 2272.4000000000233,
            "unit": "ms",
            "extra": "type: measure"
          },
          {
            "name": "cy:1-register/register:from-submit-to-home",
            "value": 3388.1999999999534,
            "unit": "ms",
            "extra": "type: measure"
          },
          {
            "name": "cy:2-login/login:from-submit-to-home",
            "value": 3038.5,
            "unit": "ms",
            "extra": "type: measure"
          },
          {
            "name": "cy:4-create-room/create-room:from-submit-to-room",
            "value": 1714.100000000035,
            "unit": "ms",
            "extra": "type: measure"
          }
        ]
      },
      {
        "commit": {
          "author": {
            "email": "luixxiul@users.noreply.github.com",
            "name": "Suguru Hirahara",
            "username": "luixxiul"
          },
          "committer": {
            "email": "noreply@github.com",
            "name": "GitHub",
            "username": "web-flow"
          },
          "distinct": true,
          "id": "9889aa0de29b35e610eb51d96dae568f3debd8f0",
          "message": "Adjust EditMessageComposer style declarations (#8631)",
          "timestamp": "2022-05-17T19:12:13+02:00",
          "tree_id": "f1b58292f683d179730881176d113e9a0f86320a",
          "url": "https://github.com/matrix-org/matrix-react-sdk/commit/9889aa0de29b35e610eb51d96dae568f3debd8f0"
        },
        "date": 1652808045194,
        "tool": "jsperformanceentry",
        "benches": [
          {
            "name": "cy:1-register/register:create-account",
            "value": 2245.699999999997,
            "unit": "ms",
            "extra": "type: measure"
          },
          {
            "name": "cy:1-register/register:from-submit-to-home",
            "value": 3739.2999999999884,
            "unit": "ms",
            "extra": "type: measure"
          },
          {
            "name": "cy:2-login/login:from-submit-to-home",
            "value": 2950.4000000000233,
            "unit": "ms",
            "extra": "type: measure"
          },
          {
            "name": "cy:4-create-room/create-room:from-submit-to-room",
            "value": 1826.1000000000058,
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
          "id": "5f3a9378af9c07b9054bee3fdc728df2c3a93b41",
          "message": "Revert \"Sonarcloud check out upstream develop not fork develop (#8622)\" (#8635)\n\nThis reverts commit 6ffd12a027fb65cdc8b07305a2c579b54561326b.",
          "timestamp": "2022-05-17T18:27:27+01:00",
          "tree_id": "017e595cb176373b576e017f21b079d34410a355",
          "url": "https://github.com/matrix-org/matrix-react-sdk/commit/5f3a9378af9c07b9054bee3fdc728df2c3a93b41"
        },
        "date": 1652808893396,
        "tool": "jsperformanceentry",
        "benches": [
          {
            "name": "cy:1-register/register:create-account",
            "value": 2132.4000000000233,
            "unit": "ms",
            "extra": "type: measure"
          },
          {
            "name": "cy:1-register/register:from-submit-to-home",
            "value": 3268.899999999965,
            "unit": "ms",
            "extra": "type: measure"
          },
          {
            "name": "cy:2-login/login:from-submit-to-home",
            "value": 2877.5,
            "unit": "ms",
            "extra": "type: measure"
          },
          {
            "name": "cy:4-create-room/create-room:from-submit-to-room",
            "value": 1863.5,
            "unit": "ms",
            "extra": "type: measure"
          }
        ]
      }
    ]
  }
}