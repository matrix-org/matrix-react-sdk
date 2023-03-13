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

import { MatrixClient } from "matrix-js-sdk/src/client";

/**
 * Ignore given userId
 * @param userId - user to unignore
 * @param matrixClient - MatrixClient
 */
export const ignoreUser = async (userId: string, matrixClient: MatrixClient): Promise<void> => {
    const ignoredUsers = matrixClient.getIgnoredUsers();
    // ok to modify because matrixClient builds this array on every getIgnoredUsers call
    ignoredUsers.push(userId); // de-duped internally in the js-sdk
    await matrixClient.setIgnoredUsers(ignoredUsers);
};

/**
 * Unignore given userId
 * Does nothing if user is not ignored
 * @param userId - user to unignore
 * @param matrixClient - MatrixClient
 */
export const unignoreUser = async (userId: string, matrixClient: MatrixClient): Promise<void> => {
    const ignoredUsers = matrixClient.getIgnoredUsers();
    const index = ignoredUsers.indexOf(userId);
    if (index === -1) {
        return;
    }
    // ok to modify because matrixClient builds this array on every getIgnoredUsers call
    ignoredUsers.splice(index, 1); // de-duped internally in the js-sdk
    await matrixClient.setIgnoredUsers(ignoredUsers);
};
