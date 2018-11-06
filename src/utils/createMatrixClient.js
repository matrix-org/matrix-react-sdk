/*
Copyright 2017 Vector Creations Ltd

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

import Matrix from 'matrix-js-sdk';

const localStorage = window.localStorage;

// just *accessing* indexedDB throws an exception in firefox with
// indexeddb disabled.
let indexedDB;
try {
    indexedDB = window.indexedDB;
} catch (e) {}

/**
 * Create a new matrix client, with the persistent stores set up appropriately
 * (using localstorage/indexeddb, etc)
 *
 * @param {Object} opts  options to pass to Matrix.createClient. This will be
 *    extended with `sessionStore` and `store` members.
 *
 * @param {bool} useIndexedDb True to attempt to use indexeddb, or false to force
 *     use of the memory store. Default: true.
 *
 * @property {string} indexedDbWorkerScript  Optional URL for a web worker script
 *    for IndexedDB store operations. By default, indexeddb ops are done on
 *    the main thread.
 *
 * @returns {MatrixClient} the newly-created MatrixClient
 */
export default function createMatrixClient(opts, useIndexedDb) {
    if (useIndexedDb === undefined) useIndexedDb = true;

    const storeOpts = {
        useAuthorizationHeader: true,
    };

    if (localStorage) {
        storeOpts.sessionStore = new Matrix.WebStorageSessionStore(localStorage);
    }

    if (indexedDB && localStorage && useIndexedDb) {
        storeOpts.store = new Matrix.IndexedDBStore({
            indexedDB: indexedDB,
            dbName: "riot-web-sync",
            localStorage: localStorage,
            workerScript: createMatrixClient.indexedDbWorkerScript,
        });
    }

    opts = Object.assign(storeOpts, opts);

    return Matrix.createClient(opts);
}

createMatrixClient.indexedDbWorkerScript = null;
