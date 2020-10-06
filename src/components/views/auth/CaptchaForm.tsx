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
import PropTypes, { any } from 'prop-types';
import { _t } from '../../../languageHandler';
import 'grecaptcha';

const DIV_ID = 'mx_recaptcha';

declare global {
    export const recaptcha: any;
}

interface IProps {
    sitePublicKey: string;
    onCaptchaResponse: OnCaptchaResponseListener;
}

export type OnCaptchaResponseListener = (response: string) => void; 

function onCaptchaNotLoaded () {
    console.error("grecaptcha not loaded!");
    throw new Error("Recaptcha did not load successfully");
}

function onNoPublicKey () {
    console.error("No public key for recaptcha!");
    throw new Error(
        "This server has not supplied enough information for Recaptcha "
            + "authentication");
}

/** A UI component which renders a reCAPTCHA form. */
export default function CaptchaForm (props: IProps) {
    const onCaptchaResponse = props.onCaptchaResponse ?? (() => {});

    // If the CAPTCHA failed to load, this ref will contain the error message.
    const [errorText, setErrorText] = React.useState<string | void>();

    // This is a reference to the rendered reCAPTCHA container.
    // As such, it will never be in a `void` state.
    const captchaContainer = React.useRef<HTMLDivElement>();
    const captchaWidgetID = React.useRef<number | void>();

    function renderCaptcha (idOfCaptcha: string) {
        if (!global.grecaptcha) {
            onCaptchaNotLoaded();
        }

        const publicKey = props.sitePublicKey;
        if (!publicKey) {
            onNoPublicKey();
        }

        console.info("Rendering to %s", idOfCaptcha);
        captchaWidgetID.current = global.grecaptcha.render(idOfCaptcha, {
            sitekey: publicKey,
            callback: onCaptchaResponse,
        });
    }

    function onCaptchaLoaded () {
        console.log("Loaded recaptcha script.");
        try {
            renderCaptcha(DIV_ID);
        } catch (e) {
            // We use a `String` here just to be safe.
            // The error may not have a `.toString`.
            setErrorText(String(e));
        }
    }

    /** Reset the reCAPTCHA form. */
    function resetCaptcha () {
        if (captchaWidgetID.current != null) {
            global.grecaptcha.reset(captchaWidgetID.current as number);
        }
    }

    React.useEffect(() => {
        if (global.grecaptcha) {
            // The CAPTCHA has already loaded!
            onCaptchaLoaded();
        } else {
            // The CAPTCHA script hasn't been loaded. Time to import it into the document.
            console.log("Loading recaptcha script...");

            // Set a callback that will run when the reCAPTCHA script is loaded.
            window.mx_on_recaptcha_loaded = () => { onCaptchaLoaded(); };

            const scriptTag = document.createElement('script');
            scriptTag.src = 'https://www.recaptcha.net/recaptcha/api.js?onload=mx_on_recaptcha_loaded&render=explicit';
            captchaContainer.current.appendChild(scriptTag);
        }

        return () => resetCaptcha();
    }, []);

    return (
        <div ref={captchaContainer}>
            <p>{_t(
                "This homeserver would like to make sure you are not a robot.",
            )}</p>
            <div id={DIV_ID} />
            { errorText && (
                <div className="error">
                    { errorText }
                </div>
            ) }
        </div>
    );
}

CaptchaForm.propTypes = {
    sitePublicKey: PropTypes.string,
    onCaptchaResponse: PropTypes.func
};
