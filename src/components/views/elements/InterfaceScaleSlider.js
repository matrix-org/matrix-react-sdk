/*
Copyright 2017 Marcel Radzio (MTRNord)
Copyright 2017 Vector Creations Ltd.

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

import SettingsStore from "../../../settings/SettingsStore";

export default class InterfaceScaleSlider extends React.Component {
    propTypes = {
        className: React.PropTypes.string,
        onValueChange: React.PropTypes.func.isRequired,
        value: React.PropTypes.number,
    };

    constructor(props) {
        super(props);
        this._onValueChange = this._onValueChange.bind(this);
    }

    _onValueChange(e) {
        this.props.onValueChange(parseInt(e.target.value));
    }

    render() {
        const interfaceScale = SettingsStore.getValue("interfaceScale", null, true);
        const value = this.props.value || interfaceScale;
        return <div className={this.props.className}>
            <input type="range" min="70" max="150" step="10" className={this.props.className + "_input"}
            onChange={this._onValueChange} value={value} />
            <div className={this.props.className + "_label"}>{ value }%</div>
        </div>;
    }
}
