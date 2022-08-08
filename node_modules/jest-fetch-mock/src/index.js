const crossFetch = require('cross-fetch')
global.fetch = crossFetch
global.Response = crossFetch.Response
global.Headers = crossFetch.Headers
global.Request = crossFetch.Request

if (!Promise) {
  Promise = require('promise-polyfill')
} else if (!Promise.finally) {
  Promise.finally = require('promise-polyfill').finally
}

const ActualResponse = Response

function responseWrapper(body, init) {
  if (
    body &&
    typeof body.constructor === 'function' &&
    body.constructor.__isFallback
  ) {
    const response = new ActualResponse(null, init)
    response.body = body

    const actualClone = response.clone
    response.clone = () => {
      const clone = actualClone.call(response)
      const [body1, body2] = body.tee()
      response.body = body1
      clone.body = body2
      return clone
    }

    return response
  }

  return new ActualResponse(body, init)
}

function responseInit(resp, init) {
  if (typeof resp.init === 'object') {
    return resp.init
  } else {
    init = Object.assign({}, init || {})
    for (const field of ['status', 'statusText', 'headers', 'url']) {
      if (field in resp) {
        init[field] = resp[field]
      }
    }
    return init
  }
}

function requestMatches(urlOrPredicate) {
  const predicate =
    urlOrPredicate instanceof RegExp
      ? input => urlOrPredicate.test(input.url)
      : typeof urlOrPredicate === 'string'
      ? input => input.url === urlOrPredicate
      : urlOrPredicate
  return (input, reqInit) => {
    const req = normalizeRequest(input, reqInit)
    return [predicate(req), req]
  }
}

function requestNotMatches(urlOrPredicate) {
  const matches = requestMatches(urlOrPredicate)
  return input => {
    const result = matches(input)
    return [!result[0], result[1]]
  }
}

function staticMatches(value) {
  return (input, reqInit) => {
    return [value, normalizeRequest(input, reqInit)]
  }
}

const isFn = unknown => typeof unknown === 'function'

const isMocking = jest.fn(staticMatches(true))

const abortError = () =>
  new DOMException('The operation was aborted. ', 'AbortError')

const abort = () => {
  throw abortError()
}

const abortAsync = () => {
  return Promise.reject(abortError())
}

const normalizeResponse = (bodyOrFunction, init) => (input, reqInit) => {
  const [mocked, request] = isMocking(input, reqInit)
  return mocked
    ? isFn(bodyOrFunction)
      ? bodyOrFunction(request).then(resp => {
          if (request.signal && request.signal.aborted) {
            abort()
          }
          return typeof resp === 'string'
            ? responseWrapper(resp, init)
            : responseWrapper(resp.body, responseInit(resp, init))
        })
      : new Promise((resolve, reject) => {
          if (request.signal && request.signal.aborted) {
            reject(abortError())
            return
          }
          resolve(responseWrapper(bodyOrFunction, init))
        })
    : crossFetch.fetch(input, reqInit)
}

const normalizeRequest = (input, reqInit) => {
  if (input instanceof Request) {
    if (input.signal && input.signal.aborted) {
      abort()
    }
    return input
  } else if (typeof input === 'string') {
    if (reqInit && reqInit.signal && reqInit.signal.aborted) {
      abort()
    }
    return new Request(input, reqInit)
  } else {
    throw new TypeError('Unable to parse input as string or Request')
  }
}

const normalizeError = errorOrFunction =>
  isFn(errorOrFunction)
    ? errorOrFunction
    : () => Promise.reject(errorOrFunction)

const fetch = jest.fn(normalizeResponse(''))
fetch.Headers = Headers
fetch.Response = responseWrapper
fetch.Request = Request
fetch.mockResponse = (bodyOrFunction, init) =>
  fetch.mockImplementation(normalizeResponse(bodyOrFunction, init))

fetch.mockReject = errorOrFunction =>
  fetch.mockImplementation(normalizeError(errorOrFunction))

fetch.mockAbort = () => fetch.mockImplementation(abortAsync)
fetch.mockAbortOnce = () => fetch.mockImplementationOnce(abortAsync)

const mockResponseOnce = (bodyOrFunction, init) =>
  fetch.mockImplementationOnce(normalizeResponse(bodyOrFunction, init))

fetch.mockResponseOnce = mockResponseOnce

fetch.once = mockResponseOnce

fetch.mockRejectOnce = errorOrFunction =>
  fetch.mockImplementationOnce(normalizeError(errorOrFunction))

fetch.mockResponses = (...responses) => {
  responses.forEach(response => {
    if (Array.isArray(response)) {
      const [body, init] = response
      fetch.mockImplementationOnce(normalizeResponse(body, init))
    } else {
      fetch.mockImplementationOnce(normalizeResponse(response))
    }
  })
  return fetch
}

fetch.isMocking = (req, reqInit) => isMocking(req, reqInit)[0]

fetch.mockIf = fetch.doMockIf = (urlOrPredicate, bodyOrFunction, init) => {
  isMocking.mockImplementation(requestMatches(urlOrPredicate))
  if (bodyOrFunction) {
    fetch.mockResponse(bodyOrFunction, init)
  }
  return fetch
}

fetch.dontMockIf = (urlOrPredicate, bodyOrFunction, init) => {
  isMocking.mockImplementation(requestNotMatches(urlOrPredicate))
  if (bodyOrFunction) {
    fetch.mockResponse(bodyOrFunction, init)
  }
  return fetch
}

fetch.mockOnceIf = fetch.doMockOnceIf = (
  urlOrPredicate,
  bodyOrFunction,
  init
) => {
  isMocking.mockImplementationOnce(requestMatches(urlOrPredicate))
  if (bodyOrFunction) {
    mockResponseOnce(bodyOrFunction, init)
  }
  return fetch
}

fetch.dontMockOnceIf = (urlOrPredicate, bodyOrFunction, init) => {
  isMocking.mockImplementationOnce(requestNotMatches(urlOrPredicate))
  if (bodyOrFunction) {
    mockResponseOnce(bodyOrFunction, init)
  }
  return fetch
}

fetch.dontMock = () => {
  isMocking.mockImplementation(staticMatches(false))
  return fetch
}

fetch.dontMockOnce = () => {
  isMocking.mockImplementationOnce(staticMatches(false))
  return fetch
}

fetch.doMock = (bodyOrFunction, init) => {
  isMocking.mockImplementation(staticMatches(true))
  if (bodyOrFunction) {
    fetch.mockResponse(bodyOrFunction, init)
  }
  return fetch
}

fetch.mockOnce = fetch.doMockOnce = (bodyOrFunction, init) => {
  isMocking.mockImplementationOnce(staticMatches(true))
  if (bodyOrFunction) {
    mockResponseOnce(bodyOrFunction, init)
  }
  return fetch
}

fetch.resetMocks = () => {
  fetch.mockReset()
  isMocking.mockReset()

  // reset to default implementation with each reset
  fetch.mockImplementation(normalizeResponse(''))
  fetch.doMock()
  fetch.isMocking = isMocking
}

fetch.enableMocks = fetch.enableFetchMocks = () => {
  global.fetchMock = global.fetch = fetch
  try {
    jest.setMock('node-fetch', fetch)
  } catch (error) {
    //ignore
  }
}

fetch.disableMocks = fetch.disableFetchMocks = () => {
  global.fetch = crossFetch
  try {
    jest.dontMock('node-fetch')
  } catch (error) {
    //ignore
  }
}

module.exports = fetch.default = fetch
