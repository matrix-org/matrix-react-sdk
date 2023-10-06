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

import fetchMock from "fetch-mock-jest";

import * as languageHandler from "../../src/languageHandler";
import en from "../../src/i18n/strings/en_EN.json";
import de from "../../src/i18n/strings/de_DE.json";

const lv = {
    Save: "Saglabāt",
    room: {
        upload: {
            uploading_multiple_file: {
                one: "Качване на %(filename)s и %(count)s друг",
            },
        },
    },
};

// Fake languages.json containing references to en_EN, de_DE and lv
// en_EN.json
// de_DE.json
// lv.json - mock version with few translations, used to test fallback translation

export function setupLanguageMock() {
    fetchMock
        .get("/i18n/languages.json", {
            en: "en_EN.json",
            de: "de_DE.json",
            lv: "lv.json",
        })
        .get("end:en_EN.json", en)
        .get("end:de_DE.json", de)
        .get("end:lv.json", lv);
}
setupLanguageMock();

languageHandler.setLanguage("en");
languageHandler.setMissingEntryGenerator((key) => key.split("|", 2)[1]);
