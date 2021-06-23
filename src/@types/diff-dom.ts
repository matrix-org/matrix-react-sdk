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

declare module "diff-dom" {
    enum Action {
        AddElement = "addElement",
        AddTextElement = "addTextElement",
        RemoveTextElement = "removeTextElement",
        RemoveElement = "removeElement",
        ReplaceElement = "replaceElement",
        ModifyTextElement = "modifyTextElement",
        AddAttribute = "addAttribute",
        RemoveAttribute = "removeAttribute",
        ModifyAttribute = "modifyAttribute",
    }

    export interface IDiff {
        action: Action;
        name: string;
        text?: string;
        route: number[];
        value: string;
        element: unknown;
        oldValue: string;
        newValue: string;
    }

    interface IOpts {
    }

    export class DiffDOM {
        public constructor(opts?: IOpts);
        public apply(tree: unknown, diffs: IDiff[]): unknown;
        public undo(tree: unknown, diffs: IDiff[]): unknown;
        public diff(a: HTMLElement | string, b: HTMLElement | string): IDiff[];
    }
}
