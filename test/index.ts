/*
Copyright 2022 The Matrix.org Foundation C.I.C.

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

import { ReactElement } from "react";
import { TooltipProvider } from "@vector-im/compound-web";
import { queries, Queries, render as baseRender, RenderOptions, RenderResult } from "@testing-library/react";

export * from "@testing-library/react";

// Wrapper around RTL render function to provide the TooltipProvider from Compound/Radix
export function render<
    Q extends Queries = typeof queries,
    Container extends Element | DocumentFragment = HTMLElement,
    BaseElement extends Element | DocumentFragment = Container,
>(
    ui: ReactElement,
    options?: Omit<RenderOptions<Q, Container, BaseElement>, "queries" | "wrapper">,
): RenderResult<Q, Container, BaseElement> {
    return baseRender<Q, Container, BaseElement>(ui, {
        ...options,
        wrapper: TooltipProvider,
    });
}
