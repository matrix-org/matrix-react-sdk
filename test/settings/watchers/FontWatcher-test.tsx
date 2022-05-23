/*
Copyright 2022 r00ster91

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

import SettingsStore from '../../../src/settings/SettingsStore';
import { SettingLevel } from '../../../src/settings/SettingLevel';

describe('FontWatcher', function() {
    beforeEach(() => SettingsStore.setValue("useSystemFont", null, SettingLevel.DEVICE, true));

    it('encloses the fonts by double quotes and sets them as the system font', async () => {
        await SettingsStore.setValue("systemFont", null, SettingLevel.DEVICE, "Fira Sans Thin, Commodore 64");
        expect(SettingsStore.getValue("systemFont")).toBe(`"Fira Sans Thin","Commodore 64"`);
    });
    it('does not add double quotes if already present and sets the font as the system font', async () => {
        await SettingsStore.setValue("systemFont", null, SettingLevel.DEVICE, `"Commodore 64"`);
        expect(SettingsStore.getValue("systemFont")).toBe(`"Commodore 64"`);
    });
    it('trims whitespace, encloses the fonts by double quotes, and sets them as the system font', async () => {
        const font = `  Fira Code  ,  "   Commodore 64   " `;
        await SettingsStore.setValue("systemFont", null, SettingLevel.DEVICE, font);
        expect(SettingsStore.getValue("systemFont")).toBe(`"Fira Code","Commodore 64"`);
    });
});
