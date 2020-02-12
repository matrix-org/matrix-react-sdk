/*
Copyright 2015, 2016 OpenMarket Ltd

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

import React, {createRef} from 'react';
import createReactClass from 'create-react-class';
import PropTypes from 'prop-types';
import { _t } from '../../../languageHandler';

const DIV_ID = 'mx_recaptcha';

/**
 * A pure UI component which displays a captcha form.
 */
export default createReactClass({
    displayName: 'CaptchaForm',

    propTypes: {
        sitePublicKey: PropTypes.string,

        // called with the captcha response
        onCaptchaResponse: PropTypes.func,
    },

    getDefaultProps: function() {
        return {
            onCaptchaResponse: () => {},
        };
    },

    getInitialState: function() {
        return {
            errorText: null,
        };
    },

    componentWillMount: function() {
        this._captchaWidgetId = null;

        this._recaptchaContainer = createRef();
    },

    componentDidMount: function() {
        // Just putting a script tag into the returned jsx doesn't work, annoyingly,
        // so we do this instead.
        if (global.grecaptcha) {
            // already loaded
            this._onCaptchaLoaded();
        } else {
            console.log("Loading recaptcha script...");
            window.mx_on_recaptcha_loaded = () => {this._onCaptchaLoaded();};
            const scriptTag = document.createElement('script');
            scriptTag.setAttribute(
                'src', `https://www.recaptcha.net/recaptcha/api.js?onload=mx_on_recaptcha_loaded&render=explicit`,
            );
            this._recaptchaContainer.current.appendChild(scriptTag);
        }
    },

    componentWillUnmount: function() {
        this._resetRecaptcha();
    },

    _renderRecaptcha: function(divId) {
        if (!global.grecaptcha) {
            console.error("grecaptcha not loaded!");
            throw new Error("Recaptcha did not load successfully");
        }

        const publicKey = this.props.sitePublicKey;
        if (!publicKey) {
            console.error("No public key for recaptcha!");
            throw new Error(
                "This server has not supplied enough information for Recaptcha "
                    + "authentication");
        }

        console.info("Rendering to %s", divId);
        this._captchaWidgetId = global.grecaptcha.render(divId, {
            sitekey: publicKey,
            callback: this.props.onCaptchaResponse,
        });
    },

    _resetRecaptcha: function() {
        if (this._captchaWidgetId !== null) {
            global.grecaptcha.reset(this._captchaWidgetId);
        }
    },

    _onCaptchaLoaded: function() {
        console.log("Loaded recaptcha script.");
        try {
            this._renderRecaptcha(DIV_ID);
        } catch (e) {
            this.setState({
                errorText: e.toString(),
            });
        }
    },

    render: function() {
        let error = null;
        if (this.state.errorText) {
            error = (
                <div className="error">
                    { this.state.errorText }
                </div>
            );
        }

        return (
            <div ref={this._recaptchaContainer}>
                <p>{_t(
                    "This homeserver would like to make sure you are not a robot.",
                )}</p>
                <div id={DIV_ID} />
                { error }
            </div>
        );
    },
});
