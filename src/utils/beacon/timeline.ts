import { MatrixEvent } from "matrix-js-sdk/src/matrix";
import { M_BEACON_INFO } from "matrix-js-sdk/src/@types/beacon";

/**
 * beacon_info events without live property set to true
 * should be displayed in the timeline
 */
export const shouldDisplayAsBeaconTile = (event: MatrixEvent): boolean => (
    M_BEACON_INFO.matches(event.getType()) &&
    !!event.getContent()?.live
);
