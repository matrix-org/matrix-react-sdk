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
    displayName: 'InterfaceSettingsPanel',

    propTypes: {},

    getInitialState: function() {
        return {
        };
    },

    componentWillMount: function() {
    },

    render: function () {
        return (
            <div className="mx_InterfaceSettingsPanel">
                <h1>{ _t("Interface") }</h1>

                <p>
                    TODO: UI/UX flip-a-bit settings
                    <ul>
                        <li>Inline URL previews</li>
                        <li>Autoplay gifs</li>
                        <li>Hide RR</li>
                        <li>Typing notifications</li>
                        <li>Timestamps</li>
                        <li>Hide events</li>
                        <li>Compact timeline</li>
                        <li>Automatic language detection</li>
                        <li>Replace emoji</li>
                        <li>Disable emoji</li>
                        <li>Hide pill avatars</li>
                        <li>Disable big emoji</li>
                    </ul>
                </p>
                <p>TODO: Language</p>
                <p>TODO: Theme</p>
            </div>
        );
    },
});
