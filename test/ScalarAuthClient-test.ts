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

import fetchMock from "fetch-mock-jest";
import { MatrixError } from "matrix-js-sdk/src/matrix";

import ScalarAuthClient from '../src/ScalarAuthClient';
import { MatrixClientPeg } from '../src/MatrixClientPeg';
import { stubClient } from './test-utils';

describe('ScalarAuthClient', function() {
    const apiUrl = 'https://test.com/api';
    const uiUrl = 'https:/test.com/app';
    const tokenObject = {
        access_token: "token",
        token_type: "Bearer",
        matrix_server_name: "localhost",
        expires_in: 999,
    };

    beforeEach(function() {
        window.localStorage.getItem = jest.fn((arg) => {
            if (arg === "mx_scalar_token") return "brokentoken";
        });
        stubClient();
    });

    it('should request a new token if the old one fails', async function() {
        const sac = new ScalarAuthClient(apiUrl, uiUrl);

        fetchMock.get("https://test.com/api/account?scalar_token=brokentoken&v=1.1", {
            throws: new MatrixError({ message: "Invalid token" }),
        });

        fetchMock.get("https://test.com/api/account?scalar_token=wokentoken&v=1.1", {
            body: { user_id: MatrixClientPeg.get().getUserId() },
        });

        MatrixClientPeg.get().getOpenIdToken = jest.fn().mockResolvedValue(tokenObject);

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
    });
});
