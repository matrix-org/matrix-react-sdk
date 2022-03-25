import { LocationAssetType, M_LOCATION } from "matrix-js-sdk/src/@types/location";
import { makeLocationContent } from "matrix-js-sdk/src/content-helpers";
import { MatrixEvent } from "matrix-js-sdk/src/matrix";
let id = 1;
export const makeLegacyLocationEvent = (geoUri: string): MatrixEvent => {
    return new MatrixEvent(
        {
            "event_id": `$${++id}`,
            "type": M_LOCATION.name,
            "content": {
                "body": "Something about where I am",
                "msgtype": "m.location",
                "geo_uri": geoUri,
            },
        },
    );
};

export const makeLocationEvent = (geoUri: string, assetType?: LocationAssetType): MatrixEvent => {
    return new MatrixEvent(
        {
            "event_id": `$${++id}`,
            "type": M_LOCATION.name,
            "content": makeLocationContent(
                `Found at ${geoUri} at 2021-12-21T12:22+0000`,
                geoUri,
                252523,
                "Human-readable label",
                assetType,
            ),
        },
    );
};
