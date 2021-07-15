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

import { CoarseRoute } from "./routing/coarse";
import { Action, ActionType } from "./actions/types";
import { SimpleDispatcher } from "./SimpleDispatcher";
import { CentralDispatcher } from "./CentralDispatcher";
import { ActionRegistry } from "./actions/ActionRegistry";

export class CoarseDispatcher extends SimpleDispatcher {
    public constructor(private route: CoarseRoute, central: CentralDispatcher) {
        super();
        super.connect(central);
    }

    protected shouldAllowPropagate<A extends Action>(action: A, payload: ActionType<A>): boolean {
        return this.wouldAllowPropagation(action);
    }

    protected wouldAllowPropagation<A extends Action>(action: A): boolean {
        const actionRoute = ActionRegistry[action]?.route;
        return actionRoute === this.route;
    }
}
