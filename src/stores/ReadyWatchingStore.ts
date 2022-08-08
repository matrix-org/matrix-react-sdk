/*
 * Copyright 2021 - 2022 The Matrix.org Foundation C.I.C.
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

import { MatrixClient } from "matrix-js-sdk/src/client";
import { SyncState } from "matrix-js-sdk/src/sync";
import { Dispatcher } from "flux";
import { EventEmitter } from "events";

import { MatrixClientPeg } from "../MatrixClientPeg";
import { ActionPayload } from "../dispatcher/payloads";
import { IDestroyable } from "../utils/IDestroyable";
import { Action } from "../dispatcher/actions";

export abstract class ReadyWatchingStore extends EventEmitter implements IDestroyable {
    protected matrixClient: MatrixClient;
    private readonly dispatcherRef: string;

    constructor(protected readonly dispatcher: Dispatcher<ActionPayload>) {
        super();

        this.dispatcherRef = this.dispatcher.register(this.onAction);

        if (MatrixClientPeg.get()) {
            this.matrixClient = MatrixClientPeg.get();

            // noinspection JSIgnoredPromiseFromCall
            this.onReady();
        }
    }

    public get mxClient(): MatrixClient {
        return this.matrixClient; // for external readonly access
    }

    public useUnitTestClient(cli: MatrixClient) {
        this.matrixClient = cli;
    }

    public destroy() {
        this.dispatcher.unregister(this.dispatcherRef);
    }

    protected async onReady() {
        // Default implementation is to do nothing.
    }

    protected async onNotReady() {
        // Default implementation is to do nothing.
    }

    protected onDispatcherAction(payload: ActionPayload) {
        // Default implementation is to do nothing.
    }

    private onAction = async (payload: ActionPayload) => {
        this.onDispatcherAction(payload);

        if (payload.action === 'MatrixActions.sync') {
            // Only set the client on the transition into the PREPARED state.
            // Everything after this is unnecessary (we only need to know once we have a client)
            // and we intentionally don't set the client before this point to avoid stores
            // updating for every event emitted during the cached sync.
            if (
                payload.prevState !== SyncState.Prepared
                && payload.state === SyncState.Prepared
                && this.matrixClient !== payload.matrixClient
            ) {
                if (this.matrixClient) {
                    await this.onNotReady();
                }
                this.matrixClient = payload.matrixClient;
                await this.onReady();
            }
        } else if (payload.action === 'on_client_not_viable' || payload.action === Action.OnLoggedOut) {
            if (this.matrixClient) {
                await this.onNotReady();
                this.matrixClient = null;
            }
        }
    };
}
