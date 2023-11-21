/*
Copyright 2023 The Matrix.org Foundation C.I.C.

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

import { type Page, type APIRequestContext } from "@playwright/test";
import crypto from "crypto";

import { HomeserverInstance, Credentials } from "../plugins/utils/homeserver";

export class ElementAppPage {
    constructor(private readonly page: Page, private readonly request: APIRequestContext) {}

    /**
     * Register a user on the given Homeserver using the shared registration secret.
     * @param homeserver the homeserver instance returned by start{Homeserver}
     * @param username the username of the user to register
     * @param password the password of the user to register
     * @param displayName optional display name to set on the newly registered user
     */
    public async registerUser(
        homeserver: HomeserverInstance,
        username: string,
        password: string,
        displayName?: string,
    ): Promise<Credentials> {
        const url = `${homeserver.baseUrl}/_synapse/admin/v1/register`;
        const { nonce } = await this.request.get(url).then((r) => r.json());
        const mac = crypto
            .createHmac("sha1", homeserver.registrationSecret)
            .update(`${nonce}\0${username}\0${password}\0notadmin`)
            .digest("hex");
        const res = await this.request.post(url, {
            data: {
                nonce,
                username,
                password,
                mac,
                admin: false,
                displayname: displayName,
            },
        });

        const data = await res.json();
        return {
            homeServer: data.home_server,
            accessToken: data.access_token,
            userId: data.user_id,
            deviceId: data.device_id,
            password,
        };
    }
}
