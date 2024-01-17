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

import React, { SyntheticEvent, FocusEvent, forwardRef, useEffect, Ref, useState, ComponentProps } from "react";
import { Tooltip } from "@vector-im/compound-web";

import AccessibleButton from "./AccessibleButton";

/**
 * Type of props accepted by {@link AccessibleTooltipButton}.
 *
 * Extends that of {@link AccessibleButton}.
 */
type Props<T extends keyof JSX.IntrinsicElements> = ComponentProps<typeof AccessibleButton<T>> & {
    /**
     * Title to show in the tooltip
     */
    title?: string;
    /**
     * Trigger label to render
     */
    label?: string;
    /**
     * Force the tooltip to be hidden
     */
    forceHide?: boolean;
    /**
     * Function to call when the children are hovered over
     */
    onHover?: (hovering: boolean) => void;
    /**
     * Function to call when the tooltip goes from shown to hidden.
     */
    onHideTooltip?(ev: SyntheticEvent): void;
} & Pick<ComponentProps<typeof Tooltip>, "caption" | "side" | "align">;

const AccessibleTooltipButton = forwardRef(function <T extends keyof JSX.IntrinsicElements>(
    { title, children, forceHide, side, align, onHideTooltip, caption, ...props }: Props<T>,
    ref: Ref<HTMLElement>,
) {
    const [hover, setHover] = useState(false);

    useEffect(() => {
        // If forceHide is set then force hover to off to hide the tooltip
        if (forceHide && hover) {
            setHover(false);
        }
    }, [forceHide, hover]);

    const showTooltip = (): void => {
        props.onHover?.(true);
        if (forceHide) return;
        setHover(true);
    };

    const hideTooltip = (ev: SyntheticEvent): void => {
        props.onHover?.(false);
        setHover(false);
        onHideTooltip?.(ev);
    };

    const onFocus = (ev: FocusEvent): void => {
        // We only show the tooltip if focus arrived here from some other
        // element, to avoid leaving tooltips hanging around when a modal closes
        if (ev.relatedTarget) showTooltip();
    };

    return (
        <Tooltip label={title ?? ""} caption={caption} side={side} align={align} open={hover && !!title}>
            <AccessibleButton
                // Compound tooltips use aria-describeddby instead of aria-label which makes it hard for tests to target buttons by label
                data-testid={title}
                {...props}
                onMouseOver={showTooltip}
                onMouseLeave={hideTooltip}
                onFocus={onFocus}
                onBlur={hideTooltip}
                ref={ref}
            >
                {children}
                {props.label}
            </AccessibleButton>
        </Tooltip>
    );
});

export default AccessibleTooltipButton;
