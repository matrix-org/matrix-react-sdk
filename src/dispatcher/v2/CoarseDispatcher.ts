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

import {CoarseRoute} from "./routing/coarse";
import {InputDispatcher, InputtingDispatcher} from "./InputDispatcher";
import {Action, ActionType} from "./actions/types";

export interface ICoarseListener {
    onCoarseAction(action: Action, val: ActionType<Action>);
}

export interface ICoarseFilter {
    onCoarseAction(coarse: CoarseRoute, listener: ICoarseListener);
    offCoarseAction(coarse: CoarseRoute, listener: ICoarseListener);
}

export interface IFeedListener {
    onAction(action: Action, val: ActionType<Action>);
}

export type CoarseParentDispatcher = InputDispatcher & ICoarseFilter;

export abstract class CoarseDispatcher extends InputtingDispatcher implements ICoarseListener {
    protected feeds: IFeedListener[] = [];

    protected constructor(public readonly route: CoarseRoute, input: CoarseParentDispatcher) {
        super(input);
        input.onCoarseAction(route, this);
    }

    protected doInformFeeds(action: Action, val: ActionType<Action>) {
        for (const feed of this.feeds) {
            try {
                feed.onAction(action, val);
            } catch (e) {
                console.error(`[CoarseDispatcher@${this.route}] Error when calling '${action}' to ${feed}: `, e);
            }
        }
    }

    public abstract onCoarseAction(action: Action, val: ActionType<Action>);

    public abstract addFeeder(feeder: IFeedListener);
    public abstract removeFeeder(feeder: IFeedListener);
}

export class PassthroughCoarseDispatcher extends CoarseDispatcher {
    public constructor(route: CoarseRoute, input: CoarseParentDispatcher) {
        super(route, input);
    }

    public onCoarseAction(action: Action, val: ActionType<Action>) {
        this.doInformFeeds(action, val);
    }

    public addFeeder(feeder: IFeedListener) {
        this.feeds.push(feeder);
    }

    public removeFeeder(feeder: IFeedListener) {
        const idx = this.feeds.indexOf(feeder);
        if (idx >= 0) this.feeds.splice(idx, 1);
    }
}
