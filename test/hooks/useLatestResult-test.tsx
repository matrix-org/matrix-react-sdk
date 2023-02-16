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
    it("should return a result", async () => {
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

    it("should not let a slower response to an earlier query overwrie the result of a later query", () => {
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
    it("should return results", async () => {
        const mockSetter = jest.fn();
        const { result } = renderHook(() => useLatestResult(mockSetter));
        // now have [setQuery, setResult] = result.current;

        const query = { query: "query1", delayInMs: 100, result: "result1" };

        // firstly set a query and a timeout for the result
        result.current[0](query.query);
        setTimeout(() => result.current[1](query.query, query.result), query.delayInMs);

        // now advance the timers, check the setter is called
        jest.advanceTimersByTime(query.delayInMs);
        expect(mockSetter).toHaveBeenLastCalledWith(query.result);

        // fire two more queries with short delays
        const quickQuery1 = { query: "qq1", delayInMs: 30, result: "qr1" };
        const quickQuery2 = { query: "qq2", delayInMs: 30, result: "qr2" };

        result.current[0](quickQuery1.query);
        setTimeout(() => result.current[1](quickQuery1.query, quickQuery1.result), quickQuery1.delayInMs);
        jest.advanceTimersByTime(quickQuery1.delayInMs);
        expect(mockSetter).toHaveBeenLastCalledWith(query.result);
    });
});
