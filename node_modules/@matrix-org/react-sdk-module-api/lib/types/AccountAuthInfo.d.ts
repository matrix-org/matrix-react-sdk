/**
 * Matrix account authentication information for a known user.
 */
export interface AccountAuthInfo {
    /**
     * The user ID.
     */
    userId: string;
    /**
     * The device ID.
     */
    deviceId: string;
    /**
     * The access token belonging to this device ID and user ID.
     */
    accessToken: string;
    /**
     * The homeserver URL where the credentials are valid.
     */
    homeserverUrl: string;
}
