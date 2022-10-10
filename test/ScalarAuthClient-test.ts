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

import { mocked } from "jest-mock";
import fetchMock from "fetch-mock-jest";

import ScalarAuthClient from '../src/ScalarAuthClient';
import { stubClient } from './test-utils';
import SdkConfig from "../src/SdkConfig";

describe('ScalarAuthClient', function() {
    const apiUrl = 'https://test.com/api';
    const uiUrl = 'https:/test.com/app';
    const tokenObject = {
        access_token: "token",
        token_type: "Bearer",
        matrix_server_name: "localhost",
        expires_in: 999,
    };

    let client;
    beforeEach(function() {
        window.localStorage.setItem("mx_scalar_token", "brokentoken");
        client = stubClient();
    });

    it('should request a new token if the old one fails', async function() {
        const sac = new ScalarAuthClient(apiUrl, uiUrl);

        fetchMock.get("https://test.com/api/account?scalar_token=brokentoken&v=1.1", {
            body: { message: "Invalid token" },
        });

        fetchMock.get("https://test.com/api/account?scalar_token=wokentoken&v=1.1", {
            body: { user_id: client.getUserId() },
        });

        client.getOpenIdToken = jest.fn().mockResolvedValue(tokenObject);

        sac.exchangeForScalarToken = jest.fn((arg) => {
            if (arg === tokenObject) return Promise.resolve("wokentoken");
        });

        await sac.connect();

        expect(sac.exchangeForScalarToken).toBeCalledWith(tokenObject);
        expect(sac.hasCredentials).toBeTruthy();
        // @ts-ignore private property
        expect(sac.scalarToken).toEqual('wokentoken');
    });

    describe("exchangeForScalarToken", () => {
        it("should return `scalar_token` from API /register", async () => {
            const sac = new ScalarAuthClient(apiUrl, uiUrl);

            fetchMock.post("https://test.com/api/register?v=1.1", {
                body: { scalar_token: "stoken" },
            });

            await expect(sac.exchangeForScalarToken(tokenObject)).resolves.toBe("stoken");
        });

        it("should throw upon non-20x code", async () => {
            const sac = new ScalarAuthClient(apiUrl, uiUrl);

            fetchMock.post("https://test.com/api/register?v=1.1", {
                status: 500,
            });

            await expect(sac.exchangeForScalarToken(tokenObject)).rejects.toThrow("Scalar request failed: 500");
        });

        it("should throw if scalar_token is missing in response", async () => {
            const sac = new ScalarAuthClient(apiUrl, uiUrl);

            fetchMock.post("https://test.com/api/register?v=1.1", {
                body: {},
            });

            await expect(sac.exchangeForScalarToken(tokenObject)).rejects.toThrow("Missing scalar_token in response");
        });
    });

    describe("registerForToken", () => {
        it("should call `termsInteractionCallback` upon M_TERMS_NOT_SIGNED error", async () => {
            const sac = new ScalarAuthClient(apiUrl, uiUrl);
            const termsInteractionCallback = jest.fn();
            sac.setTermsInteractionCallback(termsInteractionCallback);
            fetchMock.get("https://test.com/api/account?scalar_token=testtoken&v=1.1", {
                body: { errcode: "M_TERMS_NOT_SIGNED" },
            });
            sac.exchangeForScalarToken = jest.fn(() => Promise.resolve("testtoken"));
            mocked(client.getTerms).mockResolvedValue({ policies: [] });

            await expect(sac.registerForToken()).resolves.toBe("testtoken");
        });

        it("should throw upon non-20x code", async () => {
            const sac = new ScalarAuthClient(apiUrl, uiUrl);
            fetchMock.get("https://test.com/api/account?scalar_token=testtoken&v=1.1", {
                body: { errcode: "SERVER_IS_SAD" },
                status: 500,
            });
            sac.exchangeForScalarToken = jest.fn(() => Promise.resolve("testtoken"));

            await expect(sac.registerForToken()).rejects.toBeTruthy();
        });

        it("should throw if user_id is missing from response", async () => {
            const sac = new ScalarAuthClient(apiUrl, uiUrl);
            fetchMock.get("https://test.com/api/account?scalar_token=testtoken&v=1.1", {
                body: {},
            });
            sac.exchangeForScalarToken = jest.fn(() => Promise.resolve("testtoken"));

            await expect(sac.registerForToken()).rejects.toThrow("Missing user_id in response");
        });
    });

    describe("getScalarPageTitle", () => {
        let sac: ScalarAuthClient;

        beforeEach(async () => {
            window.localStorage.setItem("mx_scalar_token", "wokentoken");
            SdkConfig.put({
                integrations_rest_url: apiUrl,
                integrations_ui_url: uiUrl,
            });

            fetchMock.get("https://test.com/api/account?scalar_token=wokentoken&v=1.1", {
                body: { user_id: client.getUserId() },
            });

            sac = new ScalarAuthClient(apiUrl, uiUrl);
            await sac.connect();
        });

        it("should return `cached_title` from API /widgets/title_lookup", async () => {
            const url = "google.com";
            fetchMock.get("https://test.com/api/widgets/title_lookup?scalar_token=wokentoken&curl=" + url, {
                body: {
                    page_title_cache_item: {
                        cached_title: "Google",
                    },
                },
            });

            await expect(sac.getScalarPageTitle(url)).resolves.toBe("Google");
        });

        it("should throw upon non-20x code", async () => {
            const url = "google.com";
            fetchMock.get("https://test.com/api/widgets/title_lookup?scalar_token=wokentoken&curl=" + url, {
                status: 500,
            });

            await expect(sac.getScalarPageTitle(url)).rejects.toThrow("Scalar request failed: 500");
        });
    });
});
