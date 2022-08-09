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

import React, { CSSProperties } from 'react';
import ReactDOM from 'react-dom';
import classNames from 'classnames';

import UIStore from "../../../stores/UIStore";

export enum Alignment {
    Natural, // Pick left or right
    Left,
    Right,
    Top, // Centered
    Bottom, // Centered
    InnerBottom, // Inside the target, at the bottom
    TopRight, // On top of the target, right aligned
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
        // id describing tooltip
        // used to associate tooltip with target for a11y
        id?: string;
        // If the parent is over this width, act as if it is only this wide
        maxParentWidth?: number;
}

export default class Tooltip extends React.Component<ITooltipProps> {
    private tooltipContainer: HTMLElement;
    private parent: Element;

    // XXX: This is because some components (Field) are unable to `import` the Tooltip class,
    // so we expose the Alignment options off of us statically.
    public static readonly Alignment = Alignment;

    public static readonly defaultProps = {
        visible: true,
        alignment: Alignment.Natural,
    };

    // Create a wrapper for the tooltip outside the parent and attach it to the body element
    public componentDidMount() {
        this.tooltipContainer = document.createElement("div");
        this.tooltipContainer.className = "mx_Tooltip_wrapper";
        document.body.appendChild(this.tooltipContainer);
        window.addEventListener('scroll', this.renderTooltip, {
            passive: true,
            capture: true,
        });

        this.parent = ReactDOM.findDOMNode(this).parentNode as Element;

        this.renderTooltip();
    }

    public componentDidUpdate() {
        this.renderTooltip();
    }

    // Remove the wrapper element, as the tooltip has finished using it
    public componentWillUnmount() {
        ReactDOM.unmountComponentAtNode(this.tooltipContainer);
        document.body.removeChild(this.tooltipContainer);
        window.removeEventListener('scroll', this.renderTooltip, {
            capture: true,
        });
    }

    // Add the parent's position to the tooltips, so it's correctly
    // positioned, also taking into account any window zoom
    private updatePosition(style: CSSProperties) {
        const parentBox = this.parent.getBoundingClientRect();
        const width = UIStore.instance.windowWidth;
        const spacing = 6;
        const parentWidth = (
            this.props.maxParentWidth
                ? Math.min(parentBox.width, this.props.maxParentWidth)
                : parentBox.width
        );
        const baseTop = parentBox.top + window.scrollY;
        const centerTop = parentBox.top + window.scrollY + (parentBox.height / 2);
        const right = width - parentBox.left - window.scrollX;
        const left = parentBox.right + window.scrollX;
        const horizontalCenter = (
            parentBox.left - window.scrollX + (parentWidth / 2)
        );

        switch (this.props.alignment) {
            case Alignment.Natural:
                if (parentBox.right > width / 2) {
                    style.right = right + spacing;
                    style.top = centerTop;
                    style.transform = "translateY(-50%)";
                    break;
                }
                // fall through to Right
            case Alignment.Right:
                style.left = left + spacing;
                style.top = centerTop;
                style.transform = "translateY(-50%)";
                break;
            case Alignment.Left:
                style.right = right + spacing;
                style.top = centerTop;
                style.transform = "translateY(-50%)";
                break;
            case Alignment.Top:
                style.top = baseTop - spacing;
                style.left = horizontalCenter;
                style.transform = "translate(-50%, -100%)";
                break;
            case Alignment.Bottom:
                style.top = baseTop + parentBox.height + spacing;
                style.left = horizontalCenter;
                style.transform = "translate(-50%)";
                break;
            case Alignment.InnerBottom:
                style.top = baseTop + parentBox.height - 50;
                style.left = horizontalCenter;
                style.transform = "translate(-50%)";
                break;
            case Alignment.TopRight:
                style.top = baseTop - spacing;
                style.right = width - parentBox.right - window.scrollX;
                style.transform = "translateY(-100%)";
                break;
        }

        return style;
    }

    private renderTooltip = () => {
        let style: CSSProperties = {};
        // When the tooltip is hidden, no need to thrash the DOM with `style`
        // attribute updates (performance)
        if (this.props.visible) {
            style = this.updatePosition({});
        }
        // Hide the entire container when not visible. This prevents flashing of the tooltip
        // if it is not meant to be visible on first mount.
        style.display = this.props.visible ? "block" : "none";

        const tooltipClasses = classNames("mx_Tooltip", this.props.tooltipClassName, {
            "mx_Tooltip_visible": this.props.visible,
            "mx_Tooltip_invisible": !this.props.visible,
        });

        const tooltip = (
            <div className={tooltipClasses} style={style}>
                <div className="mx_Tooltip_chevron" />
                { this.props.label }
            </div>
        );

        // Render the tooltip manually, as we wish it not to be rendered within the parent
        ReactDOM.render<Element>(tooltip, this.tooltipContainer);
    };

    public render() {
        // Render a placeholder
        return (
            <div className={this.props.className} />
        );
    }
}
