/*
Copyright 2017 New Vector Ltd.

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
import {_t} from "../../../languageHandler";
import SettingsStore from "../../../settings/SettingsStore";
import {replaceableComponent} from "../../../utils/replaceableComponent";

@replaceableComponent("views.elements.InlineSpinner")
export default class InlineSpinner extends React.Component {
    render() {
        const w = this.props.w || 16;
        const h = this.props.h || 16;
        const imgClass = this.props.imgClassName || "";

        let imageSource;
        if (SettingsStore.getValue('feature_new_spinner')) {
            imageSource = require("../../../../res/img/spinner.svg");
        } else {
            imageSource = require("../../../../res/img/spinner.gif");
        }

        return (
            <div className="mx_InlineSpinner">
                <img
                    src={imageSource}
                    width={w}
                    height={h}
                    className={imgClass}
                    aria-label={_t("Loading...")}
                />
            </div>
        );
    }
}
