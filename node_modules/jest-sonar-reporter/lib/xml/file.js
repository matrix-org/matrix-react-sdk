'use strict'

const testCase = require('./testCase')

module.exports = function file(testResult) {
  const aFile = [{_attr: {path: testResult.testFilePath}}]
  const testCases = testResult.testResults.map(testCase)

  return {file: aFile.concat(testCases)}
}
