/*
Copyright 2022 The Matrix.org Foundation C.I.C.

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

import { MatrixEvent } from "matrix-js-sdk/src/matrix";
import { M_LOCATION } from "matrix-js-sdk/src/@types/location";
import { makeLocationContent } from "matrix-js-sdk/src/content-helpers";

import { locationEventGeoUri } from "../../../src/utils/location";

describe('locationEventGeoUri()', () => {
    const legacyLocationEvent = new MatrixEvent(
        {
            "event_id": '1',
            "type": M_LOCATION.name,
            "content": {
                "body": "Something about where I am",
                "msgtype": "m.location",
                "geo_uri": "geo:51.5076,-0.1276",
            },
        },
    );

    const modernLocationEvent = new MatrixEvent(
        {
            "event_id": '2',
            "type": M_LOCATION.name,
            "content": makeLocationContent(
                `Found at geo:51.5076,-0.1276 at 2021-12-21T12:22+0000`,
                "geo:51.5076,-0.1276",
                252523,
            ),
        },
    );

    it('returns m.location uri when available', () => {
        expect(locationEventGeoUri(modernLocationEvent)).toEqual("geo:51.5076,-0.1276");
    });

    it('returns legacy uri when m.location content not found', () => {
        expect(locationEventGeoUri(legacyLocationEvent)).toEqual("geo:51.5076,-0.1276");
    });
});
