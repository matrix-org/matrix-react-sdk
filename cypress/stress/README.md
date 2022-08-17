# Stress tests for matrix-react-sdk

Tests to check behaviour under load e.g. lots of users all interacting
simultaneously.

These tests are not run as part of our normal CI, because they are slow.

To run these tests:

```bash
yarn run test:cypress --config-file cypress-stress.config.ts
```
