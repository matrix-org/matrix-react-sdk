/*
Copyright 2023 The Matrix.org Foundation C.I.C.

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

import * as loglevel from "loglevel";

import type { Logger } from "matrix-js-sdk/src/logger";

/** Get a Logger implementation based on `loglevel` with the given logger name */
export function getLogger(loggerName: string): Logger {
    const logger = loglevel.getLogger(loggerName);

    // If this is the first time this logger has been returned, turn it into a `Logger` and set the default level
    if (!("extend" in logger)) {
        logger["extend"] = (namespace: string) => getLogger(loggerName + ":" + namespace);
        logger.methodFactory = makeLogMethodFactory();
        logger.setLevel(loglevel.levels.DEBUG);
    }

    return logger as unknown as Logger;
}

/**
 * Helper for getLogger: a factory for loglevel method factories.
 */
function makeLogMethodFactory(): loglevel.MethodFactory {
    function methodFactory(
        methodName: loglevel.LogLevelNames,
        level: loglevel.LogLevelNumbers,
        loggerName: string | symbol,
    ): loglevel.LoggingMethod {
        // here's the actual log method, which implements `Logger.info`, `Logger.debug`, etc.
        return function (first: any, ...rest): void {
            // include the logger name in the output...
            first = `\x1B[31m[${loggerName.toString()}]\x1B[m ${first.toString()}`;

            // ... and delegate to the corresponding method in the console of the application under test.
            // Doing so (rather than using the global `console`) ensures that the output is collected
            // by the `cypress-terminal-report` plugin.
            if (methodName in console) {
                console[methodName](first, ...rest);
            } else {
                console.log(first, ...rest);
            }
        };
    }
    return methodFactory;
}
