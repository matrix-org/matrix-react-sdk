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
import ToastStore, {Priority} from "../../../stores/ToastStore";
import GenericToast from "./GenericToast";
import {messageForResourceLimitError} from "../../../utils/ErrorUtils";

const TOAST_KEY = "server-limit";

export const showToast = (limitType: string, adminContact?: string, error?: boolean) => {
    let errorText;
    if (error) {
        errorText = messageForResourceLimitError(limitType, adminContact, {
            'monthly_active_user': _td("Your homeserver has hit its user limit."),
            '': _td("Your homeserver has exceeded one of its resource limits."),
        });
    } else {
        errorText = messageForResourceLimitError(limitType, adminContact, {
            'monthly_active_user': _td(
                "This homeserver has hit its user limit so <b>some users will not be able to log in</b>.",
            ),
            '': _td(
                "This homeserver has exceeded one of its resource limits so " +
                "<b>some users will not be able to log in</b>.",
            ),
        },
        {'b': sub => <b>{sub}</b>});
    }

    const contactText = messageForResourceLimitError(limitType, adminContact, {
        '': _td("Please <a>contact your service administrator</a> to continue using the service."),
    });

    ToastStore.sharedInstance().addOrReplaceToast({
        key: TOAST_KEY,
        title: _t("Warning"),
        priority: Priority.LOW,
        component: GenericToast,
        props: {
            description: <React.Fragment>{errorText} {contactText}</React.Fragment>,
            acceptLabel: _t("Ok"),
            onAccept: hideToast,
        },
    });
};

export const hideToast = () => {
    ToastStore.sharedInstance().dismissToast(TOAST_KEY);
};
