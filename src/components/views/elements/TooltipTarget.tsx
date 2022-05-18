/*
Copyright 2021 The Matrix.org Foundation C.I.C.

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

import React, { HTMLAttributes } from 'react';

import useFocus from "../../../hooks/useFocus";
import useHover from "../../../hooks/useHover";
import Tooltip, { ITooltipProps } from './Tooltip';

interface IProps extends HTMLAttributes<HTMLSpanElement>, Omit<ITooltipProps, 'visible'> {
    tooltipTargetClassName?: string;
    ignoreHover?: (ev: React.MouseEvent) => boolean;
}

/**
 * Generic tooltip target element that handles tooltip visibility state
 * and displays children
 */
const TooltipTarget: React.FC<IProps> = ({
    children,
    tooltipTargetClassName,
    // tooltip pass through props
    className,
    id,
    label,
    alignment,
    tooltipClassName,
    maxParentWidth,
    ignoreHover,
    ...rest
}) => {
    const [isFocused, focusProps] = useFocus();
    const [isHovering, hoverProps] = useHover(ignoreHover || (() => false));

    // No need to fill up the DOM with hidden tooltip elements. Only add the
    // tooltip when we're hovering over the item (performance)
    const tooltip = (isFocused || isHovering) && <Tooltip
        id={id}
        className={className}
        tooltipClassName={tooltipClassName}
        label={label}
        alignment={alignment}
        visible={isFocused || isHovering}
        maxParentWidth={maxParentWidth}
    />;

    return (
        <div
            {...hoverProps}
            {...focusProps}
            tabIndex={0}
            aria-describedby={id}
            className={tooltipTargetClassName}
            {...rest}
        >
            { children }
            { tooltip }
        </div>
    );
};

export default TooltipTarget;
