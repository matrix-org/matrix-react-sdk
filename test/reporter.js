/*
Copyright 2022 The Matrix.org Foundation C.I.C.

Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

    http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.
*/

class JestSlowTestReporter {
    constructor(globalConfig, options) {
        this._globalConfig = globalConfig;
        this._options = options;
        this._slowTests = [];
    }

    onRunComplete() {
        console.log();
        this._slowTests.sort((a, b) => b.duration - a.duration);
        const rootPathRegex = new RegExp(`^${process.cwd()}`);
        const slowestTests = this._slowTests.slice(0, this._options.numTests || 10);
        const slowTestTime = this._slowTestTime(slowestTests);
        const allTestTime = this._allTestTime();
        const percentTime = (slowTestTime / allTestTime) * 100;

        console.log(
            `Top ${slowestTests.length} slowest examples (${slowTestTime / 1000} seconds,` +
          ` ${percentTime.toFixed(1)}% of total time):`,
        );

        for (let i = 0; i < slowestTests.length; i++) {
            const duration = slowestTests[i].duration;
            const fullName = slowestTests[i].fullName;
            const filePath = slowestTests[i].filePath.replace(rootPathRegex, '.');

            console.log(`  ${fullName}`);
            console.log(`    ${duration / 1000} seconds ${filePath}`);
        }
        console.log();
    }

    onTestResult(test, testResult) {
        for (let i = 0; i < testResult.testResults.length; i++) {
            this._slowTests.push({
                duration: testResult.testResults[i].duration,
                fullName: testResult.testResults[i].fullName,
                filePath: testResult.testFilePath,
            });
        }
    }

    _slowTestTime(slowestTests) {
        let slowTestTime = 0;
        for (let i = 0; i < slowestTests.length; i++) {
            slowTestTime += slowestTests[i].duration;
        }
        return slowTestTime;
    }

    _allTestTime() {
        let allTestTime = 0;
        for (let i = 0; i < this._slowTests.length; i++) {
            allTestTime += this._slowTests[i].duration;
        }
        return allTestTime;
    }
}

module.exports = JestSlowTestReporter;
