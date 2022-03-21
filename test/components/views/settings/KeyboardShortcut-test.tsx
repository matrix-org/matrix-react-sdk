
/*
Copyright 2022 Šimon Brandner <simon.bra.ag@gmail.com>

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

import React from "react";
import { mount, ReactWrapper } from "enzyme";

import { Key } from "../../../../src/Keyboard";
import PlatformPeg from "../../../../src/PlatformPeg";
import { KeyboardShortcut, KeyboardKey } from "../../../../src/components/views/settings/KeyboardShortcut";

const renderKeyboardKey = (props): ReactWrapper => {
    return mount(<KeyboardKey {...props} />);
};

const renderKeyboardShortcut = (props): ReactWrapper => {
    return mount(<KeyboardShortcut {...props} />);
};

describe("KeyboardKey", () => {
    it("renders key icon", async () => {
        const body = await renderKeyboardKey({ name: Key.ARROW_DOWN });
        expect(body).toMatchSnapshot();
    });

    it("renders alternative key name", async () => {
        const body = await renderKeyboardKey({ name: Key.PAGE_DOWN });
        expect(body).toMatchSnapshot();
    });

    it("doesn't render + if last", async () => {
        const body = await renderKeyboardKey({ name: Key.A, last: true });
        expect(body).toMatchSnapshot();
    });
});

describe("KeyboardShortcut", () => {
    it("doesn't render same modifier twice (meta)", async () => {
        PlatformPeg.get = () => ({ overrideBrowserShortcuts: () => false });
        const body1 = renderKeyboardShortcut({
            value: {
                key: Key.A,
                ctrlOrCmdKey: true,
                metaKey: true,
            },
        });
        expect(body1).toMatchSnapshot();
    });

    it("doesn't render same modifier twice (ctrl)", () => {
        const body2 = renderKeyboardShortcut({
            value: {
                key: Key.A,
                ctrlOrCmdKey: true,
                ctrlKey: true,
            },
        });
        expect(body2).toMatchSnapshot();
    });
});
