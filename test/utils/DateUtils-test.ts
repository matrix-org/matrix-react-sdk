/*
Copyright 2021 Šimon Brandner <simon.bra.ag@gmail.com>

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

import { formatSeconds } from "../../src/DateUtils";

describe("formatSeconds", () => {
    it("correctly formats time with hours", () => {
        expect(formatSeconds((60 * 60 * 3) + (60 * 31) + (55))).toBe("03:31:55");
        expect(formatSeconds((60 * 60 * 3) + (60 * 0) + (55))).toBe("03:00:55");
        expect(formatSeconds((60 * 60 * 3) + (60 * 31) + (0))).toBe("03:31:00");
    });

    it("correctly formats time without hours", () => {
        expect(formatSeconds((60 * 60 * 0) + (60 * 31) + (55))).toBe("31:55");
        expect(formatSeconds((60 * 60 * 0) + (60 * 0) + (55))).toBe("00:55");
        expect(formatSeconds((60 * 60 * 0) + (60 * 31) + (0))).toBe("31:00");
    });
});
