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

import React from "react";

import SplashPage from "../SplashPage";
import { _t } from "../../../languageHandler";
import SdkConfig from "../../../SdkConfig";

/**
 * Component shown by {@link MatrixChat} when another session is started in the same browser.
 */
export function SessionLockStolenView(): JSX.Element {
    const brand = SdkConfig.get().brand;

    return (
        <SplashPage className="mx_SessionLockStolenView">
            <h1>{_t("error_app_open_in_another_tab_title", { brand })}</h1>
            <h2>{_t("error_app_open_in_another_tab", { brand })}</h2>
        </SplashPage>
    );
}
