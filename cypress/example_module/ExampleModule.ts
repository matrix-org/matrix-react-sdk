/*
 * Copyright 2023 Nordeck IT + Consulting GmbH
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import { ModuleApi } from "@matrix-org/react-sdk-module-api/lib/ModuleApi";
import { RuntimeModule } from "@matrix-org/react-sdk-module-api/lib/RuntimeModule";
import {
    RoomPreviewListener,
    RoomViewLifecycle,
} from "@matrix-org/react-sdk-module-api/lib/lifecycles/RoomViewLifecycle";

export default class ExampleModule extends RuntimeModule {
    public constructor(moduleApi: ModuleApi) {
        super(moduleApi);

        // Only apply the module when it is activated so we don't interfere with
        // other tests that should not be affected by this module.
        if (window.localStorage.getItem("cypress_module_system_enable") !== "true") {
            return;
        }

        this.moduleApi.registerTranslations({
            "Welcome %(name)s": {
                en: "Howdy %(name)s (Changed by the Module System)",
            },
        });

        this.on(RoomViewLifecycle.PreviewRoomNotLoggedIn, this.onRoomPreview);
    }

    protected onRoomPreview: RoomPreviewListener = (opts, roomId) => {
        if (window.localStorage.getItem("cypress_module_system_preview_room_id") === roomId) {
            opts.canJoin = true;
        }
    };
}
