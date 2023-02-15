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

import { render, screen } from "@testing-library/react";
import { sleep } from "matrix-js-sdk/src/utils";
import React, { useEffect, useState } from "react";
import { act } from "react-dom/test-utils";

import { useLatestResult } from "../../src/hooks/useLatestResult";

function LatestResultsComponent({ query, doRequest }: { query: number; doRequest(query: number): Promise<number> }) {
    const [value, setValueInternal] = useState<number>(0);
    const [updateQuery, updateResult] = useLatestResult(setValueInternal);
    useEffect(() => {
        updateQuery(query);
        doRequest(query).then((it: number) => {
            updateResult(query, it);
        });
    }, [doRequest, query, updateQuery, updateResult]);

    return <div>{value}</div>;
}

describe("useLatestResult", () => {
    it("should return results", async () => {
        const doRequest = async (query: number) => {
            await sleep(180);
            return query;
        };
        const { rerender } = render(<LatestResultsComponent query={0} doRequest={doRequest} />);

        await act(() => sleep(100));
        expect(screen.getByText("0")).toBeInTheDocument();

        rerender(<LatestResultsComponent query={1} doRequest={doRequest} />);
        await act(() => sleep(70));
        rerender(<LatestResultsComponent query={2} doRequest={doRequest} />);
        await act(() => sleep(70));

        expect(screen.getByText("0")).toBeInTheDocument();

        await act(() => sleep(120));
        expect(screen.getByText("2")).toBeInTheDocument();
    });

    it("should prevent out-of-order results", async () => {
        const doRequest = async (query: number) => {
            await sleep(query);
            return query;
        };
        const { rerender } = render(<LatestResultsComponent query={0} doRequest={doRequest} />);

        await act(() => sleep(5));
        expect(screen.getByText("0")).toBeInTheDocument();

        rerender(<LatestResultsComponent query={50} doRequest={doRequest} />);
        await act(() => sleep(5));
        rerender(<LatestResultsComponent query={1} doRequest={doRequest} />);
        await act(() => sleep(5));

        expect(screen.getByText("1")).toBeInTheDocument();

        await act(() => sleep(50));
        expect(screen.getByText("1")).toBeInTheDocument();
    });
});
