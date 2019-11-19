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

import React from "react";
import createReactClass from "create-react-class";
import { _t } from "../../../languageHandler";
import Notifier from "../../../Notifier";
import AccessibleButton from "../../../components/views/elements/AccessibleButton";

module.exports = createReactClass({
    displayName: "MatrixToolbar",

    hideToolbar: function() {
        Notifier.setToolbarHidden(true);
    },

    onClick: function() {
        Notifier.setEnabled(true);
    },

    render: function() {
        return (
            <div className="mx_MatrixToolbar">
                <h1>HELLO</h1>
                <img
                    className="mx_MatrixToolbar_warning"
                    src={require("../../../../res/img/warning.svg")}
                    width="24"
                    height="23"
                />
                <div className="mx_MatrixToolbar_content">
                    {_t("You are not receiving desktop notifications")}{" "}
                    <a className="mx_MatrixToolbar_link" onClick={this.onClick}>
                        {" "}
                        {_t("Enable them now")}
                    </a>
                    <p>HELLO</p>
                </div>
                <AccessibleButton
                    className="mx_MatrixToolbar_close"
                    onClick={this.hideToolbar}
                >
                    <img
                        src={require("../../../../res/img/cancel.svg")}
                        width="18"
                        height="18"
                        alt={_t("Close")}
                    />
                </AccessibleButton>
            </div>
        );
    }
});
