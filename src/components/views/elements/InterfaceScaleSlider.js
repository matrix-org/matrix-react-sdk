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

import sdk from '../../../index';
import SettingsStore from "../../../settings/SettingsStore";

export default class InterfaceScaleSlider extends React.Component {
    constructor(props) {
        super(props);
        this._onValueChange = this._onValueChange.bind(this);
    }

    componentWillMount() {
    }

    _onValueChange(e) {
        this.props.onValueChange(parseInt(e.target.value));
    }

    render() {
        let interfaceScale = SettingsStore.getValue("interfaceScale", null, /*excludeDefault:*/true);
        let value = this.props.value || interfaceScale;
        return <div>
                <input type="range" min="70" max="150" step="10" className={this.props.className}
                onChange={this._onValueChange} value={value} />
                {value}%
            </div>
    }
}

InterfaceScaleSlider.propTypes = {
    className: React.PropTypes.string,
    onValueChange: React.PropTypes.func.isRequired,
    value: React.PropTypes.number,
};
