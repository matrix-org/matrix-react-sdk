/*
Copyright 2024 The Matrix.org Foundation C.I.C.

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

import {MatrixClientPeg} from "../MatrixClientPeg";

export async function canAddAuthToMediaUrl(url: string): Promise<boolean> {
    return url.includes("/_matrix/media/v3") && Boolean(await MatrixClientPeg.get()?.doesServerSupportUnstableFeature("org.matrix.msc3916"));
}

export async function getMediaByUrl(url: string): Promise<Response> {
    // If the server doesn't support unstable auth, don't use it :)
    if (!(await canAddAuthToMediaUrl(url))) {
        return fetch(url);
    }

    // We can rewrite the URL to support auth now, and request accordingly.
    url = url.replace(/\/media\/v3\/(.*)\//, "/client/unstable/org.matrix.msc3916/media/$1/");
    return fetch(url, {
        headers: {
            'Authorization': `Bearer ${MatrixClientPeg.get()?.getAccessToken()}`,
        },
    });
}
