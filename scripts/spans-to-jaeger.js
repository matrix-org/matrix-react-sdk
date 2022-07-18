// convert SPAN lines into something Jaeger can parse.
// Usage: node convert-spans-to-jaeger.js console-output.log > trace.json
//
// Where console-output.log has lines line:
// SPAN START 1658139854077 MatrixClientPeg_start {"line":"at MatrixClientPegClass.start (webpack-internal:///160:180:65)"}
// SPAN START 1658139854451 pre_sync_loop {"line":"at SyncApi.sync (webpack-internal:///201:578:48)"}
// SPAN START 1658139854451 pre_sync_loop|push_rules {"line":"at getPushRules (webpack-internal:///201:598:52)"}
// SPAN END 1658139854453 MatrixClientPeg_start {"line":"at MatrixClientPegClass.start (webpack-internal:///160:185:65)"}

"use-strict";

const fs = require('fs');

const traceId = "trace"+new Date().getTime();
const procId = "client";
const spanIdToEntries = {};
const outputJson = {
    traceID: traceId,
    spans: [],
    processes: {
        client: {
            serviceName: procId,
            tags: [
                /*
                {
                    "key": "ip",
                    "type": "string",
                    "value": "192.168.1.102"
                } */
            ]
        }
    }
};

/*
{
				"traceID": "665b3cc06e48f122",
				"spanID": "616bc4df9f135fcd",
				"flags": 1,
				"operationName": "HTTP GET: /customer",
				"references": [{
					"refType": "CHILD_OF",
					"traceID": "665b3cc06e48f122",
					"spanID": "665b3cc06e48f122"
				}],
				"startTime": 1555385360015391,
				"duration": 179848,
				"tags": [],
				"logs": [],
				"processID": "client"
			}
            */

let spanId = 0;
const generateSpanId = () => {
    spanId++;
    return "" + spanId;
}
let openSpans = {};
const addSpan = (startSpan, endSpan) => {
    const startTime = new Date(Number(startSpan.timestamp)) * 1000;
    const endTime = new Date(Number(endSpan.timestamp)) * 1000;
    const tags = Object.keys(startSpan.keysJson).map((k) => {
        return {
            key: k,
            type: typeof startSpan.keysJson[k],
            value: startSpan.keysJson[k],
        };
    });
    // foo|bar|baz => baz is child of bar who is child of foo
    const references = [];
    const levels = startSpan.spanName.split("|");
    let opName = startSpan.spanName;
    if (levels.length > 1) {
        // we only want the last span segment (baz only refs bar, not bar and foo).
        const parentSpanName = levels.slice(0, levels.length-1).join("|");
        let parentSpanId;
        // find the span so we can grab the ID
        const openSpanIds = Object.keys(openSpans);
        for (let i = openSpanIds.length-1; i >= 0; i--) {
            const sid = openSpanIds[i];
            const s = openSpans[sid];
            if (s.spanName === parentSpanName) {
                parentSpanId = sid;
                break;
            }
        }
        if (parentSpanId) {
            references.push({
                refType: "CHILD_OF",
                traceID: traceId,
                spanID: parentSpanId,
            });
            opName = levels[levels.length-1];
        } else {
            console.error("failed to find parent for span " + startSpan.spanName + " parent: " + parentSpanName + " data: " + JSON.stringify(startSpan));
        }
    }
    outputJson.spans.push({
        traceID: traceId,
        spanID: startSpan.spanId,
        flags: 1,
        operationName: opName,
        startTime: startTime,
        duration: endTime - startTime,
        tags: tags,
        logs: [],
        references: references,
        processID: procId,
    });
};

const filename = process.argv[2];
const contents = fs.readFileSync(filename, 'utf-8');
let startTimestamp = 0;
contents.split(/\r?\n/).forEach(line =>  {
    const segments = line.split(" ");
    // SPAN START id desc
    // SPAN END id desc
    if (segments[0] !== "SPAN") {
        return;
    }
    const timestamp = segments[2];
    if (startTimestamp === 0) {
        startTimestamp = timestamp;
    }
    const spanName = segments[3];
    const keysJson = JSON.parse(segments.slice(4).join(" "));
    const entries = spanIdToEntries[spanName] || [];
    switch (segments[1]) {
        case "START": {
            const spanId = generateSpanId();
            const span = {spanName, timestamp, keysJson, spanId};
            entries.push(span);
            spanIdToEntries[spanName] = entries;
            openSpans[spanId] = span;
            break;
        }
        case "END": {
            const startSpan = entries.pop();
            if (!startSpan) {
                console.error("got SPAN END without matching SPAN START; ignoring. " + line);
                return;
            }
            const spanId = startSpan.spanId;
            addSpan(startSpan, {spanName, timestamp, keysJson});
            delete openSpans[spanId];
            break;
        }
        default:
            console.error("unknown span: " + line);
    }
});

console.log(JSON.stringify({
    data: [outputJson]
}, undefined, 2));
