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

import React, { SyntheticEvent, FocusEvent, forwardRef, useEffect, Ref, useState } from "react";

import AccessibleButton, { Props as AccessibleButtonProps } from "./AccessibleButton";
import Tooltip, { Alignment } from "./Tooltip";

export type Props<T extends keyof JSX.IntrinsicElements> = AccessibleButtonProps<T> & {
    title?: string;
    tooltip?: React.ReactNode;
    label?: string;
    tooltipClassName?: string;
    forceHide?: boolean;
    alignment?: Alignment;
    onHover?: (hovering: boolean) => void;
    onHideTooltip?(ev: SyntheticEvent): void;
};

const AccessibleTooltipButton = forwardRef(function <T extends keyof JSX.IntrinsicElements>(
    { title, tooltip, children, forceHide, alignment, onHideTooltip, tooltipClassName, ...props }: Props<T>,
    ref: Ref<HTMLElement>,
) {
    const [hover, setHover] = useState(false);

    useEffect(() => {
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

    const tip = hover && (title || tooltip) && (
        <Tooltip tooltipClassName={tooltipClassName} label={tooltip || title} alignment={alignment} />
    );
    return (
        <AccessibleButton
            {...props}
            onMouseOver={showTooltip}
            onMouseLeave={hideTooltip}
            onFocus={onFocus}
            onBlur={hideTooltip}
            aria-label={title || props["aria-label"]}
            ref={ref}
        >
            {children}
            {props.label}
            {(tooltip || title) && tip}
        </AccessibleButton>
    );
});

export default AccessibleTooltipButton;
