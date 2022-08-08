# @percy/env

This package provides various CI/CD support for Percy by coalescing different environment variables
into a common interface for consumption by `@percy/client`.

## Supported Environments

- [AppVeyor](https://docs.percy.io/docs/appveyor)
- [Azure Pipelines](https://docs.percy.io/docs/azure-pipelines)
- [Bitbucket Pipelines](https://docs.percy.io/docs/bitbucket-pipelines)
- [Buildkite](https://docs.percy.io/docs/buildkite)
- [CircleCI](https://docs.percy.io/docs/circleci)
- [Codeship](https://docs.percy.io/docs/codeship)
- [Drone CI](https://docs.percy.io/docs/drone)
- [GitHub Actions](https://docs.percy.io/docs/github-actions)
- [GitLab CI](https://docs.percy.io/docs/gitlab-ci)
- [Heroku CI](#supported-environments) (needs doc)
- [Jenkins](https://docs.percy.io/docs/jenkins)
- [Jenkins PRB](https://docs.percy.io/docs/jenkins)
- [Netlify](https://docs.percy.io/docs/netlify)
- [Probo.CI](#supported-environments) (needs doc)
- [Semaphore](https://docs.percy.io/docs/semaphore)
- [Travis CI](https://docs.percy.io/docs/travis-ci)

## Percy Environment Variables

The following variables may be defined to override the respective derived CI environment variables.

```bash
PERCY_COMMIT          # build commit sha
PERCY_BRANCH          # build branch name
PERCY_PULL_REQUEST    # associated PR number
PERCY_PARALLEL_NONCE  # parallel nonce unique for this CI workflow
PERCY_PARALLEL_TOTAL  # total number of parallel shards
```

Additional Percy specific environment variable may be set to control aspects of your Percy build.

```bash
PERCY_TARGET_COMMIT   # percy target commit sha
PERCY_TARGET_BRANCH   # percy target branch name
PERCY_PARTIAL_BUILD   # if this build was marked as partial
```

## Adding Environment Support

1. Add CI detection to [`environment.js`](./src/environment.js)
2. Add respective environment variables
3. Add a dedicated CI test suite
4. Open a Pull Request!
