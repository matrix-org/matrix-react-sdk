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

import {SettingID} from "./Types";

// This exists because the TS rules for generics prevent us from using a pipe
// character unless it is followed by a type. Because these categories could
// be appended to over time, we want the equivalent of a trailing comma to make
// merge conflicts easier to resolve. We do this by just defining the last
// type in the chain to be this placeholder, which will never show up in the
// final type because it breaks our code style guidelines and thus is an invalid
// setting (also we'd be unlikely to pick this wording for a setting anyways).
type typeForEaseOfNewlines = 'will-be-excluded';

export type RoomListSettings = Extract<SettingID,
    'Breadcrumbs' |
    typeForEaseOfNewlines>;
