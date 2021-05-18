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

import {ActionRegistry, NoPayloadRegistry} from "./ActionRegistry";

/**
 * Represents all possible actions which may be fired.
 */
export type Action = keyof Omit<typeof ActionRegistry, keyof typeof Object>;

/**
 * Represents all the actions which do not require a payload.
 */
export type NoPayloadAction = keyof Omit<typeof NoPayloadRegistry, keyof typeof Object>;

/**
 * Collects all the definitions into one type. Used for determining various details
 * about the action types themselves.
 */
export type ActionDefinition<K extends Action> = (typeof ActionRegistry)[K];

/**
 * Represents a type of an action, based on the prescribed type in the definition.
 */
export type ActionType<K extends Action> = ActionDefinition<K>['tsType'];
