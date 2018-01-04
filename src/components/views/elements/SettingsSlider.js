/*
Copyright 2017 Mohammad Nokhbatolfoghahai (monokh)

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
import PropTypes from 'prop-types';


export default class SettingsSlider extends React.Component {
    static propTypes = {
        className: PropTypes.string,
        onValueChange: PropTypes.func.isRequired,
        value: PropTypes.number,
    };

    constructor(props) {
        super(props);
        this._onValueChange = this._onValueChange.bind(this);
    }

    _onValueChange(e) {
        this.props.onValueChange(parseInt(e.target.value));
    }

    render() {
        return <div className={this.props.className}>
            <input type="range" min={this.props.min} max={this.props.max} step={this.props.step} className={this.props.className + "_input"}
            onChange={this._onValueChange} value={this.props.value} />
            <div className={this.props.className + "_label"}>{ this.props.value }%</div>
        </div>;
    }
}
