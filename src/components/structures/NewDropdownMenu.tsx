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

import React, { FunctionComponent, Key, PropsWithChildren, ReactNode } from "react";

import { MenuItemRadio } from "../../accessibility/context_menu/MenuItemRadio";
import { ButtonEvent } from "../views/elements/AccessibleButton";
import ContextMenu, { aboveLeftOf, ChevronFace, ContextMenuButton, useContextMenu } from "./ContextMenu";

export type NewDropdownMenuOption<T> = {
    key: T;
    label: ReactNode;
    description?: ReactNode;
    adornment?: ReactNode;
};

export type NewDropdownMenuGroup<T> = NewDropdownMenuOption<T> & {
    options: NewDropdownMenuOption<T>[];
};

export type NewDropdownMenuItem<T> = NewDropdownMenuGroup<T> | NewDropdownMenuOption<T>;

export function NewDropdownMenuOption<T extends Key>({
    label,
    description,
    onClick,
    isSelected,
    adornment,
}: NewDropdownMenuOption<T> & {
    onClick: (ev: ButtonEvent) => void;
    isSelected: boolean;
}): JSX.Element {
    return <MenuItemRadio
        active={isSelected}
        className="mx_NewDropdownMenu_OptionItem"
        onClick={onClick}
    >
        <span>{ label }</span>
        <span>{ description }</span>
        { adornment }
    </MenuItemRadio>;
}

export function NewDropdownMenuGroup<T extends Key>({
    label,
    description,
    adornment,
    children,
}: PropsWithChildren<NewDropdownMenuOption<T>>): JSX.Element {
    return <>
        <div className="mx_NewDropdownMenu_OptionHeader">
            <span>{ label }</span>
            <span>{ description }</span>
            { adornment }
        </div>
        { children }
    </>;
}

function isNewDropdownMenuGroup<T>(
    item: NewDropdownMenuItem<T>,
): item is NewDropdownMenuGroup<T> {
    return "options" in item;
}

type WithKeyFunction<T> = T extends Key ? {
    toKey?: (key: T) => Key;
} : {
    toKey: (key: T) => Key;
};

type IProps<T> = WithKeyFunction<T> & {
    value: T;
    options: (readonly NewDropdownMenuOption<T>[] | readonly NewDropdownMenuGroup<T>[]);
    onChange: (option: T) => void;
    selectedLabel: (option: NewDropdownMenuItem<T> | null) => ReactNode;
    onOpen?: (ev: ButtonEvent) => void;
    onClose?: (ev: ButtonEvent) => void;
    AdditionalOptions?: FunctionComponent<{
        menuDisplayed: boolean;
        closeMenu: () => void;
        openMenu: () => void;
    }>;
};

export function NewDropdownMenu<T>(
    { value, onChange, options, selectedLabel, onOpen, onClose, toKey, AdditionalOptions }: IProps<T>,
): JSX.Element {
    const [menuDisplayed, button, openMenu, closeMenu] = useContextMenu<HTMLElement>();

    const selected: NewDropdownMenuItem<T> | null = options
        .flatMap(it => isNewDropdownMenuGroup(it) ? [it, ...it.options] : [it])
        .find(option => toKey ? toKey(option.key) === toKey(value) : option.key === value);
    let contextMenuOptions: JSX.Element;
    if (options && isNewDropdownMenuGroup(options[0])) {
        contextMenuOptions = <>
            { options.map(group => (
                <NewDropdownMenuGroup
                    key={toKey?.(group.key) ?? group.key}
                    label={group.label}
                    description={group.description}
                    adornment={group.adornment}
                >
                    { group.options.map(option => (
                        <NewDropdownMenuOption
                            key={toKey?.(option.key) ?? option.key}
                            label={option.label}
                            description={option.description}
                            onClick={(ev: ButtonEvent) => {
                                onChange(option.key);
                                closeMenu();
                                onClose?.(ev);
                            }}
                            adornment={option.adornment}
                            isSelected={option === selected}
                        />
                    )) }
                </NewDropdownMenuGroup>
            )) }
        </>;
    } else {
        contextMenuOptions = <>
            { options.map(option => (
                <NewDropdownMenuOption
                    key={toKey?.(option.key) ?? option.key}
                    label={option.label}
                    description={option.description}
                    onClick={(ev: ButtonEvent) => {
                        onChange(option.key);
                        closeMenu();
                        onClose?.(ev);
                    }}
                    adornment={option.adornment}
                    isSelected={option === selected}
                />
            )) }
        </>;
    }
    const contextMenu = menuDisplayed ? <ContextMenu
        onFinished={closeMenu}
        chevronFace={ChevronFace.Top}
        wrapperClassName="mx_NewDropdownMenu_header"
        {...aboveLeftOf(button.current.getBoundingClientRect())}
    >
        { contextMenuOptions }
        { AdditionalOptions && (
            <AdditionalOptions menuDisplayed={menuDisplayed} openMenu={openMenu} closeMenu={closeMenu} />
        ) }
    </ContextMenu> : null;
    return <>
        <ContextMenuButton
            className="mx_NewDropdownMenu_button"
            inputRef={button}
            isExpanded={menuDisplayed}
            onClick={(ev: ButtonEvent) => {
                openMenu();
                onOpen?.(ev);
            }}
        >
            { selectedLabel(selected) }
        </ContextMenuButton>
        { contextMenu }
    </>;
}
