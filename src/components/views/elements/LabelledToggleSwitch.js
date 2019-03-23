/*
Copyright 2019 New Vector Ltd

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

import React from 'react';
import PropTypes from "prop-types";
import ToggleSwitch from "./ToggleSwitch";

export default class LabelledToggleSwitch extends React.Component {
    static propTypes = {
        // The value for the toggle switch
        value: PropTypes.bool.isRequired,

        // The function to call when the value changes
        onChange: PropTypes.func.isRequired,

        // The translated label for the switch
        label: PropTypes.string.isRequired,

        // Whether or not to disable the toggle switch
        disabled: PropTypes.bool,
    };

    render() {
        // This is a minimal version of a SettingsFlag
        return (
            <div className="mx_SettingsFlag">
                <span className="mx_SettingsFlag_label">{this.props.label}</span>
                <ToggleSwitch checked={this.props.value} disabled={this.props.disabled}
                              onChange={this.props.onChange} />
            </div>
        );
    }
}
