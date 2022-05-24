window.BENCHMARK_DATA = {
  "lastUpdate": 1653394429466,
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
          "id": "a0cdc93642c7ed01818875d8d8955753ebea0df0",
          "message": "Rename i18n_check.yaml to i18n_check.yml",
          "timestamp": "2022-05-20T00:37:58+01:00",
          "tree_id": "135fe5d42217579228be698dd92ee407141b3225",
          "url": "https://github.com/matrix-org/matrix-react-sdk/commit/a0cdc93642c7ed01818875d8d8955753ebea0df0"
        },
        "date": 1653004014183,
        "tool": "jsperformanceentry",
        "benches": [
          {
            "name": "cy:1-register/register:create-account",
            "value": 2408.4000000000087,
            "unit": "ms",
            "extra": "type: measure"
          },
          {
            "name": "cy:1-register/register:from-submit-to-home",
            "value": 4016.5999999999913,
            "unit": "ms",
            "extra": "type: measure"
          },
          {
            "name": "cy:2-login/login:from-submit-to-home",
            "value": 3107.100000000006,
            "unit": "ms",
            "extra": "type: measure"
          },
          {
            "name": "cy:4-create-room/create-room:from-submit-to-room",
            "value": 1965.5,
            "unit": "ms",
            "extra": "type: measure"
          }
        ]
      },
      {
        "commit": {
          "author": {
            "email": "hughns@users.noreply.github.com",
            "name": "Hugh Nimmo-Smith",
            "username": "hughns"
          },
          "committer": {
            "email": "noreply@github.com",
            "name": "GitHub",
            "username": "web-flow"
          },
          "distinct": true,
          "id": "60cd740b6657f8ba8eab8b8fbcc8c59bf1dbf28f",
          "message": "Fix crash on null idp for SSO buttons (#8650)\n\n* Add test case for null identity_providers for SSO\r\n\r\n* Fix typing for identity_providers\r\n\r\n* Make null idp explicit and handle in analytics\r\n\r\n* chore: whitespace fix\r\n\r\nCo-authored-by: Michael Telatynski <7t3chguy@gmail.com>",
          "timestamp": "2022-05-20T10:08:57+01:00",
          "tree_id": "7b3e18ace8b5ea84267be60d42c5cbad386a5284",
          "url": "https://github.com/matrix-org/matrix-react-sdk/commit/60cd740b6657f8ba8eab8b8fbcc8c59bf1dbf28f"
        },
        "date": 1653038338999,
        "tool": "jsperformanceentry",
        "benches": [
          {
            "name": "cy:1-register/register:create-account",
            "value": 2656.600000000035,
            "unit": "ms",
            "extra": "type: measure"
          },
          {
            "name": "cy:1-register/register:from-submit-to-home",
            "value": 4312.299999999988,
            "unit": "ms",
            "extra": "type: measure"
          },
          {
            "name": "cy:2-login/login:from-submit-to-home",
            "value": 3992,
            "unit": "ms",
            "extra": "type: measure"
          },
          {
            "name": "cy:4-create-room/create-room:from-submit-to-room",
            "value": 2583.20000000007,
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
          "id": "30b03776b87eaa4658fb2e985d3549ba4179e715",
          "message": "Align input area with event body's first letter in a thread on IRC/modern layout (#8636)\n\nSigned-off-by: Suguru Hirahara <luixxiul@users.noreply.github.com>",
          "timestamp": "2022-05-20T10:14:37+01:00",
          "tree_id": "4c26475035667d5a763bff0d5da1fe929beee48b",
          "url": "https://github.com/matrix-org/matrix-react-sdk/commit/30b03776b87eaa4658fb2e985d3549ba4179e715"
        },
        "date": 1653038597088,
        "tool": "jsperformanceentry",
        "benches": [
          {
            "name": "cy:1-register/register:create-account",
            "value": 2492.7000000000116,
            "unit": "ms",
            "extra": "type: measure"
          },
          {
            "name": "cy:1-register/register:from-submit-to-home",
            "value": 3773.600000000006,
            "unit": "ms",
            "extra": "type: measure"
          },
          {
            "name": "cy:2-login/login:from-submit-to-home",
            "value": 2782.9000000000233,
            "unit": "ms",
            "extra": "type: measure"
          },
          {
            "name": "cy:4-create-room/create-room:from-submit-to-room",
            "value": 1923.2999999999884,
            "unit": "ms",
            "extra": "type: measure"
          }
        ]
      },
      {
        "commit": {
          "author": {
            "email": "kerrya@element.io",
            "name": "Kerry",
            "username": "kerryarchibald"
          },
          "committer": {
            "email": "noreply@github.com",
            "name": "GitHub",
            "username": "web-flow"
          },
          "distinct": true,
          "id": "804ddbb332fc40c274031d33f12e05388169fb0c",
          "message": "Live location sharing - update live location tiles (PSF-1027) (#8649)\n\n* update map svg\r\n\r\nSigned-off-by: Kerry Archibald <kerrya@element.io>\r\n\r\n* add map fallback component, update styls\r\n\r\nSigned-off-by: Kerry Archibald <kerrya@element.io>\r\n\r\n* update purple location icon style\r\n\r\nSigned-off-by: Kerry Archibald <kerrya@element.io>\r\n\r\n* fussy import ordering\r\n\r\nSigned-off-by: Kerry Archibald <kerrya@element.io>\r\n\r\n* tidy\r\n\r\nSigned-off-by: Kerry Archibald <kerrya@element.io>",
          "timestamp": "2022-05-20T09:49:01Z",
          "tree_id": "99c23fe613894ecec4209b7e756e70bd8f63f4bb",
          "url": "https://github.com/matrix-org/matrix-react-sdk/commit/804ddbb332fc40c274031d33f12e05388169fb0c"
        },
        "date": 1653040708840,
        "tool": "jsperformanceentry",
        "benches": [
          {
            "name": "cy:1-register/register:create-account",
            "value": 2662.100000000006,
            "unit": "ms",
            "extra": "type: measure"
          },
          {
            "name": "cy:1-register/register:from-submit-to-home",
            "value": 4092.5999999999767,
            "unit": "ms",
            "extra": "type: measure"
          },
          {
            "name": "cy:2-login/login:from-submit-to-home",
            "value": 3207.600000000035,
            "unit": "ms",
            "extra": "type: measure"
          },
          {
            "name": "cy:4-create-room/create-room:from-submit-to-room",
            "value": 1680.9000000000233,
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
          "id": "762d05250167a5a5b342274ce5ecda444fe8326b",
          "message": "Fix offline status in window title not working reliably (#8656)",
          "timestamp": "2022-05-20T17:46:16+01:00",
          "tree_id": "ab17fba04709b95e27aebfdb9f679bd9e195b0c0",
          "url": "https://github.com/matrix-org/matrix-react-sdk/commit/762d05250167a5a5b342274ce5ecda444fe8326b"
        },
        "date": 1653065727788,
        "tool": "jsperformanceentry",
        "benches": [
          {
            "name": "cy:1-register/register:create-account",
            "value": 2521.7999999999884,
            "unit": "ms",
            "extra": "type: measure"
          },
          {
            "name": "cy:1-register/register:from-submit-to-home",
            "value": 3140.2999999999884,
            "unit": "ms",
            "extra": "type: measure"
          },
          {
            "name": "cy:2-login/login:from-submit-to-home",
            "value": 3393.7999999999884,
            "unit": "ms",
            "extra": "type: measure"
          },
          {
            "name": "cy:4-create-room/create-room:from-submit-to-room",
            "value": 1496.5,
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
          "id": "01a3150d447be995215265d67f6063d552814dd7",
          "message": "Automatically log in after registration (#8654)",
          "timestamp": "2022-05-20T19:14:17+02:00",
          "tree_id": "4674f9f3d67dabaebefc7afde06ccbeff8efc0e8",
          "url": "https://github.com/matrix-org/matrix-react-sdk/commit/01a3150d447be995215265d67f6063d552814dd7"
        },
        "date": 1653067317698,
        "tool": "jsperformanceentry",
        "benches": [
          {
            "name": "cy:1-register/register:create-account",
            "value": 2464.0999999999767,
            "unit": "ms",
            "extra": "type: measure"
          },
          {
            "name": "cy:1-register/register:from-submit-to-home",
            "value": 3402.100000000006,
            "unit": "ms",
            "extra": "type: measure"
          },
          {
            "name": "cy:2-login/login:from-submit-to-home",
            "value": 2867,
            "unit": "ms",
            "extra": "type: measure"
          },
          {
            "name": "cy:4-create-room/create-room:from-submit-to-room",
            "value": 1589.4000000000233,
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
          "id": "e1e87ac0196bd4bdebf3a47f70591c77462c2255",
          "message": "Fix styles of \"Show all\" link button on ReactionsRow (#8658)",
          "timestamp": "2022-05-21T11:38:50+02:00",
          "tree_id": "47f375a4e198bb7aefe8ec8e250fd6ca872cec41",
          "url": "https://github.com/matrix-org/matrix-react-sdk/commit/e1e87ac0196bd4bdebf3a47f70591c77462c2255"
        },
        "date": 1653126417114,
        "tool": "jsperformanceentry",
        "benches": [
          {
            "name": "cy:1-register/register:create-account",
            "value": 2497.100000000093,
            "unit": "ms",
            "extra": "type: measure"
          },
          {
            "name": "cy:1-register/register:from-submit-to-home",
            "value": 3841.8000000000466,
            "unit": "ms",
            "extra": "type: measure"
          },
          {
            "name": "cy:2-login/login:from-submit-to-home",
            "value": 2977.5999999999767,
            "unit": "ms",
            "extra": "type: measure"
          },
          {
            "name": "cy:4-create-room/create-room:from-submit-to-room",
            "value": 1879.5,
            "unit": "ms",
            "extra": "type: measure"
          }
        ]
      },
      {
        "commit": {
          "author": {
            "email": "pvdeejay@gmail.com",
            "name": "pvagner",
            "username": "pvagner"
          },
          "committer": {
            "email": "noreply@github.com",
            "name": "GitHub",
            "username": "web-flow"
          },
          "distinct": true,
          "id": "c1c3ed6a9ec1822fe0116844fb8dc82ed87f82dc",
          "message": "Slightly better presentation of read receipts to screen reader users (#8662)",
          "timestamp": "2022-05-21T13:06:47+02:00",
          "tree_id": "3486fa70665f9500bf25ce5f44cc56dd61928ca2",
          "url": "https://github.com/matrix-org/matrix-react-sdk/commit/c1c3ed6a9ec1822fe0116844fb8dc82ed87f82dc"
        },
        "date": 1653131821340,
        "tool": "jsperformanceentry",
        "benches": [
          {
            "name": "cy:1-register/register:create-account",
            "value": 2516.5,
            "unit": "ms",
            "extra": "type: measure"
          },
          {
            "name": "cy:1-register/register:from-submit-to-home",
            "value": 3964.5,
            "unit": "ms",
            "extra": "type: measure"
          },
          {
            "name": "cy:2-login/login:from-submit-to-home",
            "value": 3248,
            "unit": "ms",
            "extra": "type: measure"
          },
          {
            "name": "cy:4-create-room/create-room:from-submit-to-room",
            "value": 2184.2999999999884,
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
          "id": "5082d67dc177caede5c879db5da34d7038b1639c",
          "message": "Fix wide image overflowing from the thumbnail container (#8663)",
          "timestamp": "2022-05-21T14:42:55Z",
          "tree_id": "42f37602d74459d4fba05fbe7402f78e5bbb57e4",
          "url": "https://github.com/matrix-org/matrix-react-sdk/commit/5082d67dc177caede5c879db5da34d7038b1639c"
        },
        "date": 1653144659665,
        "tool": "jsperformanceentry",
        "benches": [
          {
            "name": "cy:1-register/register:create-account",
            "value": 2402.5,
            "unit": "ms",
            "extra": "type: measure"
          },
          {
            "name": "cy:1-register/register:from-submit-to-home",
            "value": 3546,
            "unit": "ms",
            "extra": "type: measure"
          },
          {
            "name": "cy:2-login/login:from-submit-to-home",
            "value": 3050.2999999999884,
            "unit": "ms",
            "extra": "type: measure"
          },
          {
            "name": "cy:4-create-room/create-room:from-submit-to-room",
            "value": 1956.0999999999767,
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
          "id": "23babbb8ab5e81b3d0e9c4cac0af235b38347549",
          "message": "Normalize inline spacing of image and file button on ThreadView (#8664)",
          "timestamp": "2022-05-21T22:19:56+02:00",
          "tree_id": "97b7ded7d3ebfd0e5b5fcadfce2217d38335e32b",
          "url": "https://github.com/matrix-org/matrix-react-sdk/commit/23babbb8ab5e81b3d0e9c4cac0af235b38347549"
        },
        "date": 1653164956654,
        "tool": "jsperformanceentry",
        "benches": [
          {
            "name": "cy:1-register/register:create-account",
            "value": 2860.100000000006,
            "unit": "ms",
            "extra": "type: measure"
          },
          {
            "name": "cy:1-register/register:from-submit-to-home",
            "value": 4320,
            "unit": "ms",
            "extra": "type: measure"
          },
          {
            "name": "cy:2-login/login:from-submit-to-home",
            "value": 4416.199999999953,
            "unit": "ms",
            "extra": "type: measure"
          },
          {
            "name": "cy:4-create-room/create-room:from-submit-to-room",
            "value": 2396.9000000000233,
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
          "id": "6825b43f421e3a69a46212e7aaeabfd7dfa161d8",
          "message": "Set spacing declarations to elements in mx_EventTile_mediaLine (#8665)",
          "timestamp": "2022-05-22T08:19:45+02:00",
          "tree_id": "e9a68e629a7b9b0f2b1e8764ca3967c31b741db5",
          "url": "https://github.com/matrix-org/matrix-react-sdk/commit/6825b43f421e3a69a46212e7aaeabfd7dfa161d8"
        },
        "date": 1653201066887,
        "tool": "jsperformanceentry",
        "benches": [
          {
            "name": "cy:1-register/register:create-account",
            "value": 1819.1999999999825,
            "unit": "ms",
            "extra": "type: measure"
          },
          {
            "name": "cy:1-register/register:from-submit-to-home",
            "value": 3946.7000000000116,
            "unit": "ms",
            "extra": "type: measure"
          },
          {
            "name": "cy:2-login/login:from-submit-to-home",
            "value": 4395.900000000023,
            "unit": "ms",
            "extra": "type: measure"
          },
          {
            "name": "cy:4-create-room/create-room:from-submit-to-room",
            "value": 2652.5,
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
          "id": "11cb48176e01befe00d81f1a119c9a76c33be9b4",
          "message": "Fix other user's displayName being wrapped on the bubble message layout (#8456)",
          "timestamp": "2022-05-22T09:07:29+02:00",
          "tree_id": "3704fa48af05cda864a75a59a535525b9add34cb",
          "url": "https://github.com/matrix-org/matrix-react-sdk/commit/11cb48176e01befe00d81f1a119c9a76c33be9b4"
        },
        "date": 1653203688684,
        "tool": "jsperformanceentry",
        "benches": [
          {
            "name": "cy:1-register/register:create-account",
            "value": 2316.9000000000233,
            "unit": "ms",
            "extra": "type: measure"
          },
          {
            "name": "cy:1-register/register:from-submit-to-home",
            "value": 3529.100000000006,
            "unit": "ms",
            "extra": "type: measure"
          },
          {
            "name": "cy:2-login/login:from-submit-to-home",
            "value": 3076.7000000000116,
            "unit": "ms",
            "extra": "type: measure"
          },
          {
            "name": "cy:4-create-room/create-room:from-submit-to-room",
            "value": 1790.3000000000175,
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
          "id": "5446d5d6ba1b70ef410207977160af1efebaf091",
          "message": "Fix position of wide images on IRC / modern layout (#8667)\n\n* Move declarations related to position from _MImageBody.scss to _EventTile.scss\r\n\r\nThese declarations should not be defined as default values as position depends on other factors such as layout, etc.\r\n\r\nSigned-off-by: Suguru Hirahara <luixxiul@users.noreply.github.com>\r\n\r\n* Move min-height and min-width declarations from _MImageBody.scss to _EventTile.scss\r\n\r\nSince min-height and min-width have been specified for bubble layout, the declarations have been expected to be applied to the other layouts.\r\n\r\nSigned-off-by: Suguru Hirahara <luixxiul@users.noreply.github.com>\r\n\r\n* Apply 'justify-content: center' to bubble layout only\r\n\r\n'justify-content: center' was added for the bubble layout with 1436f23. It should not be applied to the other layouts.\r\n\r\nIn order to prevent an issue related to cascading from happening, 'justify-content: flex-start' is explicitly specified.\r\n\r\nSigned-off-by: Suguru Hirahara <luixxiul@users.noreply.github.com>\r\n\r\n* yarn run lint:style --fix\r\n\r\nSigned-off-by: Suguru Hirahara <luixxiul@users.noreply.github.com>",
          "timestamp": "2022-05-23T09:02:13+02:00",
          "tree_id": "1477cdf47708405daabdfa790158d31cde98c7c0",
          "url": "https://github.com/matrix-org/matrix-react-sdk/commit/5446d5d6ba1b70ef410207977160af1efebaf091"
        },
        "date": 1653289811015,
        "tool": "jsperformanceentry",
        "benches": [
          {
            "name": "cy:1-register/register:create-account",
            "value": 2385.2000000000116,
            "unit": "ms",
            "extra": "type: measure"
          },
          {
            "name": "cy:1-register/register:from-submit-to-home",
            "value": 3615.100000000006,
            "unit": "ms",
            "extra": "type: measure"
          },
          {
            "name": "cy:2-login/login:from-submit-to-home",
            "value": 3115.100000000006,
            "unit": "ms",
            "extra": "type: measure"
          },
          {
            "name": "cy:4-create-room/create-room:from-submit-to-room",
            "value": 1902.3000000000175,
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
          "id": "67b0078b334e6ebd509c9f0679fa4624b1a0154f",
          "message": "Integrate thread panel's header style declarations with those of BaseCard (#8651)\n\n* Variable on mx_BaseCard_Header\r\n\r\n- Use a variable for margin of buttons on mx_BaseCard_header\r\n- Reduce default margin instead of setting negative left and right values\r\n- Set margin to span in order to ensure spacing between the back button and the span (6px: 30px - 24px)\r\n\r\nSigned-off-by: Suguru Hirahara <luixxiul@users.noreply.github.com>\r\n\r\n* Use the same variable to the mask button\r\n\r\nSigned-off-by: Suguru Hirahara <luixxiul@users.noreply.github.com>\r\n\r\n* Use spacing variables\r\n\r\nSigned-off-by: Suguru Hirahara <luixxiul@users.noreply.github.com>\r\n\r\n* Remove obsolete declarations - mx_ThreadPanel_button\r\n\r\nmx_ThreadPanel_button does not seem to be used anywhere.\r\n\r\nSigned-off-by: Suguru Hirahara <luixxiul@users.noreply.github.com>",
          "timestamp": "2022-05-23T09:42:48+02:00",
          "tree_id": "b4761b9b81d431063622aba154ce94183d2dfd86",
          "url": "https://github.com/matrix-org/matrix-react-sdk/commit/67b0078b334e6ebd509c9f0679fa4624b1a0154f"
        },
        "date": 1653292269198,
        "tool": "jsperformanceentry",
        "benches": [
          {
            "name": "cy:1-register/register:create-account",
            "value": 2472.100000000006,
            "unit": "ms",
            "extra": "type: measure"
          },
          {
            "name": "cy:1-register/register:from-submit-to-home",
            "value": 3823.7999999999884,
            "unit": "ms",
            "extra": "type: measure"
          },
          {
            "name": "cy:2-login/login:from-submit-to-home",
            "value": 2912.100000000006,
            "unit": "ms",
            "extra": "type: measure"
          },
          {
            "name": "cy:4-create-room/create-room:from-submit-to-room",
            "value": 1323.5999999999767,
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
          "id": "eb977e6e7d2ac60faa24b9d1e91fdfb183d4c56b",
          "message": "Add padding to event info tile for MessageTimestamp on TimelineCard (#8639)\n\n* Add padding-right to EventTile_line in EventTile_info on TimelineCard\r\n\r\nAlso ensure the same padding values are applied to EventTile_line on TimelineCard.\r\n\r\nSigned-off-by: Suguru Hirahara <luixxiul@users.noreply.github.com>\r\n\r\n* Remove git diff\r\n\r\nSigned-off-by: Suguru Hirahara <luixxiul@users.noreply.github.com>",
          "timestamp": "2022-05-23T09:52:52Z",
          "tree_id": "50dfd6d2a5fb1c1683f300def185e341fd59b2b7",
          "url": "https://github.com/matrix-org/matrix-react-sdk/commit/eb977e6e7d2ac60faa24b9d1e91fdfb183d4c56b"
        },
        "date": 1653300032552,
        "tool": "jsperformanceentry",
        "benches": [
          {
            "name": "cy:1-register/register:create-account",
            "value": 2599.7999999999884,
            "unit": "ms",
            "extra": "type: measure"
          },
          {
            "name": "cy:1-register/register:from-submit-to-home",
            "value": 3923.8000000000466,
            "unit": "ms",
            "extra": "type: measure"
          },
          {
            "name": "cy:2-login/login:from-submit-to-home",
            "value": 3259,
            "unit": "ms",
            "extra": "type: measure"
          },
          {
            "name": "cy:4-create-room/create-room:from-submit-to-room",
            "value": 1964.5,
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
          "id": "764b307e63ec835983aa23faa9b779c02a786933",
          "message": "Edit properties and values of EventTile on ThreadView (#8638)\n\n* Edit properties and values of EventTile on ThreadView\r\n\r\nSigned-off-by: Suguru Hirahara <luixxiul@users.noreply.github.com>\r\n\r\n* Remove obsolete order properties of EventTile on ThreadView\r\n\r\nThese values are no longer required as the reactions row is displayed under the message by default.\r\n\r\nSigned-off-by: Suguru Hirahara <luixxiul@users.noreply.github.com>",
          "timestamp": "2022-05-23T11:11:55+01:00",
          "tree_id": "519b6c32b8c608d0931080efde6e5f3e4130bcbb",
          "url": "https://github.com/matrix-org/matrix-react-sdk/commit/764b307e63ec835983aa23faa9b779c02a786933"
        },
        "date": 1653301237718,
        "tool": "jsperformanceentry",
        "benches": [
          {
            "name": "cy:1-register/register:create-account",
            "value": 2320.5,
            "unit": "ms",
            "extra": "type: measure"
          },
          {
            "name": "cy:1-register/register:from-submit-to-home",
            "value": 3576.600000000006,
            "unit": "ms",
            "extra": "type: measure"
          },
          {
            "name": "cy:2-login/login:from-submit-to-home",
            "value": 3005.899999999994,
            "unit": "ms",
            "extra": "type: measure"
          },
          {
            "name": "cy:4-create-room/create-room:from-submit-to-room",
            "value": 1579,
            "unit": "ms",
            "extra": "type: measure"
          }
        ]
      },
      {
        "commit": {
          "author": {
            "email": "iteration@gmail.com",
            "name": "James Salter",
            "username": "novocaine"
          },
          "committer": {
            "email": "noreply@github.com",
            "name": "GitHub",
            "username": "web-flow"
          },
          "distinct": true,
          "id": "4f9598361f41a9b0a4fb59ae3a55ad3e04612169",
          "message": "Add the option to disable hardware acceleration (#8655)",
          "timestamp": "2022-05-23T11:23:40+01:00",
          "tree_id": "901324ca085af232a26f839d6a150634934e4d78",
          "url": "https://github.com/matrix-org/matrix-react-sdk/commit/4f9598361f41a9b0a4fb59ae3a55ad3e04612169"
        },
        "date": 1653301957943,
        "tool": "jsperformanceentry",
        "benches": [
          {
            "name": "cy:1-register/register:create-account",
            "value": 2694.9000000000233,
            "unit": "ms",
            "extra": "type: measure"
          },
          {
            "name": "cy:1-register/register:from-submit-to-home",
            "value": 3581.5,
            "unit": "ms",
            "extra": "type: measure"
          },
          {
            "name": "cy:2-login/login:from-submit-to-home",
            "value": 3298.100000000006,
            "unit": "ms",
            "extra": "type: measure"
          },
          {
            "name": "cy:4-create-room/create-room:from-submit-to-room",
            "value": 1938,
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
          "id": "20fd68b90227dbdbc21015965485f3b844626150",
          "message": "Organize UserInfo.scss (#8461)\n\n* .mx_UserInfo_profileField under .mx_UserInfo_memberDetails\r\n\r\nSigned-off-by: Suguru Hirahara <luixxiul@users.noreply.github.com>\r\n\r\n* .mx_UserInfo_container:not(.mx_UserInfo_separator) under .mx_UserInfo_container\r\n\r\nSigned-off-by: Suguru Hirahara <luixxiul@users.noreply.github.com>\r\n\r\n* reorganize structure of .mx_UserInfo_avatar - 1\r\n\r\n.mx_UserInfo_avatar > div > div *\r\n\r\nSigned-off-by: Suguru Hirahara <luixxiul@users.noreply.github.com>\r\n\r\n* reorganize structure of .mx_UserInfo_avatar - 2\r\n\r\n.mx_UserInfo_avatar > div > div\r\n\r\nSigned-off-by: Suguru Hirahara <luixxiul@users.noreply.github.com>\r\n\r\n* reorganize structure of .mx_UserInfo_avatar - 3\r\n\r\n.mx_UserInfo_avatar > div\r\n\r\nSigned-off-by: Suguru Hirahara <luixxiul@users.noreply.github.com>\r\n\r\n* reorganize structure of .mx_UserInfo_avatar - 4\r\n\r\n- .mx_BaseAvatar_initial\r\n- .mx_BaseAvatar\r\n\r\nSigned-off-by: Suguru Hirahara <luixxiul@users.noreply.github.com>\r\n\r\n* reorganize structure of .mx_UserInfo_avatar - 5\r\n\r\nMove .mx_BaseAvatar_initial under .mx_BaseAvatar\r\n\r\nSigned-off-by: Suguru Hirahara <luixxiul@users.noreply.github.com>\r\n\r\n* Replace a wildcard with className\r\n\r\nSigned-off-by: Suguru Hirahara <luixxiul@users.noreply.github.com>\r\n\r\n* Specify className\r\n\r\nSigned-off-by: Suguru Hirahara <luixxiul@users.noreply.github.com>\r\n\r\n* .mx_UserInfo.mx_BaseCard.mx_UserInfo_smallAvatar\r\n\r\nSigned-off-by: Suguru Hirahara <luixxiul@users.noreply.github.com>\r\n\r\n* Use variables\r\n\r\nSigned-off-by: Suguru Hirahara <luixxiul@users.noreply.github.com>\r\n\r\n* Fix position of the E2E icon of expanding sessions button\r\n\r\nTo prevent the icon from moving down a little bit\r\n\r\nSigned-off-by: Suguru Hirahara <luixxiul@users.noreply.github.com>\r\n\r\n* yarn run lint:style --fix\r\n\r\nSigned-off-by: Suguru Hirahara <luixxiul@users.noreply.github.com>",
          "timestamp": "2022-05-23T12:42:31+01:00",
          "tree_id": "d703ad3ba4dfd258366787040bc06223d27b8174",
          "url": "https://github.com/matrix-org/matrix-react-sdk/commit/20fd68b90227dbdbc21015965485f3b844626150"
        },
        "date": 1653306733371,
        "tool": "jsperformanceentry",
        "benches": [
          {
            "name": "cy:1-register/register:create-account",
            "value": 2624.7999999999884,
            "unit": "ms",
            "extra": "type: measure"
          },
          {
            "name": "cy:1-register/register:from-submit-to-home",
            "value": 4129,
            "unit": "ms",
            "extra": "type: measure"
          },
          {
            "name": "cy:2-login/login:from-submit-to-home",
            "value": 3674.399999999994,
            "unit": "ms",
            "extra": "type: measure"
          },
          {
            "name": "cy:4-create-room/create-room:from-submit-to-room",
            "value": 2565.7999999999884,
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
          "id": "b4d657b21f2bbf1e7a56f91672f06e9c0cc12cfe",
          "message": "Fix emoji picker for editing thread responses (#8671)",
          "timestamp": "2022-05-23T16:07:17+01:00",
          "tree_id": "8f92a1fa8b4e63afd24f44ca0b39380684395532",
          "url": "https://github.com/matrix-org/matrix-react-sdk/commit/b4d657b21f2bbf1e7a56f91672f06e9c0cc12cfe"
        },
        "date": 1653319471948,
        "tool": "jsperformanceentry",
        "benches": [
          {
            "name": "cy:1-register/register:create-account",
            "value": 2504,
            "unit": "ms",
            "extra": "type: measure"
          },
          {
            "name": "cy:1-register/register:from-submit-to-home",
            "value": 3782.600000000006,
            "unit": "ms",
            "extra": "type: measure"
          },
          {
            "name": "cy:2-login/login:from-submit-to-home",
            "value": 3133.2999999999884,
            "unit": "ms",
            "extra": "type: measure"
          },
          {
            "name": "cy:4-create-room/create-room:from-submit-to-room",
            "value": 1717.2999999999884,
            "unit": "ms",
            "extra": "type: measure"
          }
        ]
      },
      {
        "commit": {
          "author": {
            "email": "r00ster91@protonmail.com",
            "name": "r00ster",
            "username": "r00ster91"
          },
          "committer": {
            "email": "noreply@github.com",
            "name": "GitHub",
            "username": "web-flow"
          },
          "distinct": true,
          "id": "5b51efd8614aa358533bcad80791bd153319d87d",
          "message": "Make system fonts work more reliably (#8602)\n\n* Make system fonts work more reliably\r\n\r\n* Make it more sophisticated\r\n\r\n* Missing semicolon\r\n\r\n* Apply suggestions\r\n\r\n* Fix formatting\r\n\r\nCo-authored-by: Michael Telatynski <7t3chguy@gmail.com>\r\n\r\n* Create FontWatcher-test.tsx\r\n\r\n* Add actual tests\r\n\r\n* Fix some errors\r\n\r\n* Apply suggestions\r\n\r\n* Apply suggestions from code review\r\n\r\n* Apply suggestions from code review\r\n\r\n* Apply suggestions from code review\r\n\r\n* Apply suggestions from code review\r\n\r\n* Fix FontWatcher tests\r\n\r\n* Correct test fixture\r\n\r\nCo-authored-by: Michael Telatynski <7t3chguy@gmail.com>",
          "timestamp": "2022-05-23T17:29:16+01:00",
          "tree_id": "30cac1c22eeb05e6f445c01913c3746c3315115d",
          "url": "https://github.com/matrix-org/matrix-react-sdk/commit/5b51efd8614aa358533bcad80791bd153319d87d"
        },
        "date": 1653323940306,
        "tool": "jsperformanceentry",
        "benches": [
          {
            "name": "cy:1-register/register:create-account",
            "value": 2542.899999999994,
            "unit": "ms",
            "extra": "type: measure"
          },
          {
            "name": "cy:1-register/register:from-submit-to-home",
            "value": 3786.2999999999884,
            "unit": "ms",
            "extra": "type: measure"
          },
          {
            "name": "cy:2-login/login:from-submit-to-home",
            "value": 3505.100000000006,
            "unit": "ms",
            "extra": "type: measure"
          },
          {
            "name": "cy:4-create-room/create-room:from-submit-to-room",
            "value": 2109.1999999999534,
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
          "id": "ef977146c3164b58d53fc58b1dd43198a30569a7",
          "message": "Prevent possible regressions of EventTile structurally (#8647)\n\n* '.mx_EventTile_e2eIcon_warning' and '.mx_EventTile_e2eIcon_normal'\r\n\r\n- Include '.mx_EventTile_e2eIcon_warning' and '.mx_EventTile_e2eIcon_normal'\r\n- Merge '.mx_EventTile_e2eIcon_warning' and '.mx_EventTile_e2eIcon_normal'\r\n\r\nSigned-off-by: Suguru Hirahara <luixxiul@users.noreply.github.com>\r\n\r\n* mx_EventTile_spoiler\r\n\r\n- Group 'mx_EventTile_spoiler'\r\n- mx_EventTile_spoiler.visible\r\n\r\nSigned-off-by: Suguru Hirahara <luixxiul@users.noreply.github.com>\r\n\r\n* Group 'mx_EventTile_button'\r\n\r\nSigned-off-by: Suguru Hirahara <luixxiul@users.noreply.github.com>\r\n\r\n* Group '.mx_EventTile_collapseButton' and '.mx_EventTile_expandButton'\r\n\r\nSigned-off-by: Suguru Hirahara <luixxiul@users.noreply.github.com>\r\n\r\n* Group '.mx_EventTile_body .mx_EventTile_pre_container'\r\n\r\nSigned-off-by: Suguru Hirahara <luixxiul@users.noreply.github.com>\r\n\r\n* Group '.mx_EventTile_copyButton'\r\n\r\nSigned-off-by: Suguru Hirahara <luixxiul@users.noreply.github.com>\r\n\r\n* Group '.mx_EventTile_collapseButton'\r\n\r\nSigned-off-by: Suguru Hirahara <luixxiul@users.noreply.github.com>\r\n\r\n* Group '.mx_EventTile_expandButton'\r\n\r\nSigned-off-by: Suguru Hirahara <luixxiul@users.noreply.github.com>\r\n\r\n* Group '.mx_EventTile_copyButton' and '.mx_EventTile_collapseButton'\r\n\r\nSigned-off-by: Suguru Hirahara <luixxiul@users.noreply.github.com>\r\n\r\n* Group '.mx_EventTile_collapseButton'\r\n\r\nSigned-off-by: Suguru Hirahara <luixxiul@users.noreply.github.com>\r\n\r\n* Include '.mx_EventTile_collapsedCodeBlock' in '.mx_EventTile_pre_container'\r\n\r\nCollapsed code block is displayed only in mx_EventTile_pre_container\r\n\r\nSigned-off-by: Suguru Hirahara <luixxiul@users.noreply.github.com>\r\n\r\n* .mx_EventTile_keyRequestInfo\r\n\r\n- Include '.mx_EventTile_keyRequestInfo_text' in '.mx_EventTile_keyRequestInfo'\r\n- Include '.mx_AccessibleButton' in '.mx_EventTile_keyRequestInfo_text'\r\n- Include '.mx_EventTile_keyRequestInfo_tooltip_contents p:first-child' and 'p:last-child' in '.mx_EventTile_keyRequestInfo_tooltip_contents p'\r\n\r\nSigned-off-by: Suguru Hirahara <luixxiul@users.noreply.github.com>\r\n\r\n* Separate properties of mx_EventTile_button\r\n\r\nThe properties which should only be applied to buttons inside mx_EventTile_pre_container should not be applied to the top level.\r\n\r\nSigned-off-by: Suguru Hirahara <luixxiul@users.noreply.github.com>\r\n\r\n* Apply mask-size of collapse button and expand button to ones in mx_EventTile_pre_container only\r\n\r\nSigned-off-by: Suguru Hirahara <luixxiul@users.noreply.github.com>\r\n\r\n* Move declarations of buttons from mx_EventTile_button to mx_EventTile_pre_container\r\n\r\nSigned-off-by: Suguru Hirahara <luixxiul@users.noreply.github.com>\r\n\r\n* Move buttons declarations below mx_EventTile_button\r\n\r\nSigned-off-by: Suguru Hirahara <luixxiul@users.noreply.github.com>\r\n\r\n* Include '.mx_EventTile_pre_container' in '.mx_EventTile_body .mx_EventTile_pre_container'\r\n\r\nSigned-off-by: Suguru Hirahara <luixxiul@users.noreply.github.com>\r\n\r\n* yarn run lint:style --fix\r\n\r\nSigned-off-by: Suguru Hirahara <luixxiul@users.noreply.github.com>\r\n\r\n* Specify width and height to only buttons in mx_EventTile_pre_container\r\n\r\nSigned-off-by: Suguru Hirahara <luixxiul@users.noreply.github.com>\r\n\r\n* Dedupe 'mx_EventTile_e2eIcon' ::before\r\n\r\nSigned-off-by: Suguru Hirahara <luixxiul@users.noreply.github.com>\r\n\r\n* Hide buttons in mx_EventTile_pre_container and show them on hover by default\r\n\r\nSetting \"visibility: hidden\" to mx_EventTile_button can easily cause a regression. The declaration should be exclusively applied to buttons inside mx_EventTile_pre_container, and \"visibility: visible\" should be set to those buttons only.\r\n\r\nSigned-off-by: Suguru Hirahara <luixxiul@users.noreply.github.com>\r\n\r\n* Remove redundant nestings for E2E icons\r\n\r\nSigned-off-by: Suguru Hirahara <luixxiul@users.noreply.github.com>",
          "timestamp": "2022-05-23T21:16:50+01:00",
          "tree_id": "bb6a7c98a53d0a204936030205bf26f7c70d992d",
          "url": "https://github.com/matrix-org/matrix-react-sdk/commit/ef977146c3164b58d53fc58b1dd43198a30569a7"
        },
        "date": 1653337492068,
        "tool": "jsperformanceentry",
        "benches": [
          {
            "name": "cy:1-register/register:create-account",
            "value": 2525,
            "unit": "ms",
            "extra": "type: measure"
          },
          {
            "name": "cy:1-register/register:from-submit-to-home",
            "value": 3228.399999999994,
            "unit": "ms",
            "extra": "type: measure"
          },
          {
            "name": "cy:2-login/login:from-submit-to-home",
            "value": 3216.600000000006,
            "unit": "ms",
            "extra": "type: measure"
          },
          {
            "name": "cy:4-create-room/create-room:from-submit-to-room",
            "value": 2156.5999999999767,
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
          "id": "7edc4b1965c723017661c812ba770684c841b995",
          "message": "Stop connecting to a video room if the widget messaging disappears (#8660)\n\n* Stop connecting to a video room if the widget messaging disappears\r\n\r\n* Clean up more listeners\r\n\r\n* Clean up even more listeners",
          "timestamp": "2022-05-24T07:43:27-04:00",
          "tree_id": "759eb6818be307fe2566414c4cccaf736d50d37c",
          "url": "https://github.com/matrix-org/matrix-react-sdk/commit/7edc4b1965c723017661c812ba770684c841b995"
        },
        "date": 1653393108370,
        "tool": "jsperformanceentry",
        "benches": [
          {
            "name": "cy:1-register/register:create-account",
            "value": 2570.79999999993,
            "unit": "ms",
            "extra": "type: measure"
          },
          {
            "name": "cy:1-register/register:from-submit-to-home",
            "value": 4077.5999999999767,
            "unit": "ms",
            "extra": "type: measure"
          },
          {
            "name": "cy:2-login/login:from-submit-to-home",
            "value": 3601.70000000007,
            "unit": "ms",
            "extra": "type: measure"
          },
          {
            "name": "cy:4-create-room/create-room:from-submit-to-room",
            "value": 2145.5,
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
            "email": "releases@riot.im",
            "name": "RiotRobot",
            "username": "RiotRobot"
          },
          "distinct": true,
          "id": "b0a6c216b7eca05b455fe6f6473896fff940374e",
          "message": "Resetting package fields for development",
          "timestamp": "2022-05-24T13:03:38+01:00",
          "tree_id": "0c0b1043cfba5f29ad3eb6d027cc53c7f5638c08",
          "url": "https://github.com/matrix-org/matrix-react-sdk/commit/b0a6c216b7eca05b455fe6f6473896fff940374e"
        },
        "date": 1653394418733,
        "tool": "jsperformanceentry",
        "benches": [
          {
            "name": "cy:1-register/register:create-account",
            "value": 2640.100000000006,
            "unit": "ms",
            "extra": "type: measure"
          },
          {
            "name": "cy:1-register/register:from-submit-to-home",
            "value": 4255.299999999988,
            "unit": "ms",
            "extra": "type: measure"
          },
          {
            "name": "cy:2-login/login:from-submit-to-home",
            "value": 3549.7999999999884,
            "unit": "ms",
            "extra": "type: measure"
          },
          {
            "name": "cy:4-create-room/create-room:from-submit-to-room",
            "value": 1782.7999999999884,
            "unit": "ms",
            "extra": "type: measure"
          }
        ]
      }
    ]
  }
}