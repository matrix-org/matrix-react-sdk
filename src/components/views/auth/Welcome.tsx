/*
Copyright 2019 New Vector Ltd

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

import React from 'react';
import classNames from "classnames";

import * as sdk from '../../../index';
import SdkConfig from '../../../SdkConfig';
import AuthPage from "./AuthPage";
import {_td} from "../../../languageHandler";
import SettingsStore from "../../../settings/SettingsStore";
import {UIFeature} from "../../../settings/UIFeature";
import AuthFooter from './AuthFooter';

// translatable strings for Welcome pages
_td("Sign in with SSO");

export default function Welcome () {
    const EmbeddedPage = sdk.getComponent('structures.EmbeddedPage');
    const LanguageSelector = sdk.getComponent('auth.LanguageSelector');

    const pagesConfig = SdkConfig.get().embeddedPages;
    let pageUrl = pagesConfig ? pagesConfig.welcomeUrl : 'welcome.html';

    return (
        <AuthPage>
            <div className={classNames("mx_Welcome", {
                mx_WelcomePage_registrationDisabled: !SettingsStore.getValue(UIFeature.Registration),
            })}>
                <EmbeddedPage
                    className="mx_WelcomePage"
                    url={pageUrl}
                    replaceMap={{
                        "$riot:ssoUrl": "#/start_sso",
                        "$riot:casUrl": "#/start_cas",
                    }}
                />
                <LanguageSelector />
            </div>
        </AuthPage>
    );
}
