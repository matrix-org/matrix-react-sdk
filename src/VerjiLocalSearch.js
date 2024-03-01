import { MatrixClientPeg } from "./MatrixClientPeg";
import { SearchResult } from "matrix-js-sdk/src/models/search-result";
import { EventContext } from "matrix-js-sdk/src/models/event-context";
import { EventTimeline } from "matrix-js-sdk/src/matrix";

export default async function searchAllEventsLocally(term, roomId) {
    return new Promise(async (resolve, reject) => {
		const searchResult = {
			_query: term,
			results: [],
			highlights: [],
			count: 0
		};
        const client = MatrixClientPeg.get();
		const room = client.getRoom(roomId);
		const members = room.currentState.getMembers();
		const termObj = makeSearchTermObject(term.trim());
		if (termObj.isEmptySearch) {
			resolve(searchResult);
			return;
		}

		const matchingMembers = members.filter(m => isMemberMatch(m, termObj));
		const memberObj = {};
		for (var i = 0; i < matchingMembers.length; i++) {
			memberObj[matchingMembers[i].userId] = matchingMembers[i];
		}
        // Get keys?
        // First, make sure the entire history is loaded
        await loadFullHistory(client, room);
        // Now find all elements
		const matches = await findAllMatches(termObj, room, memberObj);

		processSearchResults(searchResult, matches, termObj);
        resolve(searchResult);
    });
}

async function loadFullHistory(client, room) {
	let hasMoreEvents = true;
	do {
		try {
			// get the first neighbour of the live timeline on every iteration
			// as each time we paginate, two timelines could have overlapped and connected, and the new
			// pagination token ends up on the first one.
			const timeline = getFirstLiveTimelineNeighbour(room);
			hasMoreEvents = await client.paginateEventTimeline(timeline, {limit: 100, backwards: true});
		} catch (err) {
			// deal with rate-limit error
			if (err.name === "M_LIMIT_EXCEEDED") {
        		const waitTime = err.data.retry_after_ms;
				await new Promise(r => setTimeout(r, waitTime));
			} else {
				throw err;
			}
		}
	} while (hasMoreEvents);
}

function getFirstLiveTimelineNeighbour(room) {
	const liveTimeline = room.getLiveTimeline();
	let timeline = liveTimeline;
	while (timeline) {
		const neighbour = timeline.getNeighbouringTimeline(EventTimeline.BACKWARDS);
		if (!neighbour) {
			return timeline;
		}
		timeline = neighbour;
	}
}

function iterateAllEvents(room, callback) {
	let timeline = room.getLiveTimeline();
	while (timeline) {
		const events = timeline.getEvents();
		for (var i = events.length - 1; i >= 0; i--) {
			callback(events[i]);
		}
		timeline = timeline.getNeighbouringTimeline(EventTimeline.BACKWARDS);
	}
}

export async function findAllMatches(termObj, room, matchingMembers) {
	return new Promise((resolve) => {
		const matches = [];
		let searchHit = null;
		let mostRecentEvent = null;
		const iterationCallback = (roomEvent) => {
			if (searchHit !== null) {
				searchHit.context.addEvents([roomEvent], false);
			}
			searchHit = null;

			if (roomEvent.getType() === 'm.room.message' && !roomEvent.isRedacted()) {
				if (eventMatchesSearchTerms(termObj, roomEvent, matchingMembers)) {
					var evCtx = new EventContext(roomEvent);
					if (mostRecentEvent !== null) {
						evCtx.addEvents([mostRecentEvent], true);
					}

					var resObj = { result: roomEvent, context: evCtx };

					matches.push(resObj);
					searchHit = resObj;
					return;
				}
			}
			mostRecentEvent = roomEvent;
		};

		iterateAllEvents(room, iterationCallback);
		resolve(matches);
	});
}

export function isMemberMatch(member, termObj) {
	const memberName = member.name.toLowerCase();
	if (termObj.searchTypeAdvanced === true) {
		var expResults = memberName.match(termObj.searchExpression);
		if (expResults && expResults.length > 0) {
			for (var i = 0; i < expResults.length; i++) {
				if (!termObj.regExpHighlightMap[expResults[i]]) {
					termObj.regExpHighlightMap[expResults[i]] = true;
					termObj.regExpHighlights.push(expResults[i]);
				}
			}
			return true;
		}
		return false;
	}

	if (memberName.indexOf(termObj.fullText) > -1) {
		return true;
	}

	for (var i = 0; i < termObj.words.length; i++) {
		var word = termObj.words[i];
		if (memberName.indexOf(word) === -1) {
			return false;
		}
	}

	return true;
}

export function eventMatchesSearchTerms(searchTermObj, evt, matchingMembers) {
	let content = evt.getContent();
	let sender = evt.getSender();
	let loweredEventContent = content.body.toLowerCase();

	let evtDate = evt.getDate();
	let dateIso = evtDate.toISOString();
	let dateLocale = evtDate.toLocaleString();

	if (matchingMembers[sender.userId] !== undefined) {
		return true;
	}

	if (searchTermObj.searchTypeAdvanced === true) {
		var expressionResults = loweredEventContent.match(searchTermObj.searchExpression);
		if (expressionResults && expressionResults.length > 0) {
			for (var i = 0; i < expressionResults.length; i++) {
				if (!searchTermObj.regExpHighlightMap[expressionResults[i]]) {
					searchTermObj.regExpHighlightMap[expressionResults[i]] = true;
					searchTermObj.regExpHighlights.push(expressionResults[i]);
				}
			}
			return true;
		}

		var dateIsoExprResults = dateIso.match(searchTermObj.searchExpression);
		var dateLocaleExprResults = dateLocale.match(searchTermObj.searchExpression);
		if ((dateIsoExprResults && dateIsoExprResults.length > 0) || (dateLocaleExprResults && dateLocaleExprResults.length > 0)) {
			return true;
		}

		return false;
	}

	if (loweredEventContent.indexOf(searchTermObj.fullText) > -1) {
		return true;
	}

	if (dateIso.indexOf(searchTermObj.fullText) > -1 || dateLocale.indexOf(searchTermObj.fullText) > -1) {
		return true;
	}

	if (searchTermObj.words.length > 0) {
		for (var i = 0; i < searchTermObj.words.length; i++) {
			var word = searchTermObj.words[i];
			if (loweredEventContent.indexOf(word) === -1) {
				return false;
			}
		}
		return true;
	}

	return false;
}

export function makeSearchTermObject(searchTerm) {
	let term = searchTerm.toLowerCase();
	if (term.indexOf('rx:') === 0) {
		term = searchTerm.substring(3).trim();
		return {
			searchTypeAdvanced: true,
			searchTypeNormal: false,
			searchExpression: new RegExp(term),
			words: [],
			regExpHighlights: [],
			regExpHighlightMap: {},
			isEmptySearch: term.length === 0
		};
	}

	const words = term.split(' ').filter(w => w).map(function(w) { return { word: w, highlight: false }; });

	return {
		searchTypeAdvanced: false,
		searchTypeNormal: true,
		fullText: term,
		words: words,
		regExpHighlights: [],
		isEmptySearch: term.length === 0
	};
}

function processSearchResults(searchResults, matches, termObj) {
	for (let i = 0; i < matches.length; i++) {
		const sr = new SearchResult(1, matches[i].context);
        sr.context.timeline = sr.context.timeline.reverse();
		searchResults.results.push(sr);
	}

	const highlights = termObj.words.filter(w => w.highlight).map(w => w.word);
	searchResults.highlights = highlights;
	for (var i = 0; i < termObj.regExpHighlights.length; i++) {
		searchResults.highlights.push(termObj.regExpHighlights[i]);
	}
	searchResults.count = matches.length;
	return searchResults;
}
