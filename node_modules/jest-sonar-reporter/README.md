# jest-sonar-reporter

[![Build Status](https://travis-ci.org/3dmind/jest-sonar-reporter.svg?branch=master)](https://travis-ci.org/3dmind/jest-sonar-reporter)
[![Quality Gate](https://sonarcloud.io/api/project_badges/measure?project=jest-sonar-reporter&metric=alert_status)](https://sonarcloud.io/dashboard?id=jest-sonar-reporter)

jest-sonar-reporter is a custom results processor for Jest.
The processor converts Jest's output into Sonar's
[generic test data](https://docs.sonarqube.org/display/SONAR/Generic+Test+Data) format.

## Installation

Using npm:

```bash
$ npm i -D jest-sonar-reporter
```

Using yarn:

```bash
$ yarn add -D jest-sonar-reporter
```

## Configuration

Configure Jest in your `package.json` to use `jest-sonar-reporter` as a custom results processor.

```json
{
  "jest": {
    "testResultsProcessor": "jest-sonar-reporter"
  }
}
```

Configure Sonar to import the test results. Add the `sonar.testExecutionReportPaths` property to your
`sonar-project.properties` file.

```properties
sonar.testExecutionReportPaths=test-report.xml
```

## Customization

To customize the reporter you can use `package.json` to store the configuration.

Create a `jestSonar` entry like this:

```json
{
  "jestSonar": {}
}
```

You can customize the following options:
- `reportPath` This will specify the path to put the report in.
- `reportFile` This will specify the file name of the report.
- `indent` This will specify the indentation to format the report.

```json
{
  "jestSonar": {
    "reportPath": "reports",
    "reportFile": "test-reporter.xml",
    "indent": 4
  }
}
```

> Important: Don't forget to update `sonar.testExecutionReportPaths` when you use a custom path and file name.

### Support for Sonarqube 5.6.x

Sonarqube 5.6.x does not support [Generic Test Data](https://docs.sonarqube.org/display/SONAR/Generic+Test+Data) however it has a [Generic Test Coverage plugin](https://docs.sonarqube.org/display/PLUG/Generic+Test+Coverage) which offers similar functionality.

If you have the plugin installed on Sonarqube, you can configure this reporter to produce files in supported format.

```json
{
  "jestSonar": {
    "sonar56x": true
  }
}
```

Configure Sonar to import the test results. Add the `sonar.genericcoverage.unitTestReportPaths` property to your
`sonar-project.properties` file.

```properties
sonar.genericcoverage.unitTestReportPaths=test-report.xml
```

### Support for different configuration environments

To support different environments add the `env` property to the configuration and overwrite the value of the option you want to modify for the specific environment.
You can overwrite the following configuration options: `reportPath`, `reportFile`, `indent`, `sonar56x`

For example: Overwrite the path were the report will be stored.
```json
{
  "jestSonar": {
    "reportPath": "reports",
    "reportFile": "test-reporter.xml",
    "indent": 4,
    "env": {
      "test": {
        "reportPath": "reports-test"
      }
    }
  }
}
``` 

Use the `NODE_ENV` variable to activate the environment specific configuration.
```shell
NODE_ENV=test npm run test
``` 

## Usage

1. Run Jest to execute your tests.

Using npm:

```bash
$ npm run test
```

Using yarn:

```bash
$ yarn run test
```

2. Run sonar-scanner to import the test results.

```bash
$ sonar-scanner
```

## Licence

This project uses the [MIT](LICENSE) licence.
