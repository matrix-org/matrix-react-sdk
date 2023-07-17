import { MatrixClient } from "matrix-js-sdk/src/client";

class TokenRefresher {
    constructor(
        private refreshToken: string,
        private readonly oidcClientSettings,
    ) {
        
    }

    public async doRefreshAccessToken (setAccessToken: MatrixClient['setAccessToken']) {

        throw new Error("Not implemented");
    }
}

export const createTokenRefresher = (refreshToken: string) => {
    return {
        refreshToken,
        doRefreshAccessToken: async (setAccessToken: MatrixClient['setAccessToken']) => {
            
        }
    }
}