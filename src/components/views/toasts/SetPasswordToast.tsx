/*
Copyright 2020 The Matrix.org Foundation C.I.C.

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

import {_t, _td} from "../../../languageHandler";
import FormButton from "../elements/FormButton";
import ToastStore, {IToast, Priority} from "../../../stores/ToastStore";
import Modal from "../../../Modal";
import SetPasswordDialog from "../dialogs/SetPasswordDialog";

const setPassword = () => {
    Modal.createTrackedDialog('Set Password Dialog', 'Password Nag Bar', SetPasswordDialog);
};

const hideToast = () => {
    ToastStore.sharedInstance().dismissToast(TOAST_KEY);
};

const TOAST_KEY = "set-password";

const SetPasswordToast: React.FC = () => {
    return <div>
        <div className="mx_Toast_description">
            {_t("To return to your account in future you need to set a password")}
        </div>
        <div className="mx_Toast_buttons" aria-live="off">
            <FormButton label={_t("Later")} kind="danger" onClick={hideToast} />
            <FormButton label={_t("Set Password")} onClick={setPassword} />
        </div>
    </div>;
};

export default SetPasswordToast;

export const TOAST: IToast = {
    key: TOAST_KEY,
    component: SetPasswordToast,
    title: _td("Set password"),
    priority: Priority.LOW,
};
