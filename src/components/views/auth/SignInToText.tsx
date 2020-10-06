/*
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

import React from 'react';
import {_t} from "../../../languageHandler";
import * as sdk from "../../../index";
import PropTypes from "prop-types";
import {ValidatedServerConfig} from "../../../utils/AutoDiscoveryUtils";

interface IProps {
    serverConfig: ValidatedServerConfig;
    onEditServerDetailsClick?: (event: React.MouseEvent<HTMLAnchorElement, MouseEvent>) => void;

}

export function SignInText (props: IProps) {
    let signInToText: string | React.ReactNode = _t('Sign in to your Matrix account on %(serverName)s', {
        serverName: props.serverConfig.hsName,
    });

    if (props.serverConfig.hsNameIsDifferent) {
        const TextWithTooltip = sdk.getComponent("elements.TextWithTooltip");

        signInToText = _t('Sign in to your Matrix account on <underlinedServerName />', {}, {
            'underlinedServerName': () => (
                <TextWithTooltip
                    class="mx_Login_underlinedServerName"
                    tooltip={props.serverConfig.hsUrl}
                >
                    {props.serverConfig.hsName}
                </TextWithTooltip>
            )
        });
    }

    const editLink = props.onEditServerDetailsClick ? (
        <a 
            className="mx_AuthBody_editServerDetails"
            href="#" onClick={props.onEditServerDetailsClick}
        >
            {_t('Change')}
        </a>
    ) : null;

    return (
        <h3>
            {signInToText}
            {editLink}
        </h3>
    );
}

SignInText.propTypes = {
    serverConfig: PropTypes.instanceOf(ValidatedServerConfig).isRequired,
    onEditServerDetailsClick: PropTypes.func,
};
