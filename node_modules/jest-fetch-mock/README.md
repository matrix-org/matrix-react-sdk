# Jest Fetch Mock

Fetch is the canonical way to do HTTP requests in the browser, and it can be used in other environments such as React Native. Jest Fetch Mock allows you to easily mock your `fetch` calls and return the response you need to fake the HTTP requests. It's easy to setup and you don't need a library like `nock` to get going and it uses Jest's built-in support for mocking under the surface. This means that any of the `jest.fn()` methods are also available. For more information on the jest mock API, check their docs [here](https://facebook.github.io/jest/docs/en/mock-functions.html)

It currently supports the mocking with the [`cross-fetch`](https://www.npmjs.com/package/cross-fetch) polyfill, so it supports Node.js and any browser-like runtime.

## Contents

- [Usage](#usage)
  - [Installation and Setup](#installation-and-setup)
  - [Using with Create-React-App](#using-with-create-react-app)
- [API](#api)
- [Examples](#examples)
  - [Simple mock and assert](#simple-mock-and-assert)
  - [Mocking all fetches](#mocking-all-fetches)
  - [Mocking a failed fetch](#mocking-a-failed-fetch)
  - [Mocking multiple fetches with different responses](#mocking-multiple-fetches-with-different-responses)
  - [Mocking multiple fetches with `fetch.mockResponses`](#mocking-multiple-fetches-with-fetchmockresponses)
  - [Reset mocks between tests with `fetch.resetMocks`](#reset-mocks-between-tests-with-fetchresetmocks)
  - [Using `fetch.mock` to inspect the mock state of each fetch call](#using-fetchmock-to-inspect-the-mock-state-of-each-fetch-call)
  - [Using functions to mock slow servers](#using-functions-to-mock-slow-servers)

## Usage

### Package Installation

To setup your fetch mock you need to do the following things:

```
$ npm install --save-dev jest-fetch-mock
```

Create a `setupJest` file to setup the mock or add this to an existing `setupFile`. :

### To setup for all tests

```js
//setupJest.js or similar file
require('jest-fetch-mock').enableMocks()
```

Add the setupFile to your jest config in `package.json`:

```JSON
"jest": {
  "automock": false,
  "setupFiles": [
    "./setupJest.js"
  ]
}
```

With this done, you'll have `fetch` and `fetchMock` available on the global scope. Fetch will be used as usual by your code and you'll use `fetchMock` in your tests

#### Default not mocked

If you would like to have the 'fetchMock' available in all tests but not enabled then add `fetchMock.dontMock()` after the `...enableMocks()` line in `setupJest.js`:
```js
// adds the 'fetchMock' global variable and rewires 'fetch' global to call 'fetchMock' instead of the real implementation
require('jest-fetch-mock').enableMocks()
// changes default behavior of fetchMock to use the real 'fetch' implementation and not mock responses
fetchMock.dontMock() 
```
If you want a single test file to return to the default behavior of mocking all responses, add the following to the
test file:
```js
beforeEach(() => { // if you have an existing `beforeEach` just add the following line to it
  fetchMock.doMock()
})
```

To enable mocking for a specific URL only:
```js
beforeEach(() => { // if you have an existing `beforeEach` just add the following lines to it
  fetchMock.mockIf(/^https?:\/\/example.com.*$/, req => {
      if (req.url.endsWith("/path1")) {
        return "some response body"
      } else if (req.url.endsWith("/path2")) {
        return {
          body: "another response body",
          headers: {
            "X-Some-Response-Header": "Some header value"
          } 
        }
      } else {
        return {
          status: 404,
          body: "Not Found"
        }
      }
  })
})
```

If you have changed the default behavior to use the real implementation, you can guarantee the next call to fetch
will be mocked by using the `mockOnce` function:
```js
fetchMock.mockOnce("the next call to fetch will always return this as the body")
```

This function behaves exactly like `fetchMock.once` but guarantees the next call to `fetch` will be mocked even if the 
default behavior of fetchMock is to use the real implementation.  You can safely convert all you `fetchMock.once` calls
to `fetchMock.mockOnce` without a risk of changing their behavior.

### To setup for an individual test

For JavaScript add the following line to the start of your test case (before any other requires)
```js
require('jest-fetch-mock').enableMocks()
```

For TypeScript/ES6 add the following lines to the start of your test case (before any other imports)
```typescript
import { enableFetchMocks } from 'jest-fetch-mock'
enableFetchMocks()
```

#### TypeScript importing

If you are using TypeScript and receive errors about the `fetchMock` global not existing,
add a `global.d.ts` file to the root of your project (or add the following line to an existing global file):

```typescript
import 'jest-fetch-mock'
```

If you prefer you can also just import the fetchMock in a test case.
```typescript
import fetchMock from "jest-fetch-mock"
```

You may also need to edit your `tsconfig.json` and add "dom" and/or "es2015" and/or "esnext" to the 'compilerConfig.lib' property

### Using with Create-React-App

If you are using [Create-React-App](https://github.com/facebookincubator/create-react-app) (CRA), the code for `setupTest.js` above should be placed into `src/setupTests.js` in the root of your project. CRA automatically uses this filename by convention in the Jest configuration it generates. Similarly, changing to your `package.json` is not required as CRA handles this when generating your Jest configuration.

### For Ejected Create React Apps _ONLY_:

> Note: Keep in mind that if you decide to "eject" before creating src/setupTests.js, the resulting package.json file won't contain any reference to it, so you should manually create the property setupTestFrameworkScriptFile in the configuration for Jest, something like the [following](https://github.com/facebook/create-react-app/blob/master/packages/react-scripts/template/README.md#srcsetuptestsjs-1):

```JSON
"jest": {
  "setupTestFrameworkScriptFile": "<rootDir>/src/setupTests.js"
 }
```

## API

### Mock Responses

- `fetch.mockResponse(bodyOrFunction, init): fetch` - Mock all fetch calls
- `fetch.mockResponseOnce(bodyOrFunction, init): fetch` - Mock each fetch call independently
- `fetch.once(bodyOrFunction, init): fetch` - Alias for `mockResponseOnce(bodyOrFunction, init)`
- `fetch.mockResponses(...responses): fetch` - Mock multiple fetch calls independently
  - Each argument is an array taking `[bodyOrFunction, init]`
- `fetch.mockReject(errorOrFunction): fetch` - Mock all fetch calls, letting them fail directly
- `fetch.mockRejectOnce(errorOrFunction): fetch` - Let the next fetch call fail directly
- `fetch.mockAbort(): fetch` - Causes all fetch calls to reject with an "Aborted!" error
- `fetch.mockAbortOnce(): fetch` - Causes the next fetch call to reject with an "Aborted!" error

### Functions

Instead of passing body, it is also possible to pass a function that returns a promise.
The promise should resolve with a string or an object containing body and init props

i.e:

```js
fetch.mockResponse(() => callMyApi().then(res => ({ body: 'ok' })))
// OR
fetch.mockResponse(() => callMyApi().then(res => 'ok'))
```

The function may take an optional "request" parameter of type `http.Request`:

```js
fetch.mockResponse(req =>
  req.url === 'http://myapi/'
    ? callMyApi().then(res => 'ok')
    : Promise.reject(new Error('bad url'))
)
```

Note: the request "url" is parsed and then printed using the equivalent of `new URL(input).href` so it may not match exactly with the URL's passed to `fetch` if they are not fully qualified.
For example, passing "http://foo.com" to `fetch` will result in the request URL being "http://foo.com/" (note the trailing slash).

The same goes for rejects:

```js
fetch.mockReject(() =>
  doMyAsyncJob().then(res => Promise.reject(res.errorToRaise))
)
// OR
fetch.mockReject(req =>
  req.headers.get('content-type') === 'text/plain'
    ? Promise.reject('invalid content type')
    : doMyAsyncJob().then(res => Promise.reject(res.errorToRaise))
)
```

### Mock utilities

- `fetch.resetMocks()` - Clear previously set mocks so they do not bleed into other mocks
- `fetch.enableMocks()` - Enable fetch mocking by overriding `global.fetch` and mocking `node-fetch`
- `fetch.disableMocks()` - Disable fetch mocking and restore default implementation of `fetch` and/or `node-fetch`
- `fetch.mock` - The mock state for your fetch calls. Make assertions on the arguments given to `fetch` when called by the functions you are testing. For more information check the [Jest docs](https://facebook.github.io/jest/docs/en/mock-functions.html#mock-property)

For information on the arguments body and init can take, you can look at the MDN docs on the Response Constructor function, which `jest-fetch-mock` uses under the surface.

https://developer.mozilla.org/en-US/docs/Web/API/Response/Response

Each mocked response or err
or will return a [Mock Function](http://facebook.github.io/jest/docs/mock-function-api.html#content). You can use methods like `.toHaveBeenCalledWith` to ensure that the mock function was called with specific arguments. For more methods detail, take a look at [this](http://facebook.github.io/jest/docs/expect.html#content).

## Examples

In most of the complicated examples below, I am testing my action creators in Redux, but it doesn't have to be used with Redux.

### Simple mock and assert

In this simple example I won't be using any libraries. It is a simple fetch request, in this case to google.com. First we setup the `beforeEach` callback to reset our mocks. This isn't strictly necessary in this example, but since we will probably be mocking fetch more than once, we need to reset it across our tests to assert on the arguments given to fetch.

Once we've done that we can start to mock our response. We want to give it an objectwith a `data` property and a string value of `12345` and wrap it in `JSON.stringify` to JSONify it. Here we use `mockResponseOnce`, but we could also use `once`, which is an alias for a call to `mockResponseOnce`

We then call the function that we want to test with the arguments we want to test with. In the `then` callback we assert we have got the correct data back.

Finally we can assert on the `.mock` state that Jest provides for us to test what arguments were given to fetch and how many times it was called

```js
//api.js
export function APIRequest(who) {
  if (who === 'google') {
    return fetch('https://google.com').then(res => res.json())
  } else {
    return 'no argument provided'
  }
}
```

```js
//api.test.js
import { APIRequest } from './api'

describe('testing api', () => {
  beforeEach(() => {
    fetch.resetMocks()
  })

  it('calls google and returns data to me', () => {
    fetch.mockResponseOnce(JSON.stringify({ data: '12345' }))

    //assert on the response
    APIRequest('google').then(res => {
      expect(res.data).toEqual('12345')
    })

    //assert on the times called and arguments given to fetch
    expect(fetch.mock.calls.length).toEqual(1)
    expect(fetch.mock.calls[0][0]).toEqual('https://google.com')
  })
})
```

### Mocking all fetches

In this example I am mocking just one fetch call. Any additional fetch calls in the same function will also have the same mock response. For more complicated functions with multiple fetch calls, you can check out example 3.

```js
import configureMockStore from 'redux-mock-store' // mock store
import thunk from 'redux-thunk'

const middlewares = [thunk]
const mockStore = configureMockStore(middlewares)

import { getAccessToken } from './accessToken'

describe('Access token action creators', () => {
  it('dispatches the correct actions on successful fetch request', () => {
    fetch.mockResponse(JSON.stringify({ access_token: '12345' }))

    const expectedActions = [
      { type: 'SET_ACCESS_TOKEN', token: { access_token: '12345' } }
    ]
    const store = mockStore({ config: { token: '' } })

    return (
      store
        .dispatch(getAccessToken())
        //getAccessToken contains the fetch call
        .then(() => {
          // return of async actions
          expect(store.getActions()).toEqual(expectedActions)
        })
    )
  })
})
```

### Mocking a failed fetch

In this example I am mocking just one fetch call but this time using the `mockReject` function to simulate a failed request. Any additional fetch calls in the same function will also have the same mock response. For more complicated functions with multiple fetch calls, you can check out example 3.

```js
import configureMockStore from 'redux-mock-store' // mock store
import thunk from 'redux-thunk'

const middlewares = [thunk]
const mockStore = configureMockStore(middlewares)

import { getAccessToken } from './accessToken'

describe('Access token action creators', () => {
  it('dispatches the correct actions on a failed fetch request', () => {
    fetch.mockReject(new Error('fake error message'))

    const expectedActions = [
      { type: 'SET_ACCESS_TOKEN_FAILED', error: { status: 503 } }
    ]
    const store = mockStore({ config: { token: '' } })

    return (
      store
        .dispatch(getAccessToken())
        //getAccessToken contains the fetch call
        .then(() => {
          // return of async actions
          expect(store.getActions()).toEqual(expectedActions)
        })
    )
  })
})
```

### Mocking aborted fetches

Fetches can be mocked to act as if they were aborted during the request.  This can be done in 4 ways:
<ol>
<li>Using `fetch.mockAborted()`</li>
<li>Using `fetch.mockAbortedOnce()`</li>
<li>Passing a request (or request init) with a 'signal' to fetch that has been aborted</li>
<li>Passing a request (or request init) with a 'signal' to fetch and a async function to `fetch.mockResponse` or `fetch.mockResponseOnce` that causes the signal to abort before returning the response</li>
</ol>

```js
describe('Mocking aborts', () => {
  beforeEach(() => {
    fetch.resetMocks()
    fetch.doMock()
    jest.useFakeTimers()
  })
  afterEach(() => {
    jest.useRealTimers()
  })

  it('rejects with an Aborted! Error', () => {
    fetch.mockAbort()
    expect(fetch('/')).rejects.toThrow('Aborted!')
  })
  it('rejects with an Aborted! Error once then mocks with empty response', async () => {
    fetch.mockAbortOnce()
    await expect(fetch('/')).rejects.toThrow('Aborted!')
    await expect(request()).resolves.toEqual('')
  })

  it('throws when passed an already aborted abort signal', () => {
    const c = new AbortController()
    c.abort()
    expect(() => fetch('/', { signal: c.signal })).toThrow('Aborted!')
  })

  it('rejects when aborted before resolved', async () => {
    const c = new AbortController()
    fetch.mockResponse(async () => {
      jest.advanceTimersByTime(60)
      return ''
    })
    setTimeout(() => c.abort(), 50)
    await expect(fetch('/', { signal: c.signal })).rejects.toThrow('Aborted!')
  })
})
```

### Mocking multiple fetches with different responses

In this next example, the store does not yet have a token, so we make a request to get an access token first. This means that we need to mock two different responses, one for each of the fetches. Here we can use `fetch.mockResponseOnce` or `fetch.once` to mock the response only once and call it twice. Because we return the mocked function, we can chain this jQuery style. It internally uses Jest's `mockImplementationOnce`. You can read more about it on the [Jest documentation](https://facebook.github.io/jest/docs/mock-functions.html#content)

```js
import configureMockStore from 'redux-mock-store'
import thunk from 'redux-thunk'

const middlewares = [thunk]
const mockStore = configureMockStore(middlewares)

import { getAnimeDetails } from './animeDetails'

describe('Anime details action creators', () => {
  it('dispatches requests for an access token before requesting for animeDetails', () => {
    fetch
      .once(JSON.stringify({ access_token: '12345' }))
      .once(JSON.stringify({ name: 'naruto' }))

    const expectedActions = [
      { type: 'SET_ACCESS_TOKEN', token: { access_token: '12345' } },
      { type: 'SET_ANIME_DETAILS', animeDetails: { name: 'naruto' } }
    ]
    const store = mockStore({ config: { token: null } })

    return (
      store
        .dispatch(getAnimeDetails('21049'))
        //getAnimeDetails contains the 2 fetch calls
        .then(() => {
          // return of async actions
          expect(store.getActions()).toEqual(expectedActions)
        })
    )
  })
})
```

### Mocking multiple fetches with `fetch.mockResponses`

`fetch.mockResponses` takes as many arguments as you give it, all of which are arrays representing each Response Object. It will then call the `mockImplementationOnce` for each response object you give it. This reduces the amount of boilerplate code you need to write. An alternative is to use `.once` and chain it multiple times if you don't like wrapping each response arguments in a tuple/array.

In this example our actionCreator calls `fetch` 4 times, once for each season of the year and then concatenates the results into one final array. You'd have to write `fetch.mockResponseOnce` 4 times to achieve the same thing:

```js
describe('getYear action creator', () => {
  it('dispatches the correct actions on successful getSeason fetch request', () => {
    fetch.mockResponses(
      [
        JSON.stringify([{ name: 'naruto', average_score: 79 }]),
        { status: 200 }
      ],
      [
        JSON.stringify([{ name: 'bleach', average_score: 68 }]),
        { status: 200 }
      ],
      [
        JSON.stringify([{ name: 'one piece', average_score: 80 }]),
        { status: 200 }
      ],
      [
        JSON.stringify([{ name: 'shingeki', average_score: 91 }]),
        { status: 200 }
      ]
    )

    const expectedActions = [
      {
        type: 'FETCH_ANIMELIST_REQUEST'
      },
      {
        type: 'SET_YEAR',
        payload: {
          animes: [
            { name: 'naruto', average_score: 7.9 },
            { name: 'bleach', average_score: 6.8 },
            { name: 'one piece', average_score: 8 },
            { name: 'shingeki', average_score: 9.1 }
          ],
          year: 2016
        }
      },
      {
        type: 'FETCH_ANIMELIST_COMPLETE'
      }
    ]
    const store = mockStore({
      config: {
        token: { access_token: 'wtw45CmyEuh4P621IDVxWkgVr5QwTg3wXEc4Z7Cv' }
      },
      years: []
    })

    return (
      store
        .dispatch(getYear(2016))
        //This calls fetch 4 times, once for each season
        .then(() => {
          // return of async actions
          expect(store.getActions()).toEqual(expectedActions)
        })
    )
  })
})
```

### Reset mocks between tests with `fetch.resetMocks`

`fetch.resetMocks` resets the `fetch` mock to give fresh mock data in between tests. It only resets the `fetch` calls as to not disturb any other mocked functionality.

```js
describe('getYear action creator', () => {
  beforeEach(() => {
      fetch.resetMocks();
  });
  it('dispatches the correct actions on successful getSeason fetch request', () => {

    fetch.mockResponses(
      [
        JSON.stringify([ {name: 'naruto', average_score: 79} ]), { status: 200}
      ],
      [
        JSON.stringify([ {name: 'bleach', average_score: 68} ]), { status: 200}
      ]
    )

    const expectedActions = [
      {
        type: 'FETCH_ANIMELIST_REQUEST'
      },
      {
        type: 'SET_YEAR',
        payload: {
          animes: [
            {name: 'naruto', average_score: 7.9},
            {name: 'bleach', average_score: 6.8}
          ],
          year: 2016,
        }
      },
      {
        type: 'FETCH_ANIMELIST_COMPLETE'
      }
    ]
    const store = mockStore({
      config: { token: { access_token: 'wtw45CmyEuh4P621IDVxWkgVr5QwTg3wXEc4Z7Cv' }},
      years: []
    })

    return store.dispatch(getYear(2016))
      //This calls fetch 2 times, once for each season
      .then(() => { // return of async actions
        expect(store.getActions()).toEqual(expectedActions)
      })
  });
  it('dispatches the correct actions on successful getSeason fetch request', () => {

    fetch.mockResponses(
      [
        JSON.stringify([ {name: 'bleach', average_score: 68} ]), { status: 200}
      ],
      [
        JSON.stringify([ {name: 'one piece', average_score: 80} ]), { status: 200}
      ],
      [
        JSON.stringify([ {name: 'shingeki', average_score: 91} ]), { status: 200}
      ]
    )

    const expectedActions = [
      {
        type: 'FETCH_ANIMELIST_REQUEST'
      },
      {
        type: 'SET_YEAR',
        payload: {
          animes: [
            {name: 'bleach', average_score: 6.8},
            {name: 'one piece', average_score: 8},
            {name: 'shingeki', average_score: 9.1}
          ],
          year: 2016,
        }
      },
      {
        type: 'FETCH_ANIMELIST_COMPLETE'
      }
    ]
    const store = mockStore({
      config: { token: { access_token: 'wtw45CmyEuh4P621IDVxWkgVr5QwTg3wXEc4Z7Cv' }},
      years: []
    })

    return store.dispatch(getYear(2016))
      //This calls fetch 3 times, once for each season
      .then(() => { // return of async actions
        expect(store.getActions()).toEqual(expectedActions)
      })
      ,

  })
})
```

### Using `fetch.mock` to inspect the mock state of each fetch call

`fetch.mock` by default uses [Jest's mocking functions](https://facebook.github.io/jest/docs/en/mock-functions.html#mock-property). Therefore you can make assertions on the mock state. In this example we have an arbitrary function that makes a different fetch request based on the argument you pass to it. In our test, we run Jest's `beforeEach()` and make sure to reset our mock before each `it()` block as we will make assertions on the arguments we are passing to `fetch()`. The most uses property is the `fetch.mock.calls` array. It can give you information on each call, and their arguments which you can use for your `expect()` calls. Jest also comes with some nice aliases for the most used ones.

```js
// api.js

import 'cross-fetch'

export function APIRequest(who) {
  if (who === 'facebook') {
    return fetch('https://facebook.com')
  } else if (who === 'twitter') {
    return fetch('https://twitter.com')
  } else {
    return fetch('https://google.com')
  }
}
```

```js
// api.test.js
import { APIRequest } from './api'

describe('testing api', () => {
  beforeEach(() => {
    fetch.resetMocks()
  })

  it('calls google by default', () => {
    fetch.mockResponse(JSON.stringify({ secret_data: '12345' }))
    APIRequest()

    expect(fetch.mock.calls.length).toEqual(1)
    expect(fetch.mock.calls[0][0]).toEqual('https://google.com')
  })

  it('calls facebook', () => {
    fetch.mockResponse(JSON.stringify({ secret_data: '12345' }))
    APIRequest('facebook')

    expect(fetch.mock.calls.length).toEqual(2)
    expect(fetch.mock.calls[0][0]).toEqual(
      'https://facebook.com/someOtherResource'
    )
    expect(fetch.mock.calls[1][0]).toEqual('https://facebook.com')
  })

  it('calls twitter', () => {
    fetch.mockResponse(JSON.stringify({ secret_data: '12345' }))
    APIRequest('twitter')

    expect(fetch).toBeCalled() // alias for expect(fetch.mock.calls.length).toEqual(1);
    expect(fetch).toBeCalledWith('https://twitter.com') // alias for expect(fetch.mock.calls[0][0]).toEqual();
  })
})
```

### Using functions to mock slow servers

By default you will want to have your fetch mock return immediately. However if you have some custom logic that needs to tests for slower servers, you can do this by passing it a function and returning a promise when your function resolves

```js
// api.test.js
import { request } from './api'

describe('testing timeouts', () => {
  it('resolves with function and timeout', async () => {
    fetch.mockResponseOnce(
      () =>
        new Promise(resolve => setTimeout(() => resolve({ body: 'ok' }), 100))
    )
    try {
      const response = await request()
      expect(response).toEqual('ok')
    } catch (e) {
      throw e
    }
  })
})
```

### Conditional Mocking

In some test scenarios, you may want to temporarily disable (or enable) mocking for all requests or the next (or a certain number of) request(s).
You may want to only mock fetch requests to some URLs that match a given request path while in others you may want to mock
all requests except those matching a given request path. You may even want to conditionally mock based on request headers.

The conditional mock functions cause `jest-fetch-mock` to pass fetches through to the concrete fetch implementation conditionally.
Calling `fetch.dontMock`, `fetch.doMock`, `fetch.doMockIf` or `fetch.dontMockIf` overrides the default behavior
of mocking/not mocking all requests. `fetch.dontMockOnce`, `fetch.doMockOnce`, `fetch.doMockOnceIf` and `fetch.dontMockOnceIf` only overrides the behavior
for the next call to `fetch`, then returns to the default behavior (either mocking all requests or mocking the requests based on the last call to
`fetch.dontMock`, `fetch.doMock`, `fetch.doMockIf` and `fetch.dontMockIf`).

Calling `fetch.resetMocks()` will return to the default behavior of mocking all fetches with a text response of empty string.

- `fetch.dontMock()` - Change the default behavior to not mock any fetches until `fetch.resetMocks()` or `fetch.doMock()` is called
- `fetch.doMock(bodyOrFunction?, responseInit?)` - Reverses `fetch.dontMock()`. This is the default state after `fetch.resetMocks()`
- `fetch.dontMockOnce()` - For the next fetch, do not mock then return to the default behavior for subsequent fetches. Can be chained.
- `fetch.doMockOnce(bodyOrFunction?, responseInit?)` or `fetch.mockOnce` - For the next fetch, mock the response then return to the default behavior for subsequent fetches. Can be chained.
- `fetch.doMockIf(urlOrPredicate, bodyOrFunction?, responseInit?):fetch` or `fetch.mockIf` - causes all fetches to be not be mocked unless they match the given string/RegExp/predicate
  (i.e. "only mock 'fetch' if the request is for the given URL otherwise, use the real fetch implementation")
- `fetch.dontMockIf(urlOrPredicate, bodyOrFunction?, responseInit?):fetch` - causes all fetches to be mocked unless they match the given string/RegExp/predicate
  (i.e. "don't mock 'fetch' if the request is for the given URL, otherwise mock the request")
- `fetch.doMockOnceIf(urlOrPredicate, bodyOrFunction?, responseInit?):fetch` or `fetch.mockOnceIf` - causes the next fetch to be mocked if it matches the given string/RegExp/predicate. Can be chained.
  (i.e. "only mock 'fetch' if the next request is for the given URL otherwise, use the default behavior")
- `fetch.dontMockOnceIf(urlOrPredicate):fetch` - causes the next fetch to be not be mocked if it matches the given string/RegExp/predicate. Can be chained.
  (i.e. "don't mock 'fetch' if the next request is for the given URL, otherwise use the default behavior")
- `fetch.isMocking(input, init):boolean` - test utility function to see if the given url/request would be mocked.
  This is not a read only operation and any "MockOnce" will evaluate (and return to the default behavior)
  
For convenience, all the conditional mocking functions also accept optional parameters after the 1st parameter that call
  `mockResponse` or `mockResponseOnce` respectively.  This allows you to conditionally mock a response in a single call.

#### Conditional Mocking examples
```js

describe('conditional mocking', () => {
  const realResponse = 'REAL FETCH RESPONSE'
  const mockedDefaultResponse = 'MOCKED DEFAULT RESPONSE'
  const testUrl = defaultRequestUri
  let crossFetchSpy
  beforeEach(() => {
    fetch.resetMocks()
    fetch.mockResponse(mockedDefaultResponse)
    crossFetchSpy = jest
      .spyOn(require('cross-fetch'), 'fetch')
      .mockImplementation(async () =>
        Promise.resolve(new Response(realResponse))
      )
  })

  afterEach(() => {
    crossFetchSpy.mockRestore()
  })

  const expectMocked = async (uri, response = mockedDefaultResponse) => {
    return expect(request(uri)).resolves.toEqual(response)
  }
  const expectUnmocked = async uri => {
    return expect(request(uri)).resolves.toEqual(realResponse)
  }

  describe('once', () => {
    it('default', async () => {
      const otherResponse = 'other response'
      fetch.once(otherResponse)
      await expectMocked(defaultRequestUri, otherResponse)
      await expectMocked()
    })
    it('dont mock once then mock twice', async () => {
      const otherResponse = 'other response'
      fetch
        .dontMockOnce()
        .once(otherResponse)
        .once(otherResponse)

      await expectUnmocked()
      await expectMocked(defaultRequestUri, otherResponse)
      await expectMocked()
    })
  })

  describe('doMockIf', () => {
    it("doesn't mock normally", async () => {
      fetch.doMockIf('http://foo')
      await expectUnmocked()
      await expectUnmocked()
    })
    it('mocks when matches string', async () => {
      fetch.doMockIf(testUrl)
      await expectMocked()
      await expectMocked()
    })
    it('mocks when matches regex', async () => {
      fetch.doMockIf(new RegExp(testUrl))
      await expectMocked()
      await expectMocked()
    })
    it('mocks when matches predicate', async () => {
      fetch.doMockIf(input => input.url === testUrl)
      await expectMocked()
      await expectMocked()
    })
  })

  describe('dontMockIf', () => {
    it('mocks normally', async () => {
      fetch.dontMockIf('http://foo')
      await expectMocked()
      await expectMocked()
    })
    it('doesnt mock when matches string', async () => {
      fetch.dontMockIf(testUrl)
      await expectUnmocked()
      await expectUnmocked()
    })
    it('doesnt mock when matches regex', async () => {
      fetch.dontMockIf(new RegExp(testUrl))
      await expectUnmocked()
      await expectUnmocked()
    })
    it('doesnt mock when matches predicate', async () => {
      fetch.dontMockIf(input => input.url === testUrl)
      await expectUnmocked()
      await expectUnmocked()
    })
  })

  describe('doMockOnceIf (default mocked)', () => {
    it("doesn't mock normally", async () => {
      fetch.doMockOnceIf('http://foo')
      await expectUnmocked()
      await expectMocked()
    })
    it('mocks when matches string', async () => {
      fetch.doMockOnceIf(testUrl)
      await expectMocked()
      await expectMocked()
    })
    it('mocks when matches regex', async () => {
      fetch.doMockOnceIf(new RegExp(testUrl))
      await expectMocked()
      await expectMocked()
    })
    it('mocks when matches predicate', async () => {
      fetch.doMockOnceIf(input => input.url === testUrl)
      await expectMocked()
      await expectMocked()
    })
  })

  describe('dontMockOnceIf (default mocked)', () => {
    it('mocks normally', async () => {
      fetch.dontMockOnceIf('http://foo')
      await expectMocked()
      await expectMocked()
    })
    it('doesnt mock when matches string', async () => {
      fetch.dontMockOnceIf(testUrl)
      await expectUnmocked()
      await expectMocked()
    })
    it('doesnt mock when matches regex', async () => {
      fetch.dontMockOnceIf(new RegExp(testUrl))
      await expectUnmocked()
      await expectMocked()
    })
    it('doesnt mock when matches predicate', async () => {
      fetch.dontMockOnceIf(input => input.url === testUrl)
      await expectUnmocked()
      await expectMocked()
    })
  })

  describe('doMockOnceIf (default unmocked)', () => {
    beforeEach(() => {
      fetch.dontMock()
    })
    it("doesn't mock normally", async () => {
      fetch.doMockOnceIf('http://foo')
      await expectUnmocked()
      await expectUnmocked()
    })
    it('mocks when matches string', async () => {
      fetch.doMockOnceIf(testUrl)
      await expectMocked()
      await expectUnmocked()
    })
    it('mocks when matches regex', async () => {
      fetch.doMockOnceIf(new RegExp(testUrl))
      await expectMocked()
      await expectUnmocked()
    })
    it('mocks when matches predicate', async () => {
      fetch.doMockOnceIf(input => input.url === testUrl)
      await expectMocked()
      await expectUnmocked()
    })
  })

  describe('dontMockOnceIf (default unmocked)', () => {
    beforeEach(() => {
      fetch.dontMock()
    })
    it('mocks normally', async () => {
      fetch.dontMockOnceIf('http://foo')
      await expectMocked()
      await expectUnmocked()
    })
    it('doesnt mock when matches string', async () => {
      fetch.dontMockOnceIf(testUrl)
      await expectUnmocked()
      await expectUnmocked()
    })
    it('doesnt mock when matches regex', async () => {
      fetch.dontMockOnceIf(new RegExp(testUrl))
      await expectUnmocked()
      await expectUnmocked()
    })
    it('doesnt mock when matches predicate', async () => {
      fetch.dontMockOnceIf(input => input.url === testUrl)
      await expectUnmocked()
      await expectUnmocked()
    })
  })

  describe('dont/do mock', () => {
    test('dontMock', async () => {
      fetch.dontMock()
      await expectUnmocked()
      await expectUnmocked()
    })
    test('dontMockOnce', async () => {
      fetch.dontMockOnce()
      await expectUnmocked()
      await expectMocked()
    })
    test('doMock', async () => {
      fetch.dontMock()
      fetch.doMock()
      await expectMocked()
      await expectMocked()
    })
    test('doMockOnce', async () => {
      fetch.dontMock()
      fetch.doMockOnce()
      await expectMocked()
      await expectUnmocked()
    })
  })

```

```js
const expectMocked = async (uri, response = mockedDefaultResponse) => {
  return expect(request(uri)).resolves.toEqual(response)
}
const expectUnmocked = async uri => {
  return expect(request(uri)).resolves.toEqual(realResponse)
}

describe('conditional mocking complex', () => {
  const realResponse = 'REAL FETCH RESPONSE'
  const mockedDefaultResponse = 'MOCKED DEFAULT RESPONSE'
  const testUrl = defaultRequestUri
  let crossFetchSpy
  beforeEach(() => {
    fetch.resetMocks()
    fetch.mockResponse(mockedDefaultResponse)
    crossFetchSpy = jest
      .spyOn(require('cross-fetch'), 'fetch')
      .mockImplementation(async () =>
        Promise.resolve(new Response(realResponse))
      )
  })

  afterEach(() => {
    crossFetchSpy.mockRestore()
  })

  describe('complex example', () => {
    const alternativeUrl = 'http://bar'
    const alternativeBody = 'ALTERNATIVE RESPONSE'
    beforeEach(() => {
      fetch
        // .mockResponse(mockedDefaultResponse) // set above - here for clarity
        .mockResponseOnce('1') // 1
        .mockResponseOnce('2') // 2
        .mockResponseOnce(async uri =>
          uri === alternativeUrl ? alternativeBody : '3'
        ) // 3
        .mockResponseOnce('4') // 4
        .mockResponseOnce('5') // 5
        .mockResponseOnce(async uri =>
          uri === alternativeUrl ? alternativeBody : mockedDefaultResponse
        ) // 6
    })

    describe('default (`doMock`)', () => {
      beforeEach(() => {
        fetch
          // .doMock()    // the default - here for clarify
          .dontMockOnceIf(alternativeUrl)
          .doMockOnceIf(alternativeUrl)
          .doMockOnce()
          .dontMockOnce()
      })

      test('defaultRequestUri', async () => {
        await expectMocked(defaultRequestUri, '1') // 1
        await expectUnmocked(defaultRequestUri) // 2
        await expectMocked(defaultRequestUri, '3') // 3
        await expectUnmocked(defaultRequestUri) // 4
        // after .once('..')
        await expectMocked(defaultRequestUri, '5') // 5
        await expectMocked(defaultRequestUri, mockedDefaultResponse) // 6
        // default 'isMocked' (not 'Once')
        await expectMocked(defaultRequestUri, mockedDefaultResponse) // 7
      })

      test('alternativeUrl', async () => {
        await expectUnmocked(alternativeUrl) // 1
        await expectMocked(alternativeUrl, '2') // 2
        await expectMocked(alternativeUrl, alternativeBody) // 3
        await expectUnmocked(alternativeUrl) // 4
        // after .once('..')
        await expectMocked(alternativeUrl, '5') // 5
        await expectMocked(alternativeUrl, alternativeBody) // 6
        // default 'isMocked' (not 'Once')
        await expectMocked(alternativeUrl, mockedDefaultResponse) // 7
      })
    })

    describe('dontMock', () => {
      beforeEach(() => {
        fetch
          .dontMock()
          .dontMockOnceIf(alternativeUrl)
          .doMockOnceIf(alternativeUrl)
          .doMockOnce()
          .dontMockOnce()
      })

      test('defaultRequestUri', async () => {
        await expectMocked(defaultRequestUri, '1') // 1
        await expectUnmocked(defaultRequestUri) // 2
        await expectMocked(defaultRequestUri, '3') // 3
        await expectUnmocked(defaultRequestUri) // 4
        // after .once('..')
        await expectUnmocked(defaultRequestUri) // 5
        await expectUnmocked(defaultRequestUri) // 6
        // default 'isMocked' (not 'Once')
        await expectUnmocked(defaultRequestUri) // 7
      })

      test('alternativeUrl', async () => {
        await expectUnmocked(alternativeUrl) // 1
        await expectMocked(alternativeUrl, '2') // 2
        await expectMocked(alternativeUrl, alternativeBody) // 3
        await expectUnmocked(alternativeUrl) // 4
        // after .once('..')
        await expectUnmocked(alternativeUrl) // 5
        await expectUnmocked(alternativeUrl) // 6
        // default 'isMocked' (not 'Once')
        await expectUnmocked(alternativeUrl) // 7
      })
    })

    describe('doMockIf(alternativeUrl)', () => {
      beforeEach(() => {
        fetch
          .doMockIf(alternativeUrl)
          .dontMockOnceIf(alternativeUrl)
          .doMockOnceIf(alternativeUrl)
          .doMockOnce()
          .dontMockOnce()
      })

      test('defaultRequestUri', async () => {
        await expectMocked(defaultRequestUri, '1') // 1
        await expectUnmocked(defaultRequestUri) // 2
        await expectMocked(defaultRequestUri, '3') // 3
        await expectUnmocked(defaultRequestUri) // 4
        // after .once('..')
        await expectUnmocked(defaultRequestUri) // 5
        await expectUnmocked(defaultRequestUri) // 6
        // default 'isMocked' (not 'Once')
        await expectUnmocked(defaultRequestUri) // 7
      })

      test('alternativeUrl', async () => {
        await expectUnmocked(alternativeUrl) // 1
        await expectMocked(alternativeUrl, '2') // 2
        await expectMocked(alternativeUrl, alternativeBody) // 3
        await expectUnmocked(alternativeUrl) // 4
        // after .once('..')
        await expectMocked(alternativeUrl, '5') // 5
        await expectMocked(alternativeUrl, alternativeBody) // 6
        // default 'isMocked' (not 'Once')
        await expectMocked(alternativeUrl, mockedDefaultResponse) // 7
      })
    })

    describe('dontMockIf(alternativeUrl)', () => {
      beforeEach(() => {
        fetch
          .dontMockIf(alternativeUrl)
          .dontMockOnceIf(alternativeUrl)
          .doMockOnceIf(alternativeUrl)
          .doMockOnce()
          .dontMockOnce()
      })

      test('defaultRequestUri', async () => {
        await expectMocked(defaultRequestUri, '1') // 1
        await expectUnmocked(defaultRequestUri) // 2
        await expectMocked(defaultRequestUri, '3') // 3
        await expectUnmocked(defaultRequestUri) // 4
        // after .once('..')
        await expectMocked(defaultRequestUri, '5') // 5
        await expectMocked(defaultRequestUri, mockedDefaultResponse) // 6
        // default 'isMocked' (not 'Once')
        await expectMocked(defaultRequestUri, mockedDefaultResponse) // 7
      })

      test('alternativeUrl', async () => {
        await expectUnmocked(alternativeUrl) // 1
        await expectMocked(alternativeUrl, '2') // 2
        await expectMocked(alternativeUrl, alternativeBody) // 3
        await expectUnmocked(alternativeUrl) // 4
        // after .once('..')
        await expectUnmocked(alternativeUrl) // 5
        await expectUnmocked(alternativeUrl) // 6
        // default 'isMocked' (not 'Once')
        await expectUnmocked(alternativeUrl) // 7
      })
    })
  })
})
```
