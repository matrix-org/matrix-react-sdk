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

'use strict';

import React from 'react';
import PropTypes from 'prop-types';
import * as Roles from '../../../Roles';
import { _t } from '../../../languageHandler';
import Field from "./Field";

module.exports = React.createClass({
    displayName: 'PowerSelector',

    propTypes: {
        value: PropTypes.number.isRequired,
        // The maximum value that can be set with the power selector
        maxValue: PropTypes.number.isRequired,

        // Default user power level for the room
        usersDefault: PropTypes.number.isRequired,

        // should the user be able to change the value? false by default.
        disabled: PropTypes.bool,
        onChange: PropTypes.func,

        // Optional key to pass as the second argument to `onChange`
        powerLevelKey: PropTypes.string,

        // The name to annotate the selector with
        label: PropTypes.string,
    },

    getInitialState: function() {
        return {
            levelRoleMap: {},
            // List of power levels to show in the drop-down
            options: [],

            customValue: this.props.value,
            selectValue: 0,
        };
    },

    getDefaultProps: function() {
        return {
            maxValue: Infinity,
            usersDefault: 0,
        };
    },

    componentWillMount: function() {
        this._initStateFromProps(this.props);
    },

    componentWillReceiveProps: function(newProps) {
        this._initStateFromProps(newProps);
    },

    _initStateFromProps: function(newProps) {
        // This needs to be done now because levelRoleMap has translated strings
        const levelRoleMap = Roles.levelRoleMap(newProps.usersDefault);
        const options = Object.keys(levelRoleMap).filter((l) => {
            return l === undefined || l <= newProps.maxValue;
        });

        const isCustom = levelRoleMap[newProps.value] === undefined;

        this.setState({
            levelRoleMap,
            options,
            custom: isCustom,
            customLevel: newProps.value,
            selectValue: isCustom ? "SELECT_VALUE_CUSTOM" : newProps.value,
        });
    },

    onSelectChange: function(event) {
        const isCustom = event.target.value === "SELECT_VALUE_CUSTOM";
        if (isCustom) {
            this.setState({custom: true});
        } else {
            this.props.onChange(event.target.value, this.props.powerLevelKey);
            this.setState({selectValue: event.target.value});
        }
    },

    onCustomChange: function(event) {
        this.setState({customValue: event.target.value});
    },

    onCustomBlur: function(event) {
        event.preventDefault();
        event.stopPropagation();

        this.props.onChange(parseInt(this.state.customValue), this.props.powerLevelKey);
    },

    onCustomKeyPress: function(event) {
        if (event.key === "Enter") {
            event.preventDefault();
            event.stopPropagation();

            // Do not call the onChange handler directly here - it can cause an infinite loop.
            // Long story short, a user hits Enter to submit the value which onChange handles as
            // raising a dialog which causes a blur which causes a dialog which causes a blur and
            // so on. By not causing the onChange to be called here, we avoid the loop because we
            // handle the onBlur safely.
            event.target.blur();
        }
    },

    render: function() {
        let picker;
        if (this.state.custom) {
            picker = (
                <Field id={`powerSelector_custom_${this.props.powerLevelKey}`} type="number"
                       label={this.props.label || _t("Power level")} max={this.props.maxValue}
                       onBlur={this.onCustomBlur} onKeyPress={this.onCustomKeyPress} onChange={this.onCustomChange}
                       value={this.state.customValue} disabled={this.props.disabled} />
            );
        } else {
            // Each level must have a definition in this.state.levelRoleMap
            let options = this.state.options.map((level) => {
                return {
                    value: level,
                    text: Roles.textualPowerLevel(level, this.props.usersDefault),
                };
            });
            options.push({ value: "SELECT_VALUE_CUSTOM", text: _t("Custom level") });
            options = options.map((op) => {
                return <option value={op.value} key={op.value}>{ op.text }</option>;
            });

            picker = (
                <Field id={`powerSelector_notCustom_${this.props.powerLevelKey}`} element="select"
                       label={this.props.label || _t("Power level")} onChange={this.onSelectChange}
                       value={this.state.selectValue} disabled={this.props.disabled}>
                    {options}
                </Field>
            );
        }

        return (
            <div className="mx_PowerSelector">
                { picker }
            </div>
        );
    },
});
