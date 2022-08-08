'use strict'

const failure = require('./failure')

module.exports = function testCase(testResult) {
  let failures
  const aTestCase = {
    _attr: {
      name: testResult.fullName || testResult.title,
      duration: testResult.duration || 0
    }
  }

  if (testResult.status === 'failed') {
    failures = testResult.failureMessages.map(failure)
    return {testCase: [aTestCase].concat(failures)}
  } else {
    return {testCase: aTestCase}
  }
}
