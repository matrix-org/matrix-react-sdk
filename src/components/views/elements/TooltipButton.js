/*
Copyright 2017 New Vector Ltd.
Copyright 2019 The Matrix.org Foundation C.I.C.

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
import * as sdk from '../../../index';
import {replaceableComponent} from "../../../utils/replaceableComponent";

@replaceableComponent("views.elements.TooltipButton")
export default class TooltipButton extends React.Component {
    state = {
        hover: false,
    };

    onMouseOver = () => {
        this.setState({
            hover: true,
        });
    };

    onMouseLeave = () => {
        this.setState({
            hover: false,
        });
    };

    render() {
        const Tooltip = sdk.getComponent("elements.Tooltip");
        const tip = this.state.hover ? <Tooltip
            className="mx_TooltipButton_container"
            tooltipClassName="mx_TooltipButton_helpText"
            label={this.props.helpText}
        /> : <div />;
        return (
            <div className="mx_TooltipButton" onMouseOver={this.onMouseOver} onMouseLeave={this.onMouseLeave}>
                ?
                { tip }
            </div>
        );
    }
}
