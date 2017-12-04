/*
Copyright 2017 Travis Ralston

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

import * as React from "react";
import {_t} from "../../../../languageHandler";

module.exports = React.createClass({
    displayName: 'NotificationsSettingsPanel',

    propTypes: {},

    getInitialState: function() {
        return {
        };
    },

    componentWillMount: function() {
    },

    render: function () {
        return (
            <div className="mx_NotificationsSettingsPanel">
                <h1>{ _t("Notifications") }</h1>

                <p>TODO: Enable notifications checkbox</p>
                <p>TODO: Desktop notification settings</p>
                <p>TODO: Email notifications</p>
                <p>TODO: Notification loudness</p>
                <p>TODO: Notification targets (advanced?)</p>
            </div>
        );
    },
});
