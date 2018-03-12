/*
Copyright (C) 2018 Kamax Sàrl
https://www.kamax.io/

This program is free software: you can redistribute it and/or modify
it under the terms of the GNU Affero General Public License as published by
the Free Software Foundation, either version 3 of the License, or
(at your option) any later version.

This program is distributed in the hope that it will be useful,
but WITHOUT ANY WARRANTY; without even the implied warranty of
MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
GNU Affero General Public License for more details.
*/


'use strict';

import React from 'react';
import { GoogleLogin } from 'react-google-login';
import { _t } from '../../../languageHandler';
import SdkConfig from '../../../SdkConfig';


export default class GoogleAuthLogin extends React.Component {
    static propTypes = {
        onSuccess: React.PropTypes.func,
        onFailure: React.PropTypes.func,
    }

    state = {
        hasLoggedIn: false,
        profile: null
    }

    gSuccess(response) {
        const profile = response.getBasicProfile();
        this.props.onSuccess(profile.getId(), response.getAuthResponse().id_token, profile);
        this.setState({hasLoggedIn: true, profile});
    }

    gFailure(error, details) {
        this.props.onFailure(`Failure with google! ${error}: ${details}`);
    }

    render() {
        return (
            <GoogleLogin
                clientId={SdkConfig.get().google_client_id}//""
                buttonText="Login with Google"
                onSuccess={this.gSuccess.bind(this)}
                onFailure={this.gFailure.bind(this)}
            />
        );
    }
}
