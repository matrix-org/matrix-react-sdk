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
import { _t } from "../../../languageHandler";
import AccessibleButton from "../elements/AccessibleButton";
import Modal from "../../../Modal";
import ServerOfflineDialog from "../dialogs/ServerOfflineDialog";
import {replaceableComponent} from "../../../utils/replaceableComponent";

@replaceableComponent("views.toasts.NonUrgentEchoFailureToast")
export default class NonUrgentEchoFailureToast extends React.PureComponent {
    private openDialog = () => {
        Modal.createTrackedDialog('Local Echo Server Error', '', ServerOfflineDialog, {});
    };

    public render() {
        return (
            <div className="mx_NonUrgentEchoFailureToast">
                <span className="mx_NonUrgentEchoFailureToast_icon" />
                {_t("Your server isn't responding to some <a>requests</a>.", {}, {
                    'a': (sub) => (
                        <AccessibleButton kind="link" onClick={this.openDialog}>{sub}</AccessibleButton>
                    ),
                })}
            </div>
        )
    }
}
