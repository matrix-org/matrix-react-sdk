/*
Copyright 2015, 2016 OpenMarket Ltd
Copyright 2019 New Vector Ltd
Copyright 2019 Michael Telatynski <7t3chguy@gmail.com>
Copyright 2019, 2020 The Matrix.org Foundation C.I.C.

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
import ReactDOM from 'react-dom';
import classNames from 'classnames';

import { replaceableComponent } from "../../../utils/replaceableComponent";
import UIStore from "../../../stores/UIStore";

const MIN_TOOLTIP_HEIGHT = 25;

const TooltipContainerId = "mx_Tooltip_wrapper";

function getOrCreateContainer(): HTMLElement {
    let container = document.getElementById(TooltipContainerId);

    if (!container) {
        container = document.createElement("div");
        container.id = TooltipContainerId;
        document.body.appendChild(container);
    }

    return container;
}

export enum Alignment {
    Natural, // Pick left or right
    Left,
    Right,
    Top, // Centered
    Bottom, // Centered
    InnerBottom, // Inside the target, at the bottom
}

export interface ITooltipProps {
        // Class applied to the element used to position the tooltip
        className?: string;
        // Class applied to the tooltip itself
        tooltipClassName?: string;
        // Whether the tooltip is visible or hidden.
        // The hidden state allows animating the tooltip away via CSS.
        // Defaults to visible if unset.
        visible?: boolean;
        // the react element to put into the tooltip
        label: React.ReactNode;
        alignment?: Alignment; // defaults to Natural
        yOffset?: number;
        // id describing tooltip
        // used to associate tooltip with target for a11y
        id?: string;
        // If the parent is over this width, act as if it is only this wide
        maxParentWidth?: number;
}

interface IState {
    right?: number;
    left?: number;
    top?: number;
    display?: string;
    transform?: string;
}

@replaceableComponent("views.elements.Tooltip")
export default class Tooltip extends React.Component<ITooltipProps, IState> {
    private parent: Element;

    // XXX: This is because some components (Field) are unable to `import` the Tooltip class,
    // so we expose the Alignment options off of us statically.
    public static readonly Alignment = Alignment;

    public static readonly defaultProps = {
        visible: true,
        yOffset: 0,
        alignment: Alignment.Natural,
    };

    // Create a wrapper for the tooltip outside the parent and attach it to the body element
    public componentDidMount() {
        this.parent = ReactDOM.findDOMNode(this).parentNode as Element;

        window.addEventListener('scroll', this.updatePosition, {
            passive: true,
            capture: true,
        });
        this.updatePosition();
    }

    public componentWillUnmount() {
        window.removeEventListener('scroll', this.updatePosition, {
            capture: true,
        });
    }

    private updatePosition = () => {
        // Add the parent's position to the tooltips, so it's correctly
        // positioned, also taking into account any window zoom
        // NOTE: The additional 6 pixels for the left position, is to take account of the tooltips chevron
        const style: IState = {};
        const parentBox = this.parent.getBoundingClientRect();
        let offset = 0;
        if (parentBox.height > MIN_TOOLTIP_HEIGHT) {
            offset = Math.floor((parentBox.height - MIN_TOOLTIP_HEIGHT) / 2);
        } else {
            // The tooltip is larger than the parent height: figure out what offset
            // we need so that we're still centered.
            offset = Math.floor(parentBox.height - MIN_TOOLTIP_HEIGHT);
        }
        const width = UIStore.instance.windowWidth;
        const parentWidth = (
            this.props.maxParentWidth
                ? Math.min(parentBox.width, this.props.maxParentWidth)
                : parentBox.width
        );
        const baseTop = (parentBox.top - 2 + this.props.yOffset) + window.pageYOffset;
        const top = baseTop + offset;
        const right = width - parentBox.left - window.pageXOffset;
        const left = parentBox.right + window.pageXOffset;
        const horizontalCenter = (
            parentBox.left - window.pageXOffset + (parentWidth / 2)
        );
        switch (this.props.alignment) {
            case Alignment.Natural:
                if (parentBox.right > width / 2) {
                    style.right = right;
                    style.top = top;
                    break;
                }
                // fall through to Right
            case Alignment.Right:
                style.left = left;
                style.top = top;
                break;
            case Alignment.Left:
                style.right = right;
                style.top = top;
                break;
            case Alignment.Top:
                style.top = baseTop - 16;
                style.left = horizontalCenter;
                break;
            case Alignment.Bottom:
                style.top = baseTop + parentBox.height;
                style.left = horizontalCenter;
                break;
            case Alignment.InnerBottom:
                style.top = baseTop + parentBox.height - 50;
                style.left = horizontalCenter;
                style.transform = "translate(-50%)";
        }

        this.setState(style);
    };

    public render() {
        const tooltipClasses = classNames("mx_Tooltip", this.props.tooltipClassName, {
            "mx_Tooltip_visible": this.props.visible,
            "mx_Tooltip_invisible": !this.props.visible,
        });

        const tooltip = <div className={tooltipClasses} style={this.state}>
            <div className="mx_Tooltip_chevron" />
            { this.props.label }
        </div>;

        // Render a placeholder around the portal for positioning
        return (
            <div className={this.props.className}>
                { ReactDOM.createPortal(tooltip, getOrCreateContainer()) }
            </div>
        );
    }
}
