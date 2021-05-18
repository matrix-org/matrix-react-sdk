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

import {InputDispatcher} from "./InputDispatcher";
import {Action, ActionType} from "./actions/types";
import {EnhancedMap} from "../../utils/maps";
import {CoarseRoute} from "./routing/coarse";
import {ICoarseFilter, ICoarseListener} from "./CoarseDispatcher";
import {ActionRegistry} from "./actions/ActionRegistry";

export class CentralDispatcher extends InputDispatcher implements ICoarseFilter {
    private static _instance: CentralDispatcher;
    private byRoute = new EnhancedMap<CoarseRoute, ICoarseListener[]>();

    constructor() {
        super();
    }

    public static get instance(): CentralDispatcher {
        if (!CentralDispatcher._instance) {
            CentralDispatcher._instance = new CentralDispatcher();
        }
        return CentralDispatcher._instance;
    }

    public dispatch<A extends Action>(action: A, val: ActionType<A>) {
        const coarse = ActionRegistry[action]?.route;
        const listeners = this.byRoute.get(coarse);
        if (!listeners) return;

        for (const listener of listeners) {
            try {
                listener.onCoarseAction(action, val);
            } catch (e) {
                console.error(`[CentralDispatcher] Error calling '${action}' for ${listener.toString()}: `, e);
            }
        }
    }

    public onCoarseAction(coarse: CoarseRoute, listener: ICoarseListener) {
        this.byRoute.getOrCreate(coarse, []).push(listener);
    }

    public offCoarseAction(coarse: CoarseRoute, listener: ICoarseListener) {
        const arr = this.byRoute.get(coarse);
        if (!arr) return;
        const idx = arr.indexOf(listener);
        if (idx >= 0) arr.splice(idx, 1);
    }
}
