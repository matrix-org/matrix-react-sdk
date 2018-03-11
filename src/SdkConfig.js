/*
Copyright (C) 2018 Kamax Sàrl
https://www.kamax.io/

This program is free software: you can redistribute it and/or modify
it under the terms of the GNU Affero General Public License as published by
the Free Software Foundation, either version 3 of the License, or
(at your option) any later version.

This program is distributed in the hope that it will be useful,
but WITHOUT ANY WARRANTY; without even the implied warranty of
MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
GNU Affero General Public License for more details.

This file incorporates work covered by the following copyright and
permission notice:

    Copyright 2015, 2016 OpenMarket Ltd

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

const DEFAULTS = {
    // URL to a page we show in an iframe to configure integrations
    integrations_ui_url: "https://scalar.vector.im/",
    // Base URL to the REST interface of the integrations server
    integrations_rest_url: "https://scalar.vector.im/api",
    // Where to send bug reports. If not specified, bugs cannot be sent.
    bug_report_endpoint_url: null,
    google_client_id: null,
};

class SdkConfig {

    static get() {
        return global.mxReactSdkConfig;
    }

    static put(cfg) {
        const defaultKeys = Object.keys(DEFAULTS);
        for (let i = 0; i < defaultKeys.length; ++i) {
            if (cfg[defaultKeys[i]] === undefined) {
                cfg[defaultKeys[i]] = DEFAULTS[defaultKeys[i]];
            }
        }
        global.mxReactSdkConfig = cfg;
    }

    static unset() {
        global.mxReactSdkConfig = undefined;
    }
}

module.exports = SdkConfig;
