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

import { ReactNode } from "react";
import { MatrixError } from "matrix-js-sdk/src/http-api";
import { OidcError } from "matrix-js-sdk/src/oidc/error";

import { _t } from "../../languageHandler";

export enum OidcClientError {
    StoredParamsNotFound = "Cannot complete OIDC login: required properties not found in session storage.",
    InvalidQueryParameters = "Invalid query parameters for OIDC native login. `code` and `state` are required.",
}

export const getErrorMessage = (error: Error | MatrixError): string | ReactNode => {
    switch (error.message) {
        case OidcClientError.StoredParamsNotFound:
            return _t(
                "We asked the browser to remember which homeserver you use to let you sign in, " +
                    "but unfortunately your browser has forgotten it. Go to the sign in page and try again.",
            );
        case OidcClientError.InvalidQueryParameters:
        case OidcError.CodeExchangeFailed:
        case OidcError.InvalidBearerTokenResponse:
        case OidcError.InvalidIdToken:
        default:
            return _t("Something went wrong during authentication. Go to the sign in page and try again.");
    }
};
