/*
Copyright 2023 Boluwatife Omosowon <boluomosowon@gmail.com>

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
import { mocked } from "jest-mock";

import { parsePermalink } from "../../src/utils/permalinks/Permalinks";
import { transformSearchTerm } from "../../src/utils/SearchInput";

jest.mock("../../src/utils/permalinks/Permalinks");

const searchTerm = "search term";
const roomLink = "https://matrix.to/#/#element-dev:matrix.org";

const parserLink = {
    roomLink: "#element-dev:matrix.org",
    searchTerm: null,
};

describe("transforming search term", () => {
    it("should return the primaryEntityId if the search term was a permalink", () => {
        mocked(parsePermalink).mockReturnValue({
            primaryEntityId: parserLink.roomLink,
            roomIdOrAlias: parserLink.roomLink,
            eventId: "",
            userId: "",
            viaServers: [],
            sigil: "",
        });
        expect(transformSearchTerm(roomLink)).toBe(parserLink.roomLink);
    });

    it("should return the original search term if the search term was not a permalink", () => {
        mocked(parsePermalink).mockReturnValue(null);
        expect(transformSearchTerm(searchTerm)).toBe(searchTerm);
    });
});
