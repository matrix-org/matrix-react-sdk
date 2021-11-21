/*
Copyright 2021 The Matrix.org Foundation C.I.C.

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

export enum LocationShareType {
    CUSTOM = -1,
    ONE_OFF = 0,
    ONE_MIN = 60,
    FIVE_MINS = 5 * 60,
    THIRTY_MINS = 30 * 60,
    ONE_HOUR = 60 * 60,
    THREE_HOURS = 3 * 60 * 60,
    SIX_HOURS = 6 * 60 * 60,
    ONE_DAY = 24 * 60 * 60,
    FOREVER = Number.MAX_SAFE_INTEGER,
}
