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

import { ReactWrapper } from "enzyme";
import EventEmitter from "events";

export const emitPromise = (e: EventEmitter, k: string | symbol) => new Promise(r => e.once(k, r));

const findByAttr = (attr: string) => (component: ReactWrapper, value: string) => component.find(`[${attr}="${value}"]`);
export const findByTestId = findByAttr('data-test-id');
export const findById = findByAttr('id');

export const flushPromises = async () => await new Promise(resolve => setTimeout(resolve));
