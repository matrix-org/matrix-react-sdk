/*
Copyright 2022 The Matrix.org Foundation C.I.C.

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

import classNames from "classnames";
import React, { ReactNode, RefObject } from "react";

import { useRovingTabIndex } from "../../../../accessibility/RovingTabIndex";
import AccessibleButton, { ButtonEvent } from "../../elements/AccessibleButton";

interface OptionProps {
    inputRef?: RefObject<HTMLLIElement>;
    endAdornment?: ReactNode;
    id?: string;
    className?: string;
    /* If onClick is provided an AccessibleButton is used otherwise a li is used */
    onClick?: ((ev: ButtonEvent) => void) | null;
}

export const Option: React.FC<OptionProps> = ({ inputRef, children, endAdornment, className, onClick, ...props }) => {
    const [onFocus, isActive, ref] = useRovingTabIndex<HTMLLIElement>(inputRef);

    const content = (
        <>
            {children}
            <div className="mx_SpotlightDialog_option--endAdornment">
                <kbd className="mx_SpotlightDialog_enterPrompt" aria-hidden>
                    ↵
                </kbd>
                {endAdornment}
            </div>
        </>
    );

    return onClick ? (
        <AccessibleButton
            {...props}
            onClick={onClick}
            className={classNames(className, "mx_SpotlightDialog_option")}
            onFocus={onFocus}
            ref={ref}
            tabIndex={-1}
            aria-selected={isActive}
            role="option"
            element="li"
        >
            {content}
        </AccessibleButton>
    ) : (
        <li
            {...props}
            className={classNames(className, "mx_SpotlightDialog_option")}
            onFocus={onFocus}
            ref={ref}
            tabIndex={-1}
            aria-selected={isActive}
            role="option"
        >
            {content}
        </li>
    );
};
