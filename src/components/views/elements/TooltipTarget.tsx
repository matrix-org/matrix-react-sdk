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

import React, { useState } from 'react';
import Tooltip from './Tooltip';

interface IProps {
    tooltip: React.ReactNode | string;
    className?: string;
    tooltipClassName?: string;
    tooltipContainerClassName?: string;
    id: string;
}

/**
 * Generic tooltip target element that handles tooltip visibility state
 * and displays children
 */
export const TooltipTarget: React.FC<IProps> = ({
    className, id, children, tooltip, tooltipClassName, tooltipContainerClassName,
}) => {
    const [isVisible, setIsVisible] = useState(false);

    const show = () => setIsVisible(true);
    const hide = () => setIsVisible(false);

    return (
        <div
            tabIndex={0}
            aria-describedby={isVisible ? id : undefined}
            className={className}
            onMouseOver={show}
            onMouseLeave={hide}
            onFocus={show}
            onBlur={hide}
        >
            { children }
            <Tooltip
                id={id}
                className={tooltipContainerClassName}
                tooltipClassName={tooltipClassName}
                label={tooltip}
                visible={isVisible}
            />
        </div>
    );
};
