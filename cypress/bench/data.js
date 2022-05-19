window.BENCHMARK_DATA = {
  "lastUpdate": 1653003940088,
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
      },
      {
        "commit": {
          "author": {
            "email": "releases@riot.im",
            "name": "RiotRobot",
            "username": "RiotRobot"
          },
          "committer": {
            "email": "noreply@github.com",
            "name": "GitHub",
            "username": "web-flow"
          },
          "distinct": true,
          "id": "f427f09b8bbbee2a264721b60a0bd0d7d31b9572",
          "message": "Merge pull request #8637 from matrix-org/actions/upgrade-deps\n\nUpgrade dependencies",
          "timestamp": "2022-05-17T20:12:50+01:00",
          "tree_id": "a90f60ac046309feb0d8f2c20c46ad972a83b71e",
          "url": "https://github.com/matrix-org/matrix-react-sdk/commit/f427f09b8bbbee2a264721b60a0bd0d7d31b9572"
        },
        "date": 1652815317070,
        "tool": "jsperformanceentry",
        "benches": [
          {
            "name": "cy:1-register/register:create-account",
            "value": 2316,
            "unit": "ms",
            "extra": "type: measure"
          },
          {
            "name": "cy:1-register/register:from-submit-to-home",
            "value": 3893.3000000000175,
            "unit": "ms",
            "extra": "type: measure"
          },
          {
            "name": "cy:2-login/login:from-submit-to-home",
            "value": 3430.600000000006,
            "unit": "ms",
            "extra": "type: measure"
          },
          {
            "name": "cy:4-create-room/create-room:from-submit-to-room",
            "value": 1744.399999999965,
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
          "id": "ce73b9988e8a1c068a4d908dae6a1c68023efb6c",
          "message": "Hide image banner on stickers, they have a tooltip already (#8641)",
          "timestamp": "2022-05-18T10:08:33+01:00",
          "tree_id": "ff88deb8ec26e0ef6a6fae855f8d3afe3a9724ac",
          "url": "https://github.com/matrix-org/matrix-react-sdk/commit/ce73b9988e8a1c068a4d908dae6a1c68023efb6c"
        },
        "date": 1652865394613,
        "tool": "jsperformanceentry",
        "benches": [
          {
            "name": "cy:1-register/register:create-account",
            "value": 2475.2999999999884,
            "unit": "ms",
            "extra": "type: measure"
          },
          {
            "name": "cy:1-register/register:from-submit-to-home",
            "value": 3657,
            "unit": "ms",
            "extra": "type: measure"
          },
          {
            "name": "cy:2-login/login:from-submit-to-home",
            "value": 3481.5,
            "unit": "ms",
            "extra": "type: measure"
          },
          {
            "name": "cy:4-create-room/create-room:from-submit-to-room",
            "value": 1893.2999999999884,
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
          "id": "65e27cd6be0174c5737925f3df3db6638dd0c3fd",
          "message": "If pasting a url atop another url, don't wrap one in the other (#8642)",
          "timestamp": "2022-05-18T10:08:24+01:00",
          "tree_id": "9b4b8e2abf24f7dac3ddb950bc00613b4b6aaabb",
          "url": "https://github.com/matrix-org/matrix-react-sdk/commit/65e27cd6be0174c5737925f3df3db6638dd0c3fd"
        },
        "date": 1652865403246,
        "tool": "jsperformanceentry",
        "benches": [
          {
            "name": "cy:1-register/register:create-account",
            "value": 2458.600000000006,
            "unit": "ms",
            "extra": "type: measure"
          },
          {
            "name": "cy:1-register/register:from-submit-to-home",
            "value": 2856.9000000000233,
            "unit": "ms",
            "extra": "type: measure"
          },
          {
            "name": "cy:2-login/login:from-submit-to-home",
            "value": 2753.4000000000233,
            "unit": "ms",
            "extra": "type: measure"
          },
          {
            "name": "cy:4-create-room/create-room:from-submit-to-room",
            "value": 1965.9000000000233,
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
          "id": "8d59612c74677fb42e28bd9640cfc887e4a6f8b6",
          "message": "Merge styles of mx_EventTile_content for maintainability (#8605)\n\n* Include mx_EventTile_edited in mx_EventTile_content\r\n\r\nSigned-off-by: Suguru Hirahara <luixxiul@users.noreply.github.com>\r\n\r\n* Include mx_EventTile_pendingModeration in mx_EventTile_content\r\n\r\nSigned-off-by: Suguru Hirahara <luixxiul@users.noreply.github.com>\r\n\r\n* Merge style rules of mx_EventTile_edited and mx_EventTile_pendingModeration\r\n\r\nExcept \"cursor: pointer\" of mx_EventTile_edited\r\n\r\nSigned-off-by: Suguru Hirahara <luixxiul@users.noreply.github.com>\r\n\r\n* Include markdown-body in mx_EventTile_content\r\n\r\nSigned-off-by: Suguru Hirahara <luixxiul@users.noreply.github.com>\r\n\r\n* Include 'pre code' in 'pre'\r\n\r\nSigned-off-by: Suguru Hirahara <luixxiul@users.noreply.github.com>\r\n\r\n* Include 'mx_EventTile_content' in 'mx_EventTile_content'\r\n\r\nSigned-off-by: Suguru Hirahara <luixxiul@users.noreply.github.com>\r\n\r\n* Include 'mx_EventTile_content .markdown-body' header in 'mx_EventTile_content'\r\n\r\nSigned-off-by: Suguru Hirahara <luixxiul@users.noreply.github.com>\r\n\r\n* Include 'mx_EventTile_content .markdown-body' a, blockquote, and em in 'mx_EventTile_content'\r\n\r\nSigned-off-by: Suguru Hirahara <luixxiul@users.noreply.github.com>\r\n\r\n* Remove a comment on selector 'code'\r\n\r\nThere is technically nothing wrong that a declaration for 'code' is inherited to 'pre code'.\r\n\r\nSigned-off-by: Suguru Hirahara <luixxiul@users.noreply.github.com>",
          "timestamp": "2022-05-18T14:04:39+01:00",
          "tree_id": "580729d59e2e200ae80d240e1803020597f85c6b",
          "url": "https://github.com/matrix-org/matrix-react-sdk/commit/8d59612c74677fb42e28bd9640cfc887e4a6f8b6"
        },
        "date": 1652879606850,
        "tool": "jsperformanceentry",
        "benches": [
          {
            "name": "cy:1-register/register:create-account",
            "value": 2399.7000000000116,
            "unit": "ms",
            "extra": "type: measure"
          },
          {
            "name": "cy:1-register/register:from-submit-to-home",
            "value": 4555.399999999994,
            "unit": "ms",
            "extra": "type: measure"
          },
          {
            "name": "cy:2-login/login:from-submit-to-home",
            "value": 3601.399999999994,
            "unit": "ms",
            "extra": "type: measure"
          },
          {
            "name": "cy:4-create-room/create-room:from-submit-to-room",
            "value": 1985.3999999999942,
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
          "id": "bb4684698123b473781e40de459d8614f014ada6",
          "message": "Set common horizontal spacing rules for EventTile on the right panel (#8528)\n\n* Remove an obsolete override against .mx_EventTile_line\r\n\r\n- Move &[data-layout=bubble] under mx_ThreadView\r\n- Use variables for .mx_NewRoomIntro\r\n- Move the variable to BaseCard\r\n\r\nSigned-off-by: Suguru Hirahara <luixxiul@users.noreply.github.com>\r\n\r\n* Use --ThreadView_group_spacing-end variable\r\n\r\nSigned-off-by: Suguru Hirahara <luixxiul@users.noreply.github.com>\r\n\r\n* Apply GenericEventListSummary rules to ThreadView only\r\n\r\nThis commit stops those declarations from being applied to TimelineCard, which is also applied with mx_ThreadPanel class name.\r\n\r\nSigned-off-by: Suguru Hirahara <luixxiul@users.noreply.github.com>\r\n\r\n* Nesting - mx_GenericEventListSummary:not([data-layout=bubble])\r\n\r\nSigned-off-by: Suguru Hirahara <luixxiul@users.noreply.github.com>\r\n\r\n* yarn run lint:style --fix\r\n\r\nSigned-off-by: Suguru Hirahara <luixxiul@users.noreply.github.com>",
          "timestamp": "2022-05-18T14:08:39+01:00",
          "tree_id": "81b46cfb976cdca59eaa5b2b0267aad3492bd9ea",
          "url": "https://github.com/matrix-org/matrix-react-sdk/commit/bb4684698123b473781e40de459d8614f014ada6"
        },
        "date": 1652879864384,
        "tool": "jsperformanceentry",
        "benches": [
          {
            "name": "cy:1-register/register:create-account",
            "value": 2314.7000000000116,
            "unit": "ms",
            "extra": "type: measure"
          },
          {
            "name": "cy:1-register/register:from-submit-to-home",
            "value": 4020.9000000000233,
            "unit": "ms",
            "extra": "type: measure"
          },
          {
            "name": "cy:2-login/login:from-submit-to-home",
            "value": 2953,
            "unit": "ms",
            "extra": "type: measure"
          },
          {
            "name": "cy:4-create-room/create-room:from-submit-to-room",
            "value": 1745.7000000000116,
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
          "id": "9b92eca73d25fe86eb16adcf59b200c4f6e07eb5",
          "message": "Organize rules of GenericEventListSummary on bubble layout (#8599)\n\n* Organize - data-expanded=false\r\n\r\nSigned-off-by: Suguru Hirahara <luixxiul@users.noreply.github.com>\r\n\r\n* Organize - data-expanded=true\r\n\r\nSigned-off-by: Suguru Hirahara <luixxiul@users.noreply.github.com>\r\n\r\n* Organize - EventTile\r\n\r\nSigned-off-by: Suguru Hirahara <luixxiul@users.noreply.github.com>\r\n\r\n* Dedupe mx_GenericEventListSummary[data-layout=bubble]\r\n\r\nSigned-off-by: Suguru Hirahara <luixxiul@users.noreply.github.com>\r\n\r\n* yarn run lint:style --fix\r\n\r\nSigned-off-by: Suguru Hirahara <luixxiul@users.noreply.github.com>",
          "timestamp": "2022-05-18T14:10:02+01:00",
          "tree_id": "a0843a56f05ea4c5114b5dd22879cfad05faaac7",
          "url": "https://github.com/matrix-org/matrix-react-sdk/commit/9b92eca73d25fe86eb16adcf59b200c4f6e07eb5"
        },
        "date": 1652879893579,
        "tool": "jsperformanceentry",
        "benches": [
          {
            "name": "cy:1-register/register:create-account",
            "value": 2461.5,
            "unit": "ms",
            "extra": "type: measure"
          },
          {
            "name": "cy:1-register/register:from-submit-to-home",
            "value": 3597.7000000000116,
            "unit": "ms",
            "extra": "type: measure"
          },
          {
            "name": "cy:2-login/login:from-submit-to-home",
            "value": 3275.7000000000116,
            "unit": "ms",
            "extra": "type: measure"
          },
          {
            "name": "cy:4-create-room/create-room:from-submit-to-room",
            "value": 1933.2000000000116,
            "unit": "ms",
            "extra": "type: measure"
          }
        ]
      },
      {
        "commit": {
          "author": {
            "email": "janne@kuschku.de",
            "name": "Janne Mareike Koschinski",
            "username": "justjanne"
          },
          "committer": {
            "email": "noreply@github.com",
            "name": "GitHub",
            "username": "web-flow"
          },
          "distinct": true,
          "id": "2d386556a671af6b7ced1f89d7918a9a508353da",
          "message": "ensure metaspace changes correctly notify listeners (#8611)",
          "timestamp": "2022-05-18T15:15:25+02:00",
          "tree_id": "1e25436c6014f028a70a7469f05d350a44ade11e",
          "url": "https://github.com/matrix-org/matrix-react-sdk/commit/2d386556a671af6b7ced1f89d7918a9a508353da"
        },
        "date": 1652880242662,
        "tool": "jsperformanceentry",
        "benches": [
          {
            "name": "cy:1-register/register:create-account",
            "value": 2415.399999999994,
            "unit": "ms",
            "extra": "type: measure"
          },
          {
            "name": "cy:1-register/register:from-submit-to-home",
            "value": 3559.600000000006,
            "unit": "ms",
            "extra": "type: measure"
          },
          {
            "name": "cy:2-login/login:from-submit-to-home",
            "value": 2895,
            "unit": "ms",
            "extra": "type: measure"
          },
          {
            "name": "cy:4-create-room/create-room:from-submit-to-room",
            "value": 2185.5,
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
          "id": "c715f72745806e1cd5ba95341b6b23bc0ef4c5b0",
          "message": "Remove obsolete declarations for buttons on EditMessageComposer on ThreadView (#8632)\n\nThose declarations are no longer necessary to align the buttons with the right edge of the input area and background.\r\n\r\nSigned-off-by: Suguru Hirahara <luixxiul@users.noreply.github.com>",
          "timestamp": "2022-05-18T14:22:42+01:00",
          "tree_id": "41771844cb9be93a479888d71588be45ff0ab0c2",
          "url": "https://github.com/matrix-org/matrix-react-sdk/commit/c715f72745806e1cd5ba95341b6b23bc0ef4c5b0"
        },
        "date": 1652880635153,
        "tool": "jsperformanceentry",
        "benches": [
          {
            "name": "cy:1-register/register:create-account",
            "value": 2318.5,
            "unit": "ms",
            "extra": "type: measure"
          },
          {
            "name": "cy:1-register/register:from-submit-to-home",
            "value": 3383.2999999999884,
            "unit": "ms",
            "extra": "type: measure"
          },
          {
            "name": "cy:2-login/login:from-submit-to-home",
            "value": 3050.5,
            "unit": "ms",
            "extra": "type: measure"
          },
          {
            "name": "cy:4-create-room/create-room:from-submit-to-room",
            "value": 2056,
            "unit": "ms",
            "extra": "type: measure"
          }
        ]
      },
      {
        "commit": {
          "author": {
            "email": "travisr@matrix.org",
            "name": "Travis Ralston",
            "username": "turt2live"
          },
          "committer": {
            "email": "noreply@github.com",
            "name": "GitHub",
            "username": "web-flow"
          },
          "distinct": true,
          "id": "e87bda9f37f2c4a57b3e115162bd1e94f66c6453",
          "message": "Add an option to ignore (block) a user when reporting their events (#8471)\n\n* Add an option to ignore (block) a user when reporting their events\r\n\r\nThis is primarily useful if the content being reported really doesn't belong on your screen, and the room moderators are slow to react.\r\n\r\nIdeally we'd use the word \"block\" instead of \"ignore\", but we call it \"ignore user\" everywhere else. See https://github.com/vector-im/element-web/issues/19590 for further context on the word choice.\r\n\r\nThis change includes a minor refactor to the styles of labelled toggles (for reusability).\r\n\r\n* Appease the linter\r\n\r\n* Use a checkbox instead of toggle in the dialog\r\n\r\n* Update classnames handling for toggle switch\r\n\r\n* Appease the linter",
          "timestamp": "2022-05-18T16:20:55Z",
          "tree_id": "64390ce8537f7591c0d635184e5e866ba06a57d9",
          "url": "https://github.com/matrix-org/matrix-react-sdk/commit/e87bda9f37f2c4a57b3e115162bd1e94f66c6453"
        },
        "date": 1652891432545,
        "tool": "jsperformanceentry",
        "benches": [
          {
            "name": "cy:1-register/register:create-account",
            "value": 2732.0999999999767,
            "unit": "ms",
            "extra": "type: measure"
          },
          {
            "name": "cy:1-register/register:from-submit-to-home",
            "value": 4291.599999999977,
            "unit": "ms",
            "extra": "type: measure"
          },
          {
            "name": "cy:2-login/login:from-submit-to-home",
            "value": 4018.5999999999767,
            "unit": "ms",
            "extra": "type: measure"
          },
          {
            "name": "cy:4-create-room/create-room:from-submit-to-room",
            "value": 2570.5,
            "unit": "ms",
            "extra": "type: measure"
          }
        ]
      },
      {
        "commit": {
          "author": {
            "email": "germains@element.io",
            "name": "Germain",
            "username": "gsouquet"
          },
          "committer": {
            "email": "noreply@github.com",
            "name": "GitHub",
            "username": "web-flow"
          },
          "distinct": true,
          "id": "408f4dfe0935d7194a827ca76fb45c10a82173e1",
          "message": "Add public room directory hook (#8626)",
          "timestamp": "2022-05-19T09:03:29+01:00",
          "tree_id": "285de031630a3dc76f6070ecece0a27808a08f27",
          "url": "https://github.com/matrix-org/matrix-react-sdk/commit/408f4dfe0935d7194a827ca76fb45c10a82173e1"
        },
        "date": 1652947941586,
        "tool": "jsperformanceentry",
        "benches": [
          {
            "name": "cy:1-register/register:create-account",
            "value": 2455.5,
            "unit": "ms",
            "extra": "type: measure"
          },
          {
            "name": "cy:1-register/register:from-submit-to-home",
            "value": 3668.6999999999534,
            "unit": "ms",
            "extra": "type: measure"
          },
          {
            "name": "cy:2-login/login:from-submit-to-home",
            "value": 2742.9000000000233,
            "unit": "ms",
            "extra": "type: measure"
          },
          {
            "name": "cy:4-create-room/create-room:from-submit-to-room",
            "value": 1780.9000000000233,
            "unit": "ms",
            "extra": "type: measure"
          }
        ]
      },
      {
        "commit": {
          "author": {
            "email": "robin@robin.town",
            "name": "Robin",
            "username": "robintown"
          },
          "committer": {
            "email": "noreply@github.com",
            "name": "GitHub",
            "username": "web-flow"
          },
          "distinct": true,
          "id": "82169ab923547b1242f146f54ac2f64c98c35409",
          "message": "Patch Jitsi logs into rageshakes (#8643)",
          "timestamp": "2022-05-19T10:23:29+01:00",
          "tree_id": "7a7e89de308855a377ebcbb3dd30214dc212601a",
          "url": "https://github.com/matrix-org/matrix-react-sdk/commit/82169ab923547b1242f146f54ac2f64c98c35409"
        },
        "date": 1652952663670,
        "tool": "jsperformanceentry",
        "benches": [
          {
            "name": "cy:1-register/register:create-account",
            "value": 2615.4000000000233,
            "unit": "ms",
            "extra": "type: measure"
          },
          {
            "name": "cy:1-register/register:from-submit-to-home",
            "value": 3422.4000000000233,
            "unit": "ms",
            "extra": "type: measure"
          },
          {
            "name": "cy:2-login/login:from-submit-to-home",
            "value": 2842.9000000000233,
            "unit": "ms",
            "extra": "type: measure"
          },
          {
            "name": "cy:4-create-room/create-room:from-submit-to-room",
            "value": 1582.7999999999884,
            "unit": "ms",
            "extra": "type: measure"
          }
        ]
      },
      {
        "commit": {
          "author": {
            "email": "germains@element.io",
            "name": "Germain",
            "username": "gsouquet"
          },
          "committer": {
            "email": "noreply@github.com",
            "name": "GitHub",
            "username": "web-flow"
          },
          "distinct": true,
          "id": "3f2f839b3b44a544387b3e1f49b041e13c658e0f",
          "message": "Add jump to related event context menu item (#6775)",
          "timestamp": "2022-05-19T14:56:10+01:00",
          "tree_id": "e30a974718eb30f05ba5d78e2c73dc84a19ff3e1",
          "url": "https://github.com/matrix-org/matrix-react-sdk/commit/3f2f839b3b44a544387b3e1f49b041e13c658e0f"
        },
        "date": 1652969193668,
        "tool": "jsperformanceentry",
        "benches": [
          {
            "name": "cy:1-register/register:create-account",
            "value": 1911.3000000000466,
            "unit": "ms",
            "extra": "type: measure"
          },
          {
            "name": "cy:1-register/register:from-submit-to-home",
            "value": 4509.699999999953,
            "unit": "ms",
            "extra": "type: measure"
          },
          {
            "name": "cy:2-login/login:from-submit-to-home",
            "value": 4134.200000000012,
            "unit": "ms",
            "extra": "type: measure"
          },
          {
            "name": "cy:4-create-room/create-room:from-submit-to-room",
            "value": 2704,
            "unit": "ms",
            "extra": "type: measure"
          }
        ]
      },
      {
        "commit": {
          "author": {
            "email": "me@sumnerevans.com",
            "name": "Sumner Evans",
            "username": "sumnerevans"
          },
          "committer": {
            "email": "noreply@github.com",
            "name": "GitHub",
            "username": "web-flow"
          },
          "distinct": true,
          "id": "395b167b20a61a782dfb51191bd7babcd6a1da46",
          "message": "Show notifications even when Element is focused (#8590)",
          "timestamp": "2022-05-19T14:44:47Z",
          "tree_id": "87aca88ff92b56d4542e2a77817b80b7d4521865",
          "url": "https://github.com/matrix-org/matrix-react-sdk/commit/395b167b20a61a782dfb51191bd7babcd6a1da46"
        },
        "date": 1652972006196,
        "tool": "jsperformanceentry",
        "benches": [
          {
            "name": "cy:1-register/register:create-account",
            "value": 2430.7999999999884,
            "unit": "ms",
            "extra": "type: measure"
          },
          {
            "name": "cy:1-register/register:from-submit-to-home",
            "value": 3756.7000000000116,
            "unit": "ms",
            "extra": "type: measure"
          },
          {
            "name": "cy:2-login/login:from-submit-to-home",
            "value": 3099.899999999965,
            "unit": "ms",
            "extra": "type: measure"
          },
          {
            "name": "cy:4-create-room/create-room:from-submit-to-room",
            "value": 1881.9000000000233,
            "unit": "ms",
            "extra": "type: measure"
          }
        ]
      },
      {
        "commit": {
          "author": {
            "email": "simon.bra.ag@gmail.com",
            "name": "Šimon Brandner",
            "username": "SimonBrandner"
          },
          "committer": {
            "email": "noreply@github.com",
            "name": "GitHub",
            "username": "web-flow"
          },
          "distinct": true,
          "id": "efc36acf933406a7f29a1aef7fcd6faa20e182dd",
          "message": "Don't open the regular browser or our context menu on right-clicking the `Options` button in the message action bar (#8648)",
          "timestamp": "2022-05-19T15:26:35Z",
          "tree_id": "00786893e1fc4ac6ed1f9f4f3394aadc4c1c1950",
          "url": "https://github.com/matrix-org/matrix-react-sdk/commit/efc36acf933406a7f29a1aef7fcd6faa20e182dd"
        },
        "date": 1652974485739,
        "tool": "jsperformanceentry",
        "benches": [
          {
            "name": "cy:1-register/register:create-account",
            "value": 2403.100000000006,
            "unit": "ms",
            "extra": "type: measure"
          },
          {
            "name": "cy:1-register/register:from-submit-to-home",
            "value": 3607.8000000000175,
            "unit": "ms",
            "extra": "type: measure"
          },
          {
            "name": "cy:2-login/login:from-submit-to-home",
            "value": 3129.2999999999884,
            "unit": "ms",
            "extra": "type: measure"
          },
          {
            "name": "cy:4-create-room/create-room:from-submit-to-room",
            "value": 1855,
            "unit": "ms",
            "extra": "type: measure"
          }
        ]
      },
      {
        "commit": {
          "author": {
            "email": "oliver.sand@nordeck.net",
            "name": "Oliver Sand",
            "username": "Fox32"
          },
          "committer": {
            "email": "noreply@github.com",
            "name": "GitHub",
            "username": "web-flow"
          },
          "distinct": true,
          "id": "f7ba3f07cd0a07ea7482211faae3e2024ee5fbad",
          "message": "Support avatar_url in the scalar client API (#8550)\n\n* Support avatar_url in the scalar client API\r\n\r\nSigned-off-by: Oliver Sand <oliver.sand@nordeck.net>\r\n\r\n* Fix return type\r\n\r\n* Remove automatic upload\r\n\r\n* Remove return type\r\n\r\n* Fix indention",
          "timestamp": "2022-05-19T16:22:38-06:00",
          "tree_id": "9a5697ad310c05540a032545777e5d50a1b54542",
          "url": "https://github.com/matrix-org/matrix-react-sdk/commit/f7ba3f07cd0a07ea7482211faae3e2024ee5fbad"
        },
        "date": 1652999455943,
        "tool": "jsperformanceentry",
        "benches": [
          {
            "name": "cy:1-register/register:create-account",
            "value": 2392.399999999994,
            "unit": "ms",
            "extra": "type: measure"
          },
          {
            "name": "cy:1-register/register:from-submit-to-home",
            "value": 3651.899999999994,
            "unit": "ms",
            "extra": "type: measure"
          },
          {
            "name": "cy:2-login/login:from-submit-to-home",
            "value": 3116.1999999999825,
            "unit": "ms",
            "extra": "type: measure"
          },
          {
            "name": "cy:4-create-room/create-room:from-submit-to-room",
            "value": 2001.7000000000116,
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
          "id": "896c8c90350ec97019e99ea628f4a1d1c0d04127",
          "message": "Consolidate i18n check into a reusable workflow (#8634)\n\n* Fix i18n check bypass for RiotTranslateBot\r\n\r\n* Consolidate i18n check into a reusable workflow\r\n\r\n* Update .github/workflows/i18n_check.yaml\r\n\r\nCo-authored-by: Travis Ralston <travisr@matrix.org>\r\n\r\nCo-authored-by: Travis Ralston <travisr@matrix.org>",
          "timestamp": "2022-05-20T00:36:58+01:00",
          "tree_id": "1993063916b8ad74eb7a7406dcc7c88da0065b34",
          "url": "https://github.com/matrix-org/matrix-react-sdk/commit/896c8c90350ec97019e99ea628f4a1d1c0d04127"
        },
        "date": 1653003928293,
        "tool": "jsperformanceentry",
        "benches": [
          {
            "name": "cy:1-register/register:create-account",
            "value": 2559.7000000000116,
            "unit": "ms",
            "extra": "type: measure"
          },
          {
            "name": "cy:1-register/register:from-submit-to-home",
            "value": 3850,
            "unit": "ms",
            "extra": "type: measure"
          },
          {
            "name": "cy:2-login/login:from-submit-to-home",
            "value": 3516.9000000000233,
            "unit": "ms",
            "extra": "type: measure"
          },
          {
            "name": "cy:4-create-room/create-room:from-submit-to-room",
            "value": 1813.7999999999884,
            "unit": "ms",
            "extra": "type: measure"
          }
        ]
      }
    ]
  }
}