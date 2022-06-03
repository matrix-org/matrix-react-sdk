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

import { mount } from "enzyme";
import { sleep } from "matrix-js-sdk/src/utils";
import React from "react";
import { act } from "react-dom/test-utils";

import { useDebouncedSearch } from "../../src/hooks/spotlight/useDebouncedSearch";

function DebouncedSearchComponent({ query, onSearch }) {
    useDebouncedSearch(query, onSearch, true, {});
    return <div>
        { query }
    </div>;
}

describe("useDebouncedSearch", () => {
    it("should call onSearch with the search term", async () => {
        const query = "USER NAME";
        const onSearch = jest.fn();

        const wrapper = mount(<DebouncedSearchComponent query="" onSearch={onSearch} />);
        await act(async () => {
            await sleep(1);
            wrapper.setProps({ query, onSearch });
            return act(() => sleep(500));
        });

        expect(wrapper.text()).toContain(query);
        expect(onSearch).toHaveBeenCalledTimes(1);
        expect(onSearch).toHaveBeenCalledWith({ query });
    });

    it("should debounce quick changes", async () => {
        const queries = [
            "U",
            "US",
            "USE",
            "USER",
            "USER ",
            "USER N",
            "USER NM",
            "USER NMA",
            "USER NM",
            "USER N",
            "USER NA",
            "USER NAM",
            "USER NAME",
        ];
        const onSearch = jest.fn();

        const wrapper = mount(<DebouncedSearchComponent query="" onSearch={onSearch} />);
        await act(async () => {
            await sleep(1);
            for (const query of queries) {
                wrapper.setProps({ query, onSearch });
                await sleep(50);
            }
            return act(() => sleep(500));
        });

        const query = queries[queries.length - 1];
        expect(wrapper.text()).toContain(query);
        expect(onSearch).toHaveBeenCalledTimes(1);
        expect(onSearch).toHaveBeenCalledWith({ query });
    });

    it("should not debounce slow changes", async () => {
        const queries = [
            "U",
            "US",
            "USE",
            "USER",
            "USER ",
            "USER N",
            "USER NM",
            "USER NMA",
            "USER NM",
            "USER N",
            "USER NA",
            "USER NAM",
            "USER NAME",
        ];
        const onSearch = jest.fn();

        const wrapper = mount(<DebouncedSearchComponent query="" onSearch={onSearch} />);
        await act(async () => {
            await sleep(1);
            for (const query of queries) {
                wrapper.setProps({ query, onSearch });
                await sleep(200);
            }
            return act(() => sleep(500));
        });

        const query = queries[queries.length - 1];
        expect(wrapper.text()).toContain(query);
        expect(onSearch).toHaveBeenCalledTimes(queries.length);
        expect(onSearch).toHaveBeenCalledWith({ query });
    });
});
