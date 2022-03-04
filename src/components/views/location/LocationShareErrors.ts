import { _t } from "../../../languageHandler";

export enum LocationShareError {
    MapStyleUrlNotConfigured = 'MapStyleUrlNotConfigured',
    MapStyleUrlNotReachable = 'MapStyleUrlNotReachable',
    Default = 'Default'
}

export const getLocationShareErrorMessage = (errorType?: LocationShareError): string => {
    switch (errorType) {
        case LocationShareError.MapStyleUrlNotConfigured:
            return _t('Unable to load map: This homeserver is not configured to display maps.');
        case LocationShareError.MapStyleUrlNotReachable:
        default:
            return _t(`Unable to load map: This homeserver is not configured correctly to display maps, `
                + `or the configured map server may be unreachable.`);
    }
};
