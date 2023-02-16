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
import { waitFor } from "@testing-library/react";
import { renderHook } from "@testing-library/react-hooks/dom"; // add act
import { sleep } from "matrix-js-sdk/src/utils";
import React, { useEffect, useState } from "react";
import { act } from "react-dom/test-utils";

import { useLatestResult } from "../../src/hooks/useLatestResult";

// function LatestResultsComponent({ query, doRequest }: { query: number; doRequest(query: number): Promise<number> }) {
//     const [value, setValueInternal] = useState<number>(0);
//     const [updateQuery, updateResult] = useLatestResult(setValueInternal);
//     useEffect(() => {
//         updateQuery(query);
//         doRequest(query).then((it: number) => {
//             updateResult(query, it);
//         });
//     }, [doRequest, query, updateQuery, updateResult]);

//     return <div>{value}</div>;
// }

// describe("useLatestResult", () => {
//     it("should return results", async () => {
//         const doRequest = async (query: number) => {
//             await sleep(180);
//             return query;
//         };
//         const { rerender } = render(<LatestResultsComponent query={0} doRequest={doRequest} />);
//         expect(screen.getByText("0")).toBeInTheDocument();
//         await act(() => sleep(100));

//         expect(screen.getByText("0")).toBeInTheDocument();

//         rerender(<LatestResultsComponent query={1} doRequest={doRequest} />);
//         await act(() => sleep(70));
//         rerender(<LatestResultsComponent query={2} doRequest={doRequest} />);
//         await act(() => sleep(70));

//         expect(screen.getByText("0")).toBeInTheDocument();

//         await act(() => sleep(120));

//         expect(screen.getByText("2")).toBeInTheDocument();
//     });

//     it("should prevent out-of-order results", async () => {
//         const doRequest = async (query: number) => {
//             await sleep(query);
//             return query;
//         };
//         const { rerender } = render(<LatestResultsComponent query={0} doRequest={doRequest} />);
//         await act(() => sleep(5));

//         expect(screen.getByText("0")).toBeInTheDocument();

//         rerender(<LatestResultsComponent query={50} doRequest={doRequest} />);
//         await act(() => sleep(5));
//         rerender(<LatestResultsComponent query={1} doRequest={doRequest} />);
//         await act(() => sleep(5));

//         expect(screen.getByText("1")).toBeInTheDocument();

//         await act(() => sleep(50));

//         expect(screen.getByText("1")).toBeInTheDocument();
//     });
// });

jest.useFakeTimers();

describe("renderhook tests", () => {
    it("should return a result", () => {
        const mockSetter = jest.fn();
        const { result } = renderHook(() => useLatestResult(mockSetter));
        const [setQuery, setResult] = result.current;

        const query = { query: "query1", delayInMs: 100, result: "result1" };

        // firstly set a query and a timeout for the result
        setQuery(query.query);
        setTimeout(() => setResult(query.query, query.result), query.delayInMs);

        // now advance the timers, check the setter is called
        jest.advanceTimersByTime(query.delayInMs);
        expect(mockSetter).toHaveBeenLastCalledWith(query.result);
    });

    it("should not let a slower response to an earlier query overwrite the result of a later query", () => {
        const mockSetter = jest.fn();
        const { result } = renderHook(() => useLatestResult(mockSetter));
        const [setQuery, setResult] = result.current;

        const slowQuery = { query: "slowQuery", delayInMs: 500, result: "slowResult" };
        const fastQuery = { query: "fastQuery", delayInMs: 100, result: "fastResult" };

        // firstly set a query and a timeout for the result
        setQuery(slowQuery.query);
        setTimeout(() => setResult(slowQuery.query, slowQuery.result), slowQuery.delayInMs);

        setQuery(fastQuery.query);
        setTimeout(() => setResult(fastQuery.query, fastQuery.result), fastQuery.delayInMs);

        // check we have no calls
        expect(mockSetter).not.toHaveBeenCalled();

        // advance until fastQuery has responded, check the setter is called
        // with the result
        jest.advanceTimersToNextTimer();
        expect(mockSetter).toHaveBeenCalledTimes(1);
        expect(mockSetter).toHaveBeenLastCalledWith(fastQuery.result);

        // advance time to after the slow query has returned, check the setter
        // has not been recalled and the result is still from the fast query
        jest.advanceTimersToNextTimer();
        expect(mockSetter).toHaveBeenCalledTimes(1);
        expect(mockSetter).toHaveBeenLastCalledWith(fastQuery.result);
    });

    it("should return expected results when all response times simiar", () => {
        const mockSetter = jest.fn();
        const { result } = renderHook(() => useLatestResult(mockSetter));
        const [setQuery, setResult] = result.current;

        const commonDelayInMs = 180;
        const query1 = { query: "q1", result: "r1" };
        const query2 = { query: "q2", result: "r2" };
        const query3 = { query: "q3", result: "r3" };

        // firstly set a query and a timeout for the result
        setQuery(query1.query);
        setTimeout(() => setResult(query1.query, query1.result), commonDelayInMs);
        jest.advanceTimersByTime(commonDelayInMs - 80);

        expect(mockSetter).not.toHaveBeenCalled();

        setQuery(query2.query);
        setTimeout(() => setResult(query2.query, query2.result), commonDelayInMs);
        jest.advanceTimersByTime(70);

        expect(mockSetter).not.toHaveBeenCalled(); // TTE 170ms

        setQuery(query3.query);
        setTimeout(() => setResult(query3.query, query3.result), commonDelayInMs);
        jest.advanceTimersByTime(70);

        // check we have no calls
        expect(mockSetter).toHaveBeenCalledTimes(0); // TTE 280ms

        jest.advanceTimersByTime(120); // TTE 400ms
        expect(mockSetter).toHaveBeenLastCalledWith(query3.result); // TTE 280ms
    });

    it("should prevent out of order results", () => {
        const mockSetter = jest.fn();
        const { result } = renderHook(() => useLatestResult(mockSetter));
        const [setQuery, setResult] = result.current;

        const query1 = { query: "q1", delayInMs: 0, result: "r1" };
        const query2 = { query: "q2", delayInMs: 50, result: "r2" };
        const query3 = { query: "q3", delayInMs: 1, result: "r3" };

        // firstly set a query and a timeout for the result
        setQuery(query1.query);
        setTimeout(() => setResult(query1.query, query1.result), query1.delayInMs);
        jest.advanceTimersByTime(5);

        expect(mockSetter).toHaveBeenCalledTimes(1);
        expect(mockSetter).toHaveBeenLastCalledWith(query1.result);

        setQuery(query2.query);
        setTimeout(() => setResult(query2.query, query2.result), query2.delayInMs);
        jest.advanceTimersByTime(5);

        setQuery(query3.query);
        setTimeout(() => setResult(query3.query, query3.result), query3.delayInMs);
        jest.advanceTimersByTime(5);

        expect(mockSetter).toHaveBeenCalledTimes(2);
        expect(mockSetter).toHaveBeenLastCalledWith(query3.result); // TTE 170ms

        jest.advanceTimersByTime(50);
        expect(mockSetter).toHaveBeenLastCalledWith(query3.result); // TTE 170ms
    });
});
