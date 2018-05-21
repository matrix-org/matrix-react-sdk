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

'use strict';

import React from 'react';
import ReactDOM from 'react-dom';
import PropTypes from 'prop-types';
import { _t } from '../../../languageHandler';

const DIV_ID = 'mx_recaptcha';

/**
 * A pure UI component which displays a captcha form.
 */
export default class CaptchaForm extends React.PureComponent {
    static propTypes = {
        sitePublicKey: PropTypes.string,

        // called with the captcha response
        onCaptchaResponse: PropTypes.func,
    };

    static defaultProps = {
        onCaptchaResponse: () => {},
    };

    state = {
        errorText: null,
    };

    componentWillMount() {
        this._captchaWidgetId = null;
    }

    componentDidMount() {
        // Just putting a script tag into the returned jsx doesn't work, annoyingly,
        // so we do this instead.
        if (global.grecaptcha) {
            // already loaded
            this._onCaptchaLoaded();
        } else {
            console.log("Loading recaptcha script...");
            window.mx_on_recaptcha_loaded = () => {this._onCaptchaLoaded();};
            const protocol = global.location.protocol;
            if (protocol === "file:") {
                const warning = document.createElement('div');
                // XXX: fix hardcoded app URL.  Better solutions include:
                // * jumping straight to a hosted captcha page (but we don't support that yet)
                // * embedding the captcha in an iframe (if that works)
                // * using a better captcha lib
                ReactDOM.render(_t(
                    "Robot check is currently unavailable on desktop - please use a <a>web browser</a>",
                    {},
                    { 'a': (sub) => { return <a href='https://riot.im/app'>{ sub }</a>; }}), warning);
                this.refs.recaptchaContainer.appendChild(warning);
            } else {
                const scriptTag = document.createElement('script');
                scriptTag.setAttribute(
                    'src', protocol+"//www.google.com/recaptcha/api.js?onload=mx_on_recaptcha_loaded&render=explicit",
                );
                this.refs.recaptchaContainer.appendChild(scriptTag);
            }
        }
    }

    componentWillUnmount() {
        this._resetRecaptcha();
    }

    /// @param {string} divId The ID of the DIV element where Recaptcha will be rendered.
    _renderRecaptcha = (divId) => {
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

        console.log("Rendering to %s", divId);
        this._captchaWidgetId = global.grecaptcha.render(divId, {
            sitekey: publicKey,
            callback: this.props.onCaptchaResponse,
        });
    };

    _resetRecaptcha = () => {
        if (this._captchaWidgetId !== null) {
            global.grecaptcha.reset(this._captchaWidgetId);
        }
    };

    _onCaptchaLoaded = () => {
        console.log("Loaded recaptcha script.");
        try {
            this._renderRecaptcha(DIV_ID);
        } catch (e) {
            this.setState({
                errorText: e.toString(),
            });
        }
    };

    render() {
        let error = null;
        if (this.state.errorText) {
            error = (
                <div className="error">
                    { this.state.errorText }
                </div>
            );
        }

        return (
            <div ref="recaptchaContainer">
                { _t("This Home Server would like to make sure you are not a robot") }
                <br />
                <div id={DIV_ID}></div>
                { error }
            </div>
        );
    }
}
