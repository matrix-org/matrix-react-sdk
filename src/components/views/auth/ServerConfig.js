/*
Copyright 2015, 2016 OpenMarket Ltd
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
import PropTypes from 'prop-types';
import Modal from '../../../Modal';
import sdk from '../../../index';
import { _t } from '../../../languageHandler';
import {ValidatedServerConfig} from "../../../utils/AutoDiscoveryUtils";
import AutoDiscoveryUtils from "../../../utils/AutoDiscoveryUtils";
import SdkConfig from "../../../SdkConfig";

/*
 * A pure UI component which displays the HS and IS to use.
 */

export default class ServerConfig extends React.PureComponent {
    static propTypes = {
        onServerConfigChange: PropTypes.func,

        // The current configuration that the user is expecting to change.
        serverConfig: PropTypes.instanceOf(ValidatedServerConfig).isRequired,

        delayTimeMs: PropTypes.number, // time to wait before invoking onChanged
    };

    static defaultProps = {
        onServerConfigChange: function() {},
        delayTimeMs: 0,
    };

    constructor(props) {
        super(props);

        this.state = {
            busy: false,
            errorText: "",
            hsUrl: props.serverConfig.hsUrl,
            isUrl: props.serverConfig.isUrl,
        };
    }

    componentWillReceiveProps(newProps) {
        if (newProps.serverConfig.hsUrl === this.state.hsUrl &&
            newProps.serverConfig.isUrl === this.state.isUrl) return;

        this.validateAndApplyServer(newProps.serverConfig.hsUrl, newProps.serverConfig.isUrl);
    }

    async validateServer() {
        return this.validateAndApplyServer(this.state.hsUrl, this.state.isUrl);
    }

    async validateAndApplyServer(hsUrl, isUrl) {
        // Always try and use the defaults first
        const defaultConfig: ValidatedServerConfig = SdkConfig.get()["validated_server_config"];
        if (defaultConfig.hsUrl === hsUrl && defaultConfig.isUrl === isUrl) {
            this.setState({busy: false, errorText: ""});
            this.props.onServerConfigChange(defaultConfig);
            return defaultConfig;
        }

        this.setState({
            hsUrl,
            isUrl,
            busy: true,
            errorText: "",
        });

        try {
            const result = await AutoDiscoveryUtils.validateServerConfigWithStaticUrls(hsUrl, isUrl);
            this.setState({busy: false, errorText: ""});
            this.props.onServerConfigChange(result);
            return result;
        } catch (e) {
            console.error(e);
            let message = _t("Unable to validate homeserver/identity server");
            if (e.translatedMessage) {
                message = e.translatedMessage;
            }
            this.setState({
                busy: false,
                errorText: message,
            });
        }
    }

    onHomeserverBlur = (ev) => {
        this._hsTimeoutId = this._waitThenInvoke(this._hsTimeoutId, () => {
            this.validateServer();
        });
    };

    onHomeserverChange = (ev) => {
        const hsUrl = ev.target.value;
        this.setState({ hsUrl });
    };

    onIdentityServerBlur = (ev) => {
        this._isTimeoutId = this._waitThenInvoke(this._isTimeoutId, () => {
            this.validateServer();
        });
    };

    onIdentityServerChange = (ev) => {
        const isUrl = ev.target.value;
        this.setState({ isUrl });
    };

    _waitThenInvoke(existingTimeoutId, fn) {
        if (existingTimeoutId) {
            clearTimeout(existingTimeoutId);
        }
        return setTimeout(fn.bind(this), this.props.delayTimeMs);
    }

    showHelpPopup = () => {
        const CustomServerDialog = sdk.getComponent('auth.CustomServerDialog');
        Modal.createTrackedDialog('Custom Server Dialog', '', CustomServerDialog);
    };

    render() {
        const Field = sdk.getComponent('elements.Field');

        const errorText = this.state.errorText
            ? <span className='mx_ServerConfig_error'>{this.state.errorText}</span>
            : null;

        return (
            <div className="mx_ServerConfig">
                <h3>{_t("Other servers")}</h3>
                {_t("Enter custom server URLs <a>What does this mean?</a>", {}, {
                    a: sub => <a className="mx_ServerConfig_help" href="#" onClick={this.showHelpPopup}>
                        { sub }
                    </a>,
                })}
                {errorText}
                <div className="mx_ServerConfig_fields">
                    <Field id="mx_ServerConfig_hsUrl"
                        label={_t("Homeserver URL")}
                        placeholder={this.props.defaultHsUrl}
                        value={this.state.hsUrl}
                        onBlur={this.onHomeserverBlur}
                        onChange={this.onHomeserverChange}
                        disabled={this.state.busy}
                    />
                    <Field id="mx_ServerConfig_isUrl"
                        label={_t("Identity Server URL")}
                        placeholder={this.props.defaultIsUrl}
                        value={this.state.isUrl}
                        onBlur={this.onIdentityServerBlur}
                        onChange={this.onIdentityServerChange}
                        disabled={this.state.busy}
                    />
                </div>
            </div>
        );
    }
}
