import { HTTPRequest } from "puppeteer";
import { strict as assert } from 'assert';

import { ElementSession } from "../session";

async function mockVersionHTTPResponse(session: ElementSession) {
    // Mock the HTTP response to return a new version to trigger auto-update behaviour
    await session.page.setRequestInterception(true);
    session.page.on('request', (request: HTTPRequest) => {
        const url = new URL(request.url());
        if (url.pathname === "/version") {
            request.respond({
                contentType: "text/html",
                status: 200,
                body: "some-new-version",
            });
        } else {
            request.continue();
        }
    });
}

export async function updateScenarios(session: ElementSession) {
    // Mock the HTTP response to return a newer version, then wait for the page to reload in response
    await mockVersionHTTPResponse(session);
    await session.goto(session.url('/'));
    await session.waitForReload();
    const newUrl = new URL(session.page.url());
    assert.equal(newUrl.searchParams.get("updated"), "1");
}
