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

import { Action, ActionType, NoPayloadAction } from "./actions/types";

/**
 * A rudimentary dispatcher. Actions can be raised (dispatched or fired),
 * and listeners registered to receive a filtered view of actions raised
 * by other callers.
 *
 * Note that dispatchers are not obligated to call listeners when actions
 * are dispatched to them - this may be because the dispatcher has forwarded
 * the action to another dispatcher, or simply the dispatcher is not
 * interested in the action.
 */
export interface IDispatcher {
    /**
     * Dispatches an action into the dispatcher. The action will be sent
     * through various queues as part of processing, though may not appear
     * on the dispatcher's listeners.
     * @param {Action} action The action to dispatch.
     * @param {ActionType<A>} payload Payload to dispatch.
     */
    dispatch<A extends Action>(action: A, payload: ActionType<A>);

    /**
     * Dispatches an action without a payload. Used for indicator statuses
     * or straightforward actions.
     *
     * Note that this is the same as calling dispatch() with an undefined
     * payload.
     * @param {NoPayloadAction} action Action to fire/dispatch.
     */
    fire<A extends NoPayloadAction>(action: A);

    /**
     * Registers all discoverable listeners with the dispatcher to be called
     * when the interested actions are fired.
     * @param {Object} obj The object to search for listeners on.
     */
    registerListeners(obj: any);

    /**
     * Removes all listeners that were previously registered from the given
     * object.
     * @param {Object} obj The object to remove all listeners for.
     */
    unregisterListeners(obj: any);
}
