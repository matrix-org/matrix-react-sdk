/*
Copyright 2019 Michael Telatynski <7t3chguy@gmail.com>
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

import React, { SyntheticEvent, FocusEvent } from "react";

import AccessibleButton from "./AccessibleButton";
import Tooltip, { Alignment } from "./Tooltip";

/**
 * Type of props accepted by {@link AccessibleTooltipButton}.
 *
 * Extends that of {@link AccessibleButton}.
 */
interface Props extends React.ComponentProps<typeof AccessibleButton> {
    /**
     * Title to show in the tooltip and use as aria-label
     */
    title?: string;
    /**
     * Tooltip node to show in the tooltip, takes precedence over `title`
     */
    tooltip?: React.ReactNode;
    /**
     * Trigger label to render
     */
    label?: string;
    /**
     * Classname to apply to the tooltip
     */
    tooltipClassName?: string;
    /**
     * Force the tooltip to be hidden
     */
    forceHide?: boolean;
    /**
     * Alignment to render the tooltip with
     */
    alignment?: Alignment;
    /**
     * Function to call when the children are hovered over
     */
    onHover?: (hovering: boolean) => void;
    /**
     * Function to call when the tooltip goes from shown to hidden.
     */
    onHideTooltip?(ev: SyntheticEvent): void;
}

interface IState {
    hover: boolean;
}

export default class AccessibleTooltipButton extends React.PureComponent<Props, IState> {
    public constructor(props: Props) {
        super(props);
        this.state = {
            hover: false,
        };
    }

    public componentDidUpdate(prevProps: Readonly<Props>): void {
        if (!prevProps.forceHide && this.props.forceHide && this.state.hover) {
            this.setState({
                hover: false,
            });
        }
    }

    private showTooltip = (): void => {
        if (this.props.onHover) this.props.onHover(true);
        if (this.props.forceHide) return;
        this.setState({
            hover: true,
        });
    };

    private hideTooltip = (ev: SyntheticEvent): void => {
        if (this.props.onHover) this.props.onHover(false);
        this.setState({
            hover: false,
        });
        this.props.onHideTooltip?.(ev);
    };

    private onFocus = (ev: FocusEvent): void => {
        // We only show the tooltip if focus arrived here from some other
        // element, to avoid leaving tooltips hanging around when a modal closes
        if (ev.relatedTarget) this.showTooltip();
    };

    public render(): React.ReactNode {
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const { title, tooltip, children, tooltipClassName, forceHide, alignment, onHideTooltip, ...props } =
            this.props;

        const tip = this.state.hover && (title || tooltip) && (
            <Tooltip tooltipClassName={tooltipClassName} label={tooltip || title} alignment={alignment} />
        );
        return (
            <AccessibleButton
                {...props}
                onMouseOver={this.showTooltip || props.onMouseOver}
                onMouseLeave={this.hideTooltip || props.onMouseLeave}
                onFocus={this.onFocus || props.onFocus}
                onBlur={this.hideTooltip || props.onBlur}
                aria-label={title || props["aria-label"]}
            >
                {children}
                {this.props.label}
                {(tooltip || title) && tip}
            </AccessibleButton>
        );
    }
}
