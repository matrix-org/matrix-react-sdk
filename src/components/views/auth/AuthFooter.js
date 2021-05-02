/*
Copyright 2015, 2016 OpenMarket Ltd
Copyright 2019 New Vector Ltd
Copyright 2019 The Matrix.org Foundation C.I.C.

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

import { _t } from '../../../languageHandler';
import React from 'react';
import {replaceableComponent} from "../../../utils/replaceableComponent";

@replaceableComponent("views.auth.AuthFooter")
export default class AuthFooter extends React.Component {
    render() {
        return (
            <div className="mx_AuthFooter">
                <a href="https://matrix.org" target="_blank" rel="noreferrer noopener">{ _t("powered by Matrix") }</a>
            </div>
        );
    }
}
