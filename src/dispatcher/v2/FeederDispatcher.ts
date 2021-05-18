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

import {IFeedListener} from "./CoarseDispatcher";
import {InputDispatcher, InputtingDispatcher} from "./InputDispatcher";
import {CoarseRoute} from "./routing/coarse";
import {CoarseDispatchers} from "./dispatchers/coarse/CoarseDispatchers";
import {Action, ActionType} from "./actions/types";

export interface IFeederFilter {
    addFeeder(listener: IFeedListener);
    removeFeeder(listener: IFeedListener);
}

export abstract class FeederDispatcher extends InputtingDispatcher implements IFeedListener, IFeederFilter {
    private downstream: IFeedListener[] = [];

    protected constructor(input: InputDispatcher, routes: CoarseRoute[]) {
        super(input);
        routes.forEach(r => CoarseDispatchers.instance.forRoute(r).addFeeder(this));
    }

    protected doCallDownstream(action: Action, val: ActionType<Action>) {
        for (const feed of this.downstream) {
            try {
                feed.onAction(action, val);
            } catch (e) {
                console.error(`[FeederDispatcher] Error calling '${action}' on ${feed}: `, e);
            }
        }
    }

    public abstract onAction(action: Action, val: ActionType<Action>);

    public addFeeder(listener: IFeedListener) {
        this.downstream.push(listener);
    }

    public removeFeeder(listener: IFeedListener) {
        const idx = this.downstream.indexOf(listener);
        if (idx >= 0) this.downstream.splice(idx, 1);
    }
}
