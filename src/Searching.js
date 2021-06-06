/*
Copyright 2019 The Matrix.org Foundation C.I.C.

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

import EventIndexPeg from "./indexing/EventIndexPeg";
import {MatrixClientPeg} from "./MatrixClientPeg";

const SEARCH_LIMIT = 10;

async function serverSideSearch(term, roomId = undefined) {
    const client = MatrixClientPeg.get();

    const filter = {
        limit: SEARCH_LIMIT,
    };

    if (roomId !== undefined) filter.rooms = [roomId];

    const body = {
        search_categories: {
            room_events: {
                search_term: term,
                filter: filter,
                order_by: "recent",
                event_context: {
                    before_limit: 1,
                    after_limit: 1,
                    include_profile: true,
                },
            },
        },
    };

    const response = await client.search({body: body});

    const result = {
        response: response,
        query: body,
    };

    return result;
}

async function serverSideSearchProcess(term, roomId = undefined) {
    const client = MatrixClientPeg.get();
    const result = await serverSideSearch(term, roomId);

    // The js-sdk method backPaginateRoomEventsSearch() uses _query internally
    // so we're reusing the concept here since we wan't to delegate the
    // pagination back to backPaginateRoomEventsSearch() in some cases.
    const searchResult = {
        _query: result.query,
        results: [],
        highlights: [],
    };

    return client.processRoomEventsSearch(searchResult, result.response);
}

function compareEvents(a, b) {
    const aEvent = a.result;
    const bEvent = b.result;

    if (aEvent.origin_server_ts > bEvent.origin_server_ts) return -1;
    if (aEvent.origin_server_ts < bEvent.origin_server_ts) return 1;

    return 0;
}

async function combinedSearch(searchTerm) {
    const client = MatrixClientPeg.get();

    // Create two promises, one for the local search, one for the
    // server-side search.
    const serverSidePromise = serverSideSearch(searchTerm);
    const localPromise = localSearch(searchTerm);

    // Wait for both promises to resolve.
    await Promise.all([serverSidePromise, localPromise]);

    // Get both search results.
    const localResult = await localPromise;
    const serverSideResult = await serverSidePromise;

    const serverQuery = serverSideResult.query;
    const serverResponse = serverSideResult.response;

    const localQuery = localResult.query;
    const localResponse = localResult.response;

    // Store our queries for later on so we can support pagination.
    //
    // We're reusing _query here again to not introduce separate code paths and
    // concepts for our different pagination methods. We're storing the
    // server-side next batch separately since the query is the json body of
    // the request and next_batch needs to be a query parameter.
    //
    // We can't put it in the final result that _processRoomEventsSearch()
    // returns since that one can be either a server-side one, a local one or a
    // fake one to fetch the remaining cached events. See the docs for
    // combineEvents() for an explanation why we need to cache events.
    const emptyResult = {
        seshatQuery: localQuery,
        _query: serverQuery,
        serverSideNextBatch: serverResponse.next_batch,
        cachedEvents: [],
        oldestEventFrom: "server",
        results: [],
        highlights: [],
    };

    // Combine our results.
    const combinedResult = combineResponses(emptyResult, localResponse, serverResponse.search_categories.room_events);

    // Let the client process the combined result.
    const response = {
        search_categories: {
            room_events: combinedResult,
        },
    };

    const result = client.processRoomEventsSearch(emptyResult, response);

    // Restore our encryption info so we can properly re-verify the events.
    restoreEncryptionInfo(result.results);

    return result;
}

async function localSearch(searchTerm, roomId = undefined, processResult = true) {
    const eventIndex = EventIndexPeg.get();

    const searchArgs = {
        search_term: searchTerm,
        before_limit: 1,
        after_limit: 1,
        limit: SEARCH_LIMIT,
        order_by_recency: true,
        room_id: undefined,
    };

    if (roomId !== undefined) {
        searchArgs.room_id = roomId;
    }

    const localResult = await eventIndex.search(searchArgs);

    searchArgs.next_batch = localResult.next_batch;

    const result = {
        response: localResult,
        query: searchArgs,
    };

    return result;
}

async function localSearchProcess(searchTerm, roomId = undefined) {
    const emptyResult = {
        results: [],
        highlights: [],
    };

    if (searchTerm === "") return emptyResult;

    const result = await localSearch(searchTerm, roomId);

    emptyResult.seshatQuery = result.query;

    const response = {
        search_categories: {
            room_events: result.response,
        },
    };

    const processedResult = MatrixClientPeg.get().processRoomEventsSearch(emptyResult, response);
    // Restore our encryption info so we can properly re-verify the events.
    restoreEncryptionInfo(processedResult.results);

    return processedResult;
}

async function localPagination(searchResult) {
    const eventIndex = EventIndexPeg.get();

    const searchArgs = searchResult.seshatQuery;

    const localResult = await eventIndex.search(searchArgs);
    searchResult.seshatQuery.next_batch = localResult.next_batch;

    // We only need to restore the encryption state for the new results, so
    // remember how many of them we got.
    const newResultCount = localResult.results.length;

    const response = {
        search_categories: {
            room_events: localResult,
        },
    };

    const result = MatrixClientPeg.get().processRoomEventsSearch(searchResult, response);

    // Restore our encryption info so we can properly re-verify the events.
    const newSlice = result.results.slice(Math.max(result.results.length - newResultCount, 0));
    restoreEncryptionInfo(newSlice);

    searchResult.pendingRequest = null;

    return result;
}

function compareOldestEvents(firstResults, secondResults) {
    try {
        const oldestFirstEvent = firstResults.results[firstResults.results.length - 1].result;
        const oldestSecondEvent = secondResults.results[secondResults.results.length - 1].result;

        if (oldestFirstEvent.origin_server_ts <= oldestSecondEvent.origin_server_ts) {
            return -1;
        } else {
            return 1;
        }
    } catch {
        return 0;
    }
}

function combineEventSources(previousSearchResult, response, a, b) {
    // Merge event sources and sort the events.
    const combinedEvents = a.concat(b).sort(compareEvents);
    // Put half of the events in the response, and cache the other half.
    response.results = combinedEvents.slice(0, SEARCH_LIMIT);
    previousSearchResult.cachedEvents = combinedEvents.slice(SEARCH_LIMIT);
}

/**
 * Combine the events from our event sources into a sorted result
 *
 * This method will first be called from the combinedSearch() method. In this
 * case we will fetch SEARCH_LIMIT events from the server and the local index.
 *
 * The method will put the SEARCH_LIMIT newest events from the server and the
 * local index in the results part of the response, the rest will be put in the
 * cachedEvents field of the previousSearchResult (in this case an empty search
 * result).
 *
 * Every subsequent call will be made from the combinedPagination() method, in
 * this case we will combine the cachedEvents and the next SEARCH_LIMIT events
 * from either the server or the local index.
 *
 * Since we have two event sources and we need to sort the results by date we
 * need keep on looking for the oldest event. We are implementing a variation of
 * a sliding window.
 *
 * The event sources are here represented as two sorted lists where the smallest
 * number represents the newest event. The two lists need to be merged in a way
 * that preserves the sorted property so they can be shown as one search result.
 * We first fetch SEARCH_LIMIT events from both sources.
 *
 * If we set SEARCH_LIMIT to 3:
 *
 *  Server events [01, 02, 04, 06, 07, 08, 11, 13]
 *                |01, 02, 04|
 *  Local events  [03, 05, 09, 10, 12, 14, 15, 16]
 *                |03, 05, 09|
 *
 *  We note that the oldest event is from the local index, and we combine the
 *  results:
 *
 *  Server window [01, 02, 04]
 *  Local window  [03, 05, 09]
 *
 *  Combined events [01, 02, 03, 04, 05, 09]
 *
 *  We split the combined result in the part that we want to present and a part
 *  that will be cached.
 *
 *  Presented events [01, 02, 03]
 *  Cached events    [04, 05, 09]
 *
 *  We slide the window for the server since the oldest event is from the local
 *  index.
 *
 *  Server events [01, 02, 04, 06, 07, 08, 11, 13]
 *                            |06, 07, 08|
 *  Local events  [03, 05, 09, 10, 12, 14, 15, 16]
 *                |XX, XX, XX|
 *  Cached events [04, 05, 09]
 *
 *  We note that the oldest event is from the server and we combine the new
 *  server events with the cached ones.
 *
 *  Cached events [04, 05, 09]
 *  Server events [06, 07, 08]
 *
 *  Combined events [04, 05, 06, 07, 08, 09]
 *
 *  We split again.
 *
 *  Presented events [04, 05, 06]
 *  Cached events    [07, 08, 09]
 *
 *  We slide the local window, the oldest event is on the server.
 *
 *  Server events [01, 02, 04, 06, 07, 08, 11, 13]
 *                            |XX, XX, XX|
 *  Local events  [03, 05, 09, 10, 12, 14, 15, 16]
 *                            |10, 12, 14|
 *
 *  Cached events [07, 08, 09]
 *  Local events  [10, 12, 14]
 *  Combined events [07, 08, 09, 10, 12, 14]
 *
 *  Presented events [07, 08, 09]
 *  Cached events    [10, 12, 14]
 *
 *  Next up we slide the server window again.
 *
 *  Server events [01, 02, 04, 06, 07, 08, 11, 13]
 *                                        |11, 13|
 *  Local events  [03, 05, 09, 10, 12, 14, 15, 16]
 *                            |XX, XX, XX|
 *
 *  Cached events [10, 12, 14]
 *  Server events [11, 13]
 *  Combined events [10, 11, 12, 13, 14]
 *
 *  Presented events [10, 11, 12]
 *  Cached events    [13, 14]
 *
 *  We have one source exhausted, we fetch the rest of our events from the other
 *  source and combine it with our cached events.
 *
 *
 * @param {object} previousSearchResult A search result from a previous search
 * call.
 * @param {object} localEvents An unprocessed search result from the event
 * index.
 * @param {object} serverEvents An unprocessed search result from the server.
 *
 * @return {object} A response object that combines the events from the
 * different event sources.
 *
 */
function combineEvents(previousSearchResult, localEvents = undefined, serverEvents = undefined) {
    const response = {};

    const cachedEvents = previousSearchResult.cachedEvents;
    let oldestEventFrom = previousSearchResult.oldestEventFrom;
    response.highlights = previousSearchResult.highlights;

    if (localEvents && serverEvents && serverEvents.results) {
        // This is a first search call, combine the events from the server and
        // the local index. Note where our oldest event came from, we shall
        // fetch the next batch of events from the other source.
        if (compareOldestEvents(localEvents, serverEvents) < 0) {
            oldestEventFrom = "local";
        }

        combineEventSources(previousSearchResult, response, localEvents.results, serverEvents.results);
        response.highlights = localEvents.highlights.concat(serverEvents.highlights);
    } else if (localEvents) {
        // This is a pagination call fetching more events from the local index,
        // meaning that our oldest event was on the server.
        // Change the source of the oldest event if our local event is older
        // than the cached one.
        if (compareOldestEvents(localEvents, cachedEvents) < 0) {
            oldestEventFrom = "local";
        }
        combineEventSources(previousSearchResult, response, localEvents.results, cachedEvents);
    } else if (serverEvents && serverEvents.results) {
        // This is a pagination call fetching more events from the server,
        // meaning that our oldest event was in the local index.
        // Change the source of the oldest event if our server event is older
        // than the cached one.
        if (compareOldestEvents(serverEvents, cachedEvents) < 0) {
            oldestEventFrom = "server";
        }
        combineEventSources(previousSearchResult, response, serverEvents.results, cachedEvents);
    } else {
        // This is a pagination call where we exhausted both of our event
        // sources, let's push the remaining cached events.
        response.results = cachedEvents;
        previousSearchResult.cachedEvents = [];
    }

    previousSearchResult.oldestEventFrom = oldestEventFrom;

    return response;
}

/**
 * Combine the local and server search responses
 *
 * @param {object} previousSearchResult A search result from a previous search
 * call.
 * @param {object} localEvents An unprocessed search result from the event
 * index.
 * @param {object} serverEvents An unprocessed search result from the server.
 *
 * @return {object} A response object that combines the events from the
 * different event sources.
 */
function combineResponses(previousSearchResult, localEvents = undefined, serverEvents = undefined) {
    // Combine our events first.
    const response = combineEvents(previousSearchResult, localEvents, serverEvents);

    // Our first search will contain counts from both sources, subsequent
    // pagination requests will fetch responses only from one of the sources, so
    // reuse the first count when we're paginating.
    if (previousSearchResult.count) {
        response.count = previousSearchResult.count;
    } else {
        response.count = localEvents.count + serverEvents.count;
    }

    // Update our next batch tokens for the given search sources.
    if (localEvents) {
        previousSearchResult.seshatQuery.next_batch = localEvents.next_batch;
    }
    if (serverEvents) {
        previousSearchResult.serverSideNextBatch = serverEvents.next_batch;
    }

    // Set the response next batch token to one of the tokens from the sources,
    // this makes sure that if we exhaust one of the sources we continue with
    // the other one.
    if (previousSearchResult.seshatQuery.next_batch) {
        response.next_batch = previousSearchResult.seshatQuery.next_batch;
    } else if (previousSearchResult.serverSideNextBatch) {
        response.next_batch = previousSearchResult.serverSideNextBatch;
    }

    // We collected all search results from the server as well as from Seshat,
    // we still have some events cached that we'll want to display on the next
    // pagination request.
    //
    // Provide a fake next batch token for that case.
    if (!response.next_batch && previousSearchResult.cachedEvents.length > 0) {
        response.next_batch = "cached";
    }

    return response;
}

function restoreEncryptionInfo(searchResultSlice = []) {
    for (let i = 0; i < searchResultSlice.length; i++) {
        const timeline = searchResultSlice[i].context.getTimeline();

        for (let j = 0; j < timeline.length; j++) {
            const ev = timeline[j];

            if (ev.event.curve25519Key) {
                ev.makeEncrypted(
                    "m.room.encrypted",
                    { algorithm: ev.event.algorithm },
                    ev.event.curve25519Key,
                    ev.event.ed25519Key,
                );
                ev._forwardingCurve25519KeyChain = ev.event.forwardingCurve25519KeyChain;

                delete ev.event.curve25519Key;
                delete ev.event.ed25519Key;
                delete ev.event.algorithm;
                delete ev.event.forwardingCurve25519KeyChain;
            }
        }
    }
}

async function combinedPagination(searchResult) {
    const eventIndex = EventIndexPeg.get();
    const client = MatrixClientPeg.get();

    const searchArgs = searchResult.seshatQuery;
    const oldestEventFrom = searchResult.oldestEventFrom;

    let localResult;
    let serverSideResult;

    // Fetch events from the local index if we have a token for itand if it's
    // the local indexes turn or the server has exhausted its results.
    if (searchArgs.next_batch && (!searchResult.serverSideNextBatch || oldestEventFrom === "server")) {
        localResult = await eventIndex.search(searchArgs);
    }

    // Fetch events from the server if we have a token for it and if it's the
    // local indexes turn or the local index has exhausted its results.
    if (searchResult.serverSideNextBatch && (oldestEventFrom === "local" || !searchArgs.next_batch)) {
        const body = {body: searchResult._query, next_batch: searchResult.serverSideNextBatch};
        serverSideResult = await client.search(body);
    }

    let serverEvents;

    if (serverSideResult) {
        serverEvents = serverSideResult.search_categories.room_events;
    }

    // Combine our events.
    const combinedResult = combineResponses(searchResult, localResult, serverEvents);

    const response = {
        search_categories: {
            room_events: combinedResult,
        },
    };

    const oldResultCount = searchResult.results ? searchResult.results.length : 0;

    // Let the client process the combined result.
    const result = client.processRoomEventsSearch(searchResult, response);

    // Restore our encryption info so we can properly re-verify the events.
    const newResultCount = result.results.length - oldResultCount;
    const newSlice = result.results.slice(Math.max(result.results.length - newResultCount, 0));
    restoreEncryptionInfo(newSlice);

    searchResult.pendingRequest = null;

    return result;
}

function eventIndexSearch(term, roomId = undefined) {
    let searchPromise;

    if (roomId !== undefined) {
        if (MatrixClientPeg.get().isRoomEncrypted(roomId)) {
            // The search is for a single encrypted room, use our local
            // search method.
            searchPromise = localSearchProcess(term, roomId);
        } else {
            // The search is for a single non-encrypted room, use the
            // server-side search.
            searchPromise = serverSideSearchProcess(term, roomId);
        }
    } else {
        // Search across all rooms, combine a server side search and a
        // local search.
        searchPromise = combinedSearch(term);
    }

    return searchPromise;
}

function eventIndexSearchPagination(searchResult) {
    const client = MatrixClientPeg.get();

    const seshatQuery = searchResult.seshatQuery;
    const serverQuery = searchResult._query;

    if (!seshatQuery) {
        // This is a search in a non-encrypted room. Do the normal server-side
        // pagination.
        return client.backPaginateRoomEventsSearch(searchResult);
    } else if (!serverQuery) {
        // This is a search in a encrypted room. Do a local pagination.
        const promise = localPagination(searchResult);
        searchResult.pendingRequest = promise;

        return promise;
    } else {
        // We have both queries around, this is a search across all rooms so a
        // combined pagination needs to be done.
        const promise = combinedPagination(searchResult);
        searchResult.pendingRequest = promise;

        return promise;
    }
}

export function searchPagination(searchResult) {
    const eventIndex = EventIndexPeg.get();
    const client = MatrixClientPeg.get();

    if (searchResult.pendingRequest) return searchResult.pendingRequest;

    if (eventIndex === null) return client.backPaginateRoomEventsSearch(searchResult);
    else return eventIndexSearchPagination(searchResult);
}

export default function eventSearch(term, roomId = undefined) {
    const eventIndex = EventIndexPeg.get();

    if (eventIndex === null) return serverSideSearchProcess(term, roomId);
    else return eventIndexSearch(term, roomId);
}
