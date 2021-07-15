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

import {CoarseRoute} from "../routing/coarse";
import {IActionable} from "./IActionable";
import {IMemberAction} from "./definitions/IMemberAction";

export class NoPayloadRegistry {
    // Dev note: Nothing is stopping you from putting non-void IActionables in this
    // class, but please don't. They should get moved to ActionRegistry if they need
    // a payload.
    //
    // This class exists because the type for "any action with a void payload" are
    // incomprehensibly difficult to construct, so we ultimately create a dedicated
    // type off this class and use that. The ActionRegistry extends this type to ensure
    // that the types end up in the Action type definition elsewhere.

    public static readonly FocusComposer: IActionable<void> = {
        route: CoarseRoute.UI,
    };

    protected constructor() {
        // readonly class
    }
}

export class ActionRegistry extends NoPayloadRegistry {
    public static readonly ViewUser: IActionable<IMemberAction> = {
        route: CoarseRoute.UI,
    };

    private constructor() {
        // readonly class
        super();
    }
}
