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

import {ISetting} from "./ISetting";

export class BuiltInSettings {
    public static readonly Breadcrumbs: ISetting<string[]> = {
        default: [],
        description: "testing 1",
    };
    public static readonly ShowReadReceipts: ISetting<boolean> = {
        default: true,
        description: "testing 2",
    };
    public static readonly ['Video.TestDevice']: ISetting<string> = {
        default: "hello",
        description: "testing 3",
    };

    protected constructor() {
        // readonly class
    }
}
