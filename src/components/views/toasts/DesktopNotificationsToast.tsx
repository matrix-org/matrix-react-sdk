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
import Notifier from "../../../Notifier";
import {IToast, Priority} from "../../../stores/ToastStore";

const enableNotifications = () => {
    Notifier.setEnabled(true);
};

const hideToast = () => {
    Notifier.setToolbarHidden(true);
};

const TOAST_KEY = "desktop-notifications";

const DesktopNotificationsToast: React.FC = () => {
    return <div>
        <div className="mx_Toast_description">
            {_t("You are not receiving desktop notifications")}
        </div>
        <div className="mx_Toast_buttons" aria-live="off">
            <FormButton label={_t("Close")} kind="danger" onClick={hideToast} />
            <FormButton label={_t("Enable them now")} onClick={enableNotifications} />
        </div>
    </div>;
};

export default DesktopNotificationsToast;

export const TOAST: IToast = {
    key: TOAST_KEY,
    component: DesktopNotificationsToast,
    title: _td("Notifications"),
    priority: Priority.LOW,
};
