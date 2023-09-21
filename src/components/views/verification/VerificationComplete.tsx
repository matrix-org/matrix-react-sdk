/*
Copyright 2019 Vector Creations Ltd

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
import DialogButtons from "../elements/DialogButtons";

interface IProps {
    onDone: () => void;
}

export default class VerificationComplete extends React.Component<IProps> {
    public render(): React.ReactNode {
        return (
            <div>
                <h2>{_t("encryption|verification|complete_title")}</h2>
                <p>{_t("encryption|verification|complete_description")}</p>
                <p>{_t("encryption|verification|explainer")}</p>
                <DialogButtons
                    onPrimaryButtonClick={this.props.onDone}
                    primaryButton={_t("encryption|verification|complete_action")}
                    hasCancel={false}
                />
            </div>
        );
    }
}
