import fm, { enableFetchMocks, disableFetchMocks, MockResponseInit } from 'jest-fetch-mock';

fetchMock.mockResponse(JSON.stringify({foo: "bar"}));
fetchMock.mockResponse(JSON.stringify({foo: "bar"}), {
    status: 200,
    headers: [
        ["Content-Type", "application/json"]
    ]
});
fetchMock.mockResponse(JSON.stringify({foo: "bar"}), {});
fetchMock.mockResponse(someAsyncHandler);
fetchMock.mockResponse(someAsyncStringHandler);

fetchMock.mockResponseOnce(JSON.stringify({foo: "bar"}));
fetchMock.mockResponseOnce(JSON.stringify({foo: "bar"}), {
    status: 200,
    headers: [
        ["Content-Type", "application/json"]
    ]
});
fetchMock.mockResponseOnce(JSON.stringify({foo: "bar"}), {});
fetchMock.mockResponseOnce(someAsyncHandler);
fetchMock.mockResponseOnce(someAsyncStringHandler);

fetchMock.once(JSON.stringify({foo: "bar"}));
fetchMock.once(JSON.stringify({foo: "bar"}), {
    status: 200,
    headers: [
        ["Content-Type", "application/json"]
    ]
});
fetchMock.once(JSON.stringify({foo: "bar"}), {});
fetchMock.once(someAsyncHandler);

fetchMock.mockResponses(JSON.stringify({}), JSON.stringify({foo: "bar"}));
fetchMock.mockResponses(someAsyncHandler, someAsyncHandler);
fetchMock.mockResponses(JSON.stringify({}), someAsyncHandler);
fetchMock.mockResponses(someAsyncHandler, JSON.stringify({}));
fetchMock.mockResponses(someAsyncHandler);
fetchMock.mockResponses([JSON.stringify({foo: "bar"}), {status: 200}]);
fetchMock.mockResponses(
    someAsyncHandler,
    someAsyncStringHandler,
    [JSON.stringify({foo: "bar"}), {status: 200}]
);

fetchMock.mockReject(new Error("oops"));
fetchMock.mockReject(someAsyncHandler);

fetchMock.mockRejectOnce(new Error("oops"));
fetchMock.mockRejectOnce(someAsyncHandler);
fetchMock.resetMocks();
fetchMock.enableMocks();
fetchMock.disableMocks();

fetchMock.isMocking("http://bar");
fetchMock.isMocking(new Request("http://bang"));

fetchMock.doMockIf('http://foo');
fetchMock.doMockIf(/bar/);
fetchMock.doMockIf((input: Request|string) => true);
fetchMock.mockIf('http://foo');
fetchMock.mockIf(/bar/);
fetchMock.mockIf((input: Request|string) => true);
fetchMock.dontMockIf('http://foo');
fetchMock.dontMockIf(/bar/);
fetchMock.dontMockIf((input: Request|string) => true);
fetchMock.doMockOnceIf('http://foo');
fetchMock.doMockOnceIf(/bar/);
fetchMock.doMockOnceIf((input: Request|string) => true);
fetchMock.mockOnceIf('http://foo');
fetchMock.mockOnceIf(/bar/);
fetchMock.mockOnceIf((input: Request|string) => true);
fetchMock.dontMockOnceIf('http://foo');
fetchMock.dontMockOnceIf(/bar/);
fetchMock.dontMockOnceIf((input: Request|string) => true);

fetchMock.doMock();
fetchMock.dontMock();
fetchMock.doMockOnce();
fetchMock.dontMockOnce();
fetchMock.mockOnce();

async function someAsyncHandler(): Promise<MockResponseInit> {
    return {
        status: 200,
        body: await someAsyncStringHandler()
    };
}

async function someAsyncStringHandler(): Promise<string> {
    return JSON.stringify({foo: "bar"});
}

enableFetchMocks();
disableFetchMocks();
fm.enableMocks();
fm.disableMocks();
fm.doMock();
fm.dontMock();
fm.doMockOnce();
fm.dontMockOnce();
fm.mockOnce();
