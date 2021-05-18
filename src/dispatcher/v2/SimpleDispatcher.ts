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

import { IDispatcher } from "./IDispatcher";
import { Action, ActionType, NoPayloadAction } from "./actions/types";
import { arrayRemove } from "../../utils/arrays";

export class SimpleDispatcher implements IDispatcher {
    private _upstream: SimpleDispatcher;
    private downstream: SimpleDispatcher[] = [];

    public get upstream(): SimpleDispatcher {
        return this._upstream;
    }

    public registerListeners(obj: any) {
        // TODO: @@TR IMPL
    }

    public unregisterListeners(obj: any) {
        // TODO: @@TR IMPL
    }

    public fire<A extends NoPayloadAction>(action: A) {
        this.dispatch(action, null);
    }

    public dispatch<A extends Action>(action: A, payload: ActionType<A>) {
        // Dev note: to maintain sanity while trying to understand the dispatcher chain we intentionally
        // do not save performance when we are dispatching upstream. We could theoretically do the `else`
        // half of this ladder when there's an upstream to avoid the performance hit of waiting for the
        // upstream(s) to re-dispatch down to us, though this adds complexity that means we either have
        // to know where a dispatch came from or otherwise de-dupe it. Instead, we'll just fire it up
        // the chain and hope it comes back if it felt important to us/our downstreams.

        if (this._upstream) {
            this._upstream.dispatch(action, payload);
        } else {
            this.onUpstreamDispatch(action, payload);
        }
    }

    private onUpstreamDispatch<A extends Action>(action: A, payload: ActionType<A>) {
        if (!this.shouldAllowPropagate(action, payload)) return;

        this.downstream.forEach((ds, i) => {
            // TODO: @@TR: Should we fire each dispatcher on a new frame?
            try {
                ds.onUpstreamDispatch(action, payload);
            } catch (e) {
                console.error(`[SimpleDispatcher#noUpstream] Failing downstream dispatch @ idx ${i}`, ds, e);
            }
        });

        this.callListeners(action, payload);
    }

    /**
     * Optional filtering to prevent uninteresting dispatches from making it through to downstream
     * listeners or dispatchers. Override this to control this behaviour. Return false to filter
     * a dispatch out.
     *
     * This should be in sync with #wouldAllowPropagation()
     * @param {Action} action The action being dispatched.
     * @param {ActionType<Action>} payload The payload being dispatched.
     * @returns {boolean} True if the dispatch should continue, false otherwise.
     * @see wouldAllowPropagation
     * @protected
     */
    protected shouldAllowPropagate<A extends Action>(action: A, payload: ActionType<A>): boolean {
        return true; // default everything
    }

    /**
     * When dispatches are being filtered, for debugging purposes it can be useful to know when a
     * given action will always be filtered out of this dispatcher. Note that this function does
     * not take a payload: if the action would theoretically, regardless of payload, be filtered
     * out then this should return false. By default, the dispatcher assumes everything is allowed
     * through.
     *
     * This should be in sync with #shouldAllowPropagate()
     * @param {Action} action The action to check.
     * @returns {boolean} True if the dispatcher will let the action through, false otherwise.
     * @see shouldAllowPropagate
     * @protected
     */
    protected wouldAllowPropagation<A extends Action>(action: A): boolean {
        return true; // default everything is going through
    }

    private callListeners<A extends Action>(action: A, payload: ActionType<A>) {
        // TODO: @@TR IMPL
    }

    public connect(upstream: SimpleDispatcher) {
        // TODO: @@TR: Allow multiple upstreams (reverse the linkedlist?)
        if (this._upstream) {
            throw new Error("Dispatcher is already connected to an upstream");
        }

        if (!upstream) {
            throw new Error("No upstream provided");
        }

        // XXX: We sanity check against ourselves, but we don't check for dispatcher loops.
        if (upstream === this) {
            throw new Error("Upstream cannot be self");
        }

        this._upstream = upstream;
        upstream.downstream.push(this);
    }

    public disconnect() {
        if (this._upstream) {
            arrayRemove(this._upstream.downstream, this);
        }
        this._upstream = null;
    }
}
