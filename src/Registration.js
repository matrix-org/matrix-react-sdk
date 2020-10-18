/*
Copyright 2018 New Vector Ltd

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

/**
 * Utility code for registering with a homeserver
 * Note that this is currently *not* used by the actual
 * registration code.
 */

import dis from './dispatcher/dispatcher';
import * as sdk from './index';
import Modal from './Modal';
import { _t } from './languageHandler';

// Regex for what a "safe" or "Matrix-looking" localpart would be.
// TODO: Update as needed for https://github.com/matrix-org/matrix-doc/issues/1514
export const SAFE_LOCALPART_REGEX = /^[a-z0-9=_\-./]+$/;

/**
 * Starts either the ILAG or full registration flow, depending
 * on what the HS supports
 *
 * @param {object} options
 * @param {bool} options.go_home_on_cancel
 *     If true, goes to the home page if the user cancels the action
 * @param {bool} options.go_welcome_on_cancel
 *     If true, goes to the welcome page if the user cancels the action
 * @param {bool} options.screen_after
 *     If present the screen to redirect to after a successful login or register.
 */
export async function startAnyRegistrationFlow(options) {
    if (options === undefined) options = {};
    const QuestionDialog = sdk.getComponent("dialogs.QuestionDialog");
    const modal = Modal.createTrackedDialog('Registration required', '', QuestionDialog, {
        hasCancelButton: true,
        quitOnly: true,
        title: _t("Sign In or Create Account"),
        description: _t("Use your account or create a new one to continue."),
        button: _t("Create Account"),
        extraButtons: [
            <button key="start_login" onClick={() => {
                modal.close();
                dis.dispatch({action: 'start_login', screenAfterLogin: options.screen_after});
            }}>{ _t('Sign In') }</button>,
        ],
        onFinished: (proceed) => {
            if (proceed) {
                dis.dispatch({action: 'start_registration', screenAfterLogin: options.screen_after});
            } else if (options.go_home_on_cancel) {
                dis.dispatch({action: 'view_home_page'});
            } else if (options.go_welcome_on_cancel) {
                dis.dispatch({action: 'view_welcome_page'});
            }
        },
    });
}
