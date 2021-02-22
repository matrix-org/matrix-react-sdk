/*
 * Copyright 2021 The Matrix.org Foundation C.I.C.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *         http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import {BuiltInSettings} from "./BuiltInSettings";

export class CustomSettings extends BuiltInSettings {
    // If you're building a fork which requires different/more settings, this is where
    // you can define them. This file *should* remain forwards compatible for easier
    // merges in the future.
    //
    // Note that if you want to override a setting then it would be done here. See
    // the Settings.ts file for all the built-in settings, and how to define a setting.
    // Do not edit Settings.ts in your fork: it will cause merge conflicts.

    private constructor() {
        // this is a readonly class, so a constructor isn't needed.
        super(); // we do need to fulfill basic language contracts though
    }
}
