/*
 *
 * Copyright 2019 Michael Telatynski <7t3chguy@gmail.com>
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 * /
 */

import {_t} from "../languageHandler";
import Notifier from "../Notifier";
import ToastStore, {Priority} from "../stores/ToastStore";
import GenericToast from "../components/views/toasts/GenericToast";

const onAccept = () => {
    Notifier.setEnabled(true);
};

const onReject = () => {
    Notifier.setToolbarHidden(true);
};

const TOAST_KEY = "desktop-notifications";

export const showToast = () => {
    ToastStore.sharedInstance().addOrReplaceToast({
        key: TOAST_KEY,
        title: _t("Notifications"),
        priority: Priority.LOW,
        component: GenericToast,
        props: {
            description: _t("You are not receiving desktop notifications"),
            acceptLabel: _t("Enable them now"),
            onAccept,
            rejectLabel: _t("Close"),
            onReject,
        },
    });
};

export const hideToast = () => {
    ToastStore.sharedInstance().dismissToast(TOAST_KEY);
};
