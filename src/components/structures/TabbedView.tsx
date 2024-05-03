/*
Copyright 2017 Travis Ralston
Copyright 2019 New Vector Ltd
Copyright 2019, 2020, 2024 The Matrix.org Foundation C.I.C.

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

import * as React from "react";
import classNames from "classnames";
import { logger } from "matrix-js-sdk/src/logger";

import { _t, TranslationKey } from "../../languageHandler";
import AutoHideScrollbar from "./AutoHideScrollbar";
import { PosthogScreenTracker, ScreenName } from "../../PosthogTrackers";
import { NonEmptyArray } from "../../@types/common";
import { RovingAccessibleButton, RovingTabIndexProvider } from "../../accessibility/RovingTabIndex";

/**
 * Represents a tab for the TabbedView.
 */
export class Tab<T extends string> {
    /**
     * Creates a new tab.
     * @param {string} id The tab's ID.
     * @param {string} label The untranslated tab label.
     * @param {string} icon The class for the tab icon. This should be a simple mask.
     * @param {React.ReactNode} body The JSX for the tab container.
     * @param {string} screenName The screen name to report to Posthog.
     */
    public constructor(
        public readonly id: T,
        public readonly label: TranslationKey,
        public readonly icon: string | null,
        public readonly body: React.ReactNode,
        public readonly screenName?: ScreenName,
    ) {}
}

export enum TabLocation {
    LEFT = "left",
    TOP = "top",
}

interface ITabPanelProps<T extends string> {
    tab: Tab<T>;
}

function TabPanel<T extends string>({ tab }: ITabPanelProps<T>): JSX.Element {
    return (
        <div className="mx_TabbedView_tabPanel" key={tab.id} id={tab.id} aria-labelledby={`${tab.id}_label`}>
            <AutoHideScrollbar className="mx_TabbedView_tabPanelContent">{tab.body}</AutoHideScrollbar>
        </div>
    );
}

interface ITabLabelProps<T extends string> {
    tab: Tab<T>;
    isActive: boolean;
    onClick: () => void;
}

function TabLabel<T extends string>({ tab, isActive, onClick }: ITabLabelProps<T>): JSX.Element {
    const classes = classNames("mx_TabbedView_tabLabel", {
        mx_TabbedView_tabLabel_active: isActive,
    });

    let tabIcon: JSX.Element | undefined;
    if (tab.icon) {
        tabIcon = <span className={`mx_TabbedView_maskedIcon ${tab.icon}`} />;
    }

    const id = `mx_tabpanel_${tab.id}`;

    const label = _t(tab.label);
    return (
        <RovingAccessibleButton
            className={classes}
            onClick={onClick}
            data-testid={`settings-tab-${tab.id}`}
            role="tab"
            aria-selected={isActive}
            aria-controls={id}
            element="li"
        >
            {tabIcon}
            <span className="mx_TabbedView_tabLabel_text" id={`${id}_label`}>
                {label}
            </span>
        </RovingAccessibleButton>
    );
}

interface IProps<T extends string> {
    tabs: NonEmptyArray<Tab<T>>;
    initialTabId?: T;
    tabLocation?: TabLocation;
    onChange?: (tabId: T) => void;
    screenName?: ScreenName;
}

export default function TabbedView<T extends string>(props: IProps<T>): JSX.Element {
    const tabLocation = props.tabLocation ?? TabLocation.LEFT;

    const [activeTabId, setActiveTabId] = React.useState<T>((): T => {
        const initialTabIdIsValid = props.tabs.find((tab) => tab.id === props.initialTabId);
        // unfortunately typescript doesn't infer the types coorectly if the null check is included above
        return initialTabIdIsValid && props.initialTabId ? props.initialTabId : props.tabs[0].id;
    });

    const getTabById = (id: T): Tab<T> | undefined => {
        return props.tabs.find((tab) => tab.id === id);
    };

    /**
     * Shows the given tab
     * @param {Tab} tab the tab to show
     */
    const setActiveTab = (tab: Tab<T>): void => {
        // make sure this tab is still in available tabs
        if (!!getTabById(tab.id)) {
            props.onChange?.(tab.id);
            setActiveTabId(tab.id);
        } else {
            logger.error("Could not find tab " + tab.label + " in tabs");
        }
    };

    const labels = props.tabs.map((tab) => (
        <TabLabel
            key={"tab_label_" + tab.id}
            tab={tab}
            isActive={tab.id === activeTabId}
            onClick={() => setActiveTab(tab)}
        />
    ));
    const tab = getTabById(activeTabId);
    const panel = tab ? <TabPanel tab={tab} /> : null;

    const tabbedViewClasses = classNames({
        mx_TabbedView: true,
        mx_TabbedView_tabsOnLeft: tabLocation == TabLocation.LEFT,
        mx_TabbedView_tabsOnTop: tabLocation == TabLocation.TOP,
    });

    const screenName = tab?.screenName ?? props.screenName;

    return (
        <div className={tabbedViewClasses}>
            {screenName && <PosthogScreenTracker screenName={screenName} />}
            <RovingTabIndexProvider
                handleLoop
                handleHomeEnd
                handleLeftRight={tabLocation == TabLocation.TOP}
                handleUpDown={tabLocation == TabLocation.LEFT}
            >
                {({ onKeyDownHandler }) => (
                    <ul
                        className="mx_TabbedView_tabLabels"
                        role="tablist"
                        aria-orientation={tabLocation == TabLocation.LEFT ? "vertical" : "horizontal"}
                        onKeyDown={onKeyDownHandler}
                    >
                        {labels}
                    </ul>
                )}
            </RovingTabIndexProvider>
            {panel}
        </div>
    );
}
