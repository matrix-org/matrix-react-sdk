import { logger } from "matrix-js-sdk/src/logger";

import SdkConfig from "../../../SdkConfig";
import { getTileServerWellKnown } from "../../../utils/WellKnownUtils";
import { LocationShareError } from "./LocationShareErrors";

/**
 * Look up what map tile server style URL was provided in the homeserver's
 * .well-known location, or, failing that, in our local config, or, failing
 * that, defaults to the same tile server listed by matrix.org.
 */
export function findMapStyleUrl(): string {
    const mapStyleUrl = (
        getTileServerWellKnown()?.map_style_url ??
        SdkConfig.get().map_style_url
    );

    if (!mapStyleUrl) {
        logger.error("'map_style_url' missing from homeserver .well-known area, and " +
            "missing from from config.json.");
        throw new Error(LocationShareError.MapStyleUrlNotConfigured);
    }

    return mapStyleUrl;
}
