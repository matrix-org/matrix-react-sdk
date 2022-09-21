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

import { MatrixClient } from "matrix-js-sdk/src/matrix";
import { createContext } from "react";

import LegacyCallHandler from "../LegacyCallHandler";
import { RoomNotificationStateStore } from "../stores/notifications/RoomNotificationStateStore";
import RightPanelStore from "../stores/right-panel/RightPanelStore";
import { RoomViewStore } from "../stores/RoomViewStore";
import { WidgetLayoutStore } from "../stores/widgets/WidgetLayoutStore";
import WidgetStore from "../stores/WidgetStore";

export const SDKContext = createContext<Stores>(undefined);
SDKContext.displayName = "SDKContext";

export class Stores {
    constructor( // defined alphabetically
        public readonly legacyCallHandler: LegacyCallHandler,
        public readonly rightPanelStore: RightPanelStore,
        public readonly roomNotificationStateStore: RoomNotificationStateStore,
        public readonly roomViewStore: RoomViewStore,
        public readonly widgetLayoutStore: WidgetLayoutStore,
        public readonly widgetStore: WidgetStore,

        // Optional as we don't have a client on initial load if unregistered. This should be set
        // when the MatrixClient is first acquired in the dispatcher event Action.OnLoggedIn.
        // It is only safe to set this once, as updating this value will NOT notify components using
        // this Context.
        public client?: MatrixClient,
    ) {}
}
