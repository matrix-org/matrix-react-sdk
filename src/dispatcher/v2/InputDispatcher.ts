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

import {Action, ActionType, NoPayloadAction} from "./actions/types";
import {Dispatcher} from "./Dispatcher";
import {CoarseRoute} from "./routing/coarse";

export abstract class InputDispatcher extends Dispatcher {
    public fire<A extends NoPayloadAction>(action: A) {
        this.dispatch(action, undefined);
    }
}

export abstract class InputtingDispatcher extends Dispatcher {
    protected constructor(protected readonly input: InputDispatcher) {
        super();
    }

    public dispatch<A extends Action>(action: A, val: ActionType<A>) {
        this.input.dispatch(action, val);
    }

    public fire<A extends NoPayloadAction>(action: A) {
        this.input.fire(action);
    }
}
