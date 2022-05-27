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

import "matrix-js-sdk/src/@types/global";
import type { MatrixClient, ClientEvent } from "matrix-js-sdk/src/client";
import type { RoomMemberEvent } from "matrix-js-sdk/src/models/room-member";
import type { Preset } from "matrix-js-sdk/src/@types/partials";
import type { MatrixDispatcher } from "../src/dispatcher/dispatcher";
import type PerformanceMonitor from "../src/performance";
//import type SettingsStore from "../src/settings/SettingsStore";

declare global {
    // eslint-disable-next-line @typescript-eslint/no-namespace
    namespace Cypress {
        interface ApplicationWindow {
            mxMatrixClientPeg: {
                matrixClient?: MatrixClient;
            };
            mxDispatcher: MatrixDispatcher;
            mxPerformanceMonitor: PerformanceMonitor;
            //mxSettingsStore: SettingsStore; // to allow for adjusting settings in tests
            beforeReload?: boolean; // for detecting reloads
            // Partial type for the matrix-js-sdk module, exported by browser-matrix
            matrixcs: {
                MatrixClient: typeof MatrixClient;
                ClientEvent: typeof ClientEvent;
                RoomMemberEvent: typeof RoomMemberEvent;
                Preset: typeof Preset;
            };
        }
    }

    interface Window {
        // to appease the MatrixDispatcher import
        mxDispatcher: MatrixDispatcher;
        // to appease the PerformanceMonitor import
        mxPerformanceMonitor: PerformanceMonitor;
        mxPerformanceEntryNames: any;
        // to allow for adjusting settings in tests
        //mxSettingsStore: SettingsStore;
    }
}

export { MatrixClient };
