/*
 Copyright 2019 Michael Telatynski <7t3chguy@gmail.com>

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

import AccessibleButton from "./AccessibleButton";
import sdk from "../../../index";

export default class AccessibleTooltipButton extends React.PureComponent {
    static propTypes = {
        ...AccessibleButton.propTypes,
        // The tooltip to render on hover
        title: PropTypes.string.isRequired,
    };

    render() {
        // const AccessibleButton = sdk.getComponent("elements.AccessibleButton");
        const InteractiveTooltip = sdk.getComponent('elements.InteractiveTooltip');

        const {title, ...props} = this.props;

        const tooltipContent = <div className="mx_AccessibleTooltipButton_container">{title}</div>;
        return (
            <InteractiveTooltip content={tooltipContent}>
                <Buttun {...props} />
            </InteractiveTooltip>
        );
    }
}


function Buttun(props) {
    return React.createElement("button", {className: props.className, onClick: props.onClick, onMouseOver: props.onMouseOver});
}
