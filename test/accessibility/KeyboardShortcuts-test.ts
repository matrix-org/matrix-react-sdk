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

import {
    getCustomizableShortcuts,
    getKeyboardShortcuts,
    KEYBOARD_SHORTCUTS,
} from "../../src/accessibility/KeyboardShortcuts";
import PlatformPeg from "../../src/PlatformPeg";

describe("KeyboardShortcuts", () => {
    it("doesn't change KEYBOARD_SHORTCUTS when getting shortcuts", () => {
        PlatformPeg.get = () => ({ overrideBrowserShortcuts: () => false });
        const copyKeyboardShortcuts = Object.assign({}, KEYBOARD_SHORTCUTS);

        getCustomizableShortcuts();
        expect(KEYBOARD_SHORTCUTS).toEqual(copyKeyboardShortcuts);
        getKeyboardShortcuts();
        expect(KEYBOARD_SHORTCUTS).toEqual(copyKeyboardShortcuts);
    });
});
